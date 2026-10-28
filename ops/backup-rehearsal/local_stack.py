"""Supabase CLI descartável + Auth/PostgREST/MFA reais. Sem .env ou secrets externos."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from html import unescape
from pathlib import Path
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import struct
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
PROJECT = 'ja-integration-disposable'
API = 'http://127.0.0.1:54321'
MAIL = 'http://127.0.0.1:54324'
SITE = 'http://127.0.0.1:3000/auth/callback'
COUNT = 0


class Failure(Exception):
    pass


def check(ok, label):
    global COUNT
    if not ok:
        raise Failure(label)
    COUNT += 1
    print(f'::notice title=Supabase integration::PASS {COUNT}: {label}', flush=True)


def local(url):
    p = urllib.parse.urlsplit(url)
    if p.scheme != 'http' or p.hostname != '127.0.0.1' or p.port not in (54321, 54324) or p.username or p.password or p.fragment:
        raise Failure('Destino fora dos serviços locais permitidos')
    return url


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


# Ignora proxies do ambiente; nenhuma requisição pode seguir redirecionamento externo.
HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())


def request(url, method='GET', body=None, headers=None):
    req = urllib.request.Request(local(url), method=method, headers=headers or {},
                                 data=None if body is None else json.dumps(body).encode())
    if body is not None:
        req.add_header('Content-Type', 'application/json')
    try:
        response = HTTP.open(req, timeout=30)
    except urllib.error.HTTPError as exc:
        response = exc
    except Exception:
        raise Failure('Transporte HTTP local indisponível') from None
    raw = response.read()
    try:
        data = json.loads(raw) if raw else None
    except (ValueError, UnicodeDecodeError):
        data = None
    return response.status, data, response.headers


def command(args, phase, stdin=None, required=True):
    clean_env = {k: v for k, v in os.environ.items()
                 if not k.startswith(('SUPABASE_', 'NEXT_PUBLIC_SUPABASE_'))
                 and k not in ('DATABASE_URL', 'APP_URL')}
    result = subprocess.run(args, input=stdin, text=True, capture_output=True, timeout=600, env=clean_env)
    if required and result.returncode:
        # Nunca reproduzir stdout/stderr da CLI: status/start podem conter chaves locais.
        code = re.search(r'ERROR:\s+([0-9A-Z]{5})', result.stderr)
        raise Failure(phase + (f' (SQLSTATE {code[1]})' if code else f' (exit {result.returncode})'))
    return result


def setting(text, section, key, value):
    pattern = re.compile(r'(?ms)^\[' + re.escape(section) + r'\]\n(.*?)(?=^\[|\Z)')
    match = pattern.search(text)
    if not match:
        return text + f'\n[{section}]\n{key} = {value}\n'
    block = match[1]
    field = re.compile(r'(?m)^' + re.escape(key) + r'\s*=.*$')
    block = field.sub(f'{key} = {value}', block) if field.search(block) else block + f'{key} = {value}\n'
    return text[:match.start(1)] + block + text[match.end(1):]


class Stack:
    def __init__(self, work):
        self.work = work
        self.key = None

    def cli(self, *args, required=True):
        return command(['supabase', *args, '--workdir', self.work], 'CLI ' + args[0], required=required)

    def start(self):
        self.cli('init', '--yes')
        config = Path(self.work, 'supabase/config.toml')
        text = re.sub(r'(?m)^project_id\s*=.*$', f'project_id = "{PROJECT}"', config.read_text())
        for section, key, value in [
            ('auth', 'site_url', '"http://127.0.0.1:3000"'),
            ('auth', 'additional_redirect_urls', json.dumps([SITE, SITE + '?flow=recovery'])),
            ('auth', 'minimum_password_length', '8'),
            ('auth.email', 'enable_confirmations', 'true'),
            ('auth.mfa.totp', 'enroll_enabled', 'true'),
            ('auth.mfa.totp', 'verify_enabled', 'true'),
            ('auth.rate_limit', 'email_sent', '1000'),
            ('auth.rate_limit', 'sign_in_sign_ups', '1000'),
            ('auth.rate_limit', 'token_verifications', '1000'),
            ('studio', 'enabled', 'false'), ('realtime', 'enabled', 'false'),
            ('storage', 'enabled', 'false'), ('analytics', 'enabled', 'false'),
            ('edge_runtime', 'enabled', 'false'), ('db.seed', 'enabled', 'false'),
            ('db', 'major_version', '17'),
        ]:
            text = setting(text, section, key, value)
        config.write_text(text)
        # O diretório temporário ainda não contém migrações ou scaffold Auth.
        self.cli('start', '--exclude', 'studio,realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta')
        status = json.loads(self.cli('status', '--output', 'json').stdout)
        check(status.get('API_URL') == API, 'CLI conectada somente à API loopback esperada')
        self.key = status.get('ANON_KEY') or status.get('PUBLISHABLE_KEY')
        check(bool(self.key), 'chave pública gerada pelo stack local disponível em memória')
        # Nunca usa SERVICE_ROLE_KEY, JWT_SECRET ou qualquer chave de projeto externo.

    def sql(self, sql, required=True):
        return command(['docker', 'exec', '--interactive', f'supabase_db_{PROJECT}', 'psql',
                        '-U', 'postgres', '-d', 'postgres', '-X', '-At',
                        '-v', 'ON_ERROR_STOP=on', '-v', 'VERBOSITY=sqlstate'],
                       'SQL no contêiner local', stdin=sql, required=required)

    def api(self, path, user=None, method='GET', body=None):
        headers = {'apikey': self.key}
        if user:
            headers['Authorization'] = 'Bearer ' + user['access_token']
        return request(API + path, method, body, headers)

    def rpc(self, name, user, args, expected=None):
        status, data, _ = self.api('/rest/v1/rpc/' + name, user, 'POST', args)
        if expected is None:
            expected = 204 if name in ('ja_accept_membership', 'ja_end_membership', 'ja_accept_care', 'ja_end_care', 'ja_revoke_admin') else 200
        code = data.get('code', '') if isinstance(data, dict) else ''
        safe_code = code if re.fullmatch(r'[A-Za-z0-9_]{1,40}', str(code)) else 'omitted'
        check(status == expected, f'RPC {name}: esperado HTTP {expected}, recebido {status}, code {safe_code}')
        return data

    def rows(self, table, user):
        status, data, _ = self.api('/rest/v1/' + table + '?select=*', user)
        check(status == 200 and isinstance(data, list), f'PostgREST {table}: leitura por JWT real')
        return data

    def signup(self, name):
        email = name + '@example.test'
        password = secrets.token_urlsafe(24)
        verifier = secrets.token_urlsafe(48)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
        status, data, _ = self.api('/auth/v1/signup?redirect_to=' + urllib.parse.quote(SITE, safe=''),
                                  method='POST', body={'email': email, 'password': password,
                                  'data': {'role': 'owner', 'professional': True},
                                  'code_challenge': challenge, 'code_challenge_method': 's256'})
        check(status == 200 and bool(data.get('id') or data.get('user', {}).get('id')), 'cadastro sintético aceito pelo Auth real')
        status, _, _ = self.api('/auth/v1/token?grant_type=password', method='POST', body={'email': email, 'password': password})
        check(status == 400, 'login bloqueado antes de confirmar e-mail')
        link = self.confirmation_link(email)
        status, _, headers = request(link)
        check(status in (302, 303), 'link entregue por SMTP local confirmou e-mail')
        redirect = urllib.parse.urlsplit(headers.get('Location', ''))
        check(redirect.scheme == 'http' and redirect.netloc == '127.0.0.1:3000', 'confirmação redireciona somente à origem sintética')
        code = urllib.parse.parse_qs(redirect.query).get('code', [None])[0]
        check(bool(code), 'confirmação produziu código PKCE')
        status, session, _ = self.api('/auth/v1/token?grant_type=pkce', method='POST', body={'auth_code': code, 'code_verifier': verifier})
        check(status == 200 and bool(session.get('access_token')), 'troca PKCE criou sessão real')
        session.update(email=email, password=password)
        return session

    def confirmation_link(self, email):
        # Mailpit atual; fallback para Inbucket nas versões que ainda o utilizam.
        for _ in range(40):
            status, inbox, _ = request(MAIL + '/api/v1/messages')
            if status == 200 and isinstance(inbox, dict):
                for message in inbox.get('messages', []):
                    if not any(to.get('Address', '').lower() == email for to in message.get('To', [])):
                        continue
                    _, detail, _ = request(MAIL + '/api/v1/message/' + message['ID'])
                    link = self.extract_link(json.dumps(detail))
                    if link:
                        return link
            else:
                status, messages, _ = request(MAIL + '/api/v1/mailbox/' + email.split('@')[0])
                if status == 200 and isinstance(messages, list):
                    for message in messages:
                        _, detail, _ = request(MAIL + '/api/v1/mailbox/' + email.split('@')[0] + '/' + message['id'])
                        link = self.extract_link(json.dumps(detail))
                        if link:
                            return link
            time.sleep(0.5)
        raise Failure('e-mail de confirmação não encontrado no SMTP local')

    @staticmethod
    def extract_link(content):
        content = unescape(content).replace('\\u0026', '&').replace('\\/', '/')
        matches = re.findall(r'http://(?:127\.0\.0\.1|localhost):54321/auth/v1/verify\?[^\s"<>\\]+', content)
        if not matches:
            return None
        link = matches[0].replace('http://localhost:', 'http://127.0.0.1:')
        return local(link)

    def mfa(self, user):
        status, factor, _ = self.api('/auth/v1/factors', user, 'POST', {'factor_type': 'totp', 'friendly_name': 'Synthetic integration'})
        check(status == 200, 'MFA TOTP matriculado no Auth real')
        status, challenge, _ = self.api('/auth/v1/factors/' + factor['id'] + '/challenge', user, 'POST', {})
        check(status == 200, 'desafio MFA criado')
        if time.time() % 30 > 27:
            time.sleep(3)
        key = base64.b32decode(factor['totp']['secret'].upper() + '=' * (-len(factor['totp']['secret']) % 8))
        digest = hmac.new(key, struct.pack('>Q', int(time.time()) // 30), hashlib.sha1).digest()
        offset = digest[-1] & 15
        code = str((struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7fffffff) % 1000000).zfill(6)
        status, session, _ = self.api('/auth/v1/factors/' + factor['id'] + '/verify', user, 'POST', {'challenge_id': challenge['id'], 'code': code})
        check(status == 200 and bool(session.get('access_token')), 'desafio TOTP verificado')
        payload = session['access_token'].split('.')[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
        check(claims['aal'] == 'aal2', 'Auth emitiu JWT AAL2 após MFA real')
        return session

