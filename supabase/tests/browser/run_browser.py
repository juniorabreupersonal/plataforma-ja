"""Navegador Chromium real + cópia Next.js isolada; nunca lê .env do checkout."""
from pathlib import Path
import base64
import importlib.util
import json
import os
import re
import secrets
import shutil
import signal
import subprocess
import tempfile
import time
import urllib.parse

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('ja_stack', ROOT / 'supabase/tests/integration/run.py')
stack_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stack_module)
Stack, Failure = stack_module.Stack, stack_module.Failure
API, MAIL = stack_module.API, stack_module.MAIL
APP = 'http://127.0.0.1:3000'
EVENTS = []
STAGE = 'inicialização'


def stage(label):
    global STAGE
    STAGE = label


def check(ok, plane, label):
    if not ok:
        raise Failure(f'{plane}: {label}')
    EVENTS.append((plane, label))
    print(f'::notice title=Next.js isolated E2E::PASS {plane}: {label}', flush=True)


def mail_link(email, kind):
    # Somente Mailpit local da CLI fixada. Não usa caixa postal externa.
    for _ in range(50):
        status, inbox, _ = stack_module.request(MAIL + '/api/v1/messages')
        if status == 200 and isinstance(inbox, dict):
            for message in inbox.get('messages', []):
                if not any(x.get('Address', '').lower() == email for x in message.get('To', [])):
                    continue
                _, detail, _ = stack_module.request(MAIL + '/api/v1/message/' + message['ID'])
                link = Stack.extract_link(json.dumps(detail))
                if link and urllib.parse.parse_qs(urllib.parse.urlsplit(link).query).get('type') == [kind]:
                    return link
        time.sleep(0.5)
    raise Failure('Mensagem sintética esperada não chegou ao SMTP local')


class Application:
    def __init__(self, directory, key):
        self.path = Path(directory)
        self.process = None
        # Copia apenas aplicação e manifests; nunca .env, Git, node_modules ou estado Auth.
        for name in ['package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'eslint.config.mjs']:
            shutil.copyfile(ROOT / name, self.path / name)
        for name in ['src', 'public']:
            shutil.copytree(ROOT / name, self.path / name,
                            ignore=shutil.ignore_patterns('.env*', 'node_modules', '.next'))
        self.env = {k: v for k, v in os.environ.items()
                    if not k.startswith(('SUPABASE_', 'NEXT_PUBLIC_SUPABASE_'))
                    and k not in ('DATABASE_URL', 'APP_URL', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY',
                                  'http_proxy', 'https_proxy', 'all_proxy')}
        self.env.update(APP_URL=APP, NEXT_PUBLIC_SUPABASE_URL=API,
                        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=key,
                        NEXT_TELEMETRY_DISABLED='1', NODE_ENV='production')

    def start(self):
        for args, label in [(['npm', 'ci', '--no-audit', '--no-fund', '--include=dev'], 'instalação Next.js isolada'),
                            (['npm', 'run', 'build'], 'build Next.js isolado')]:
            result = subprocess.run(args, cwd=self.path, env=self.env, capture_output=True, text=True, timeout=600)
            if result.returncode:
                raise Failure(label + ' falhou; saída bruta omitida')
        self.process = subprocess.Popen(['node', 'node_modules/next/dist/bin/next', 'start', '--hostname',
                                         '127.0.0.1', '--port', '3000'], cwd=self.path, env=self.env,
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        import urllib.request
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        for _ in range(100):
            if self.process.poll() is not None:
                raise Failure('Servidor Next.js isolado encerrou antes da prontidão')
            try:
                with opener.open(APP + '/login', timeout=2) as response:
                    if response.status == 200:
                        return
            except Exception:
                pass
            time.sleep(0.2)
        raise Failure('Servidor Next.js isolado não ficou pronto')

    def stop(self):
        if self.process and self.process.poll() is None:
            os.killpg(self.process.pid, signal.SIGTERM)
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(self.process.pid, signal.SIGKILL)
                self.process.wait(timeout=5)


def guard(route):
    parsed = urllib.parse.urlsplit(route.request.url)
    if parsed.scheme == 'http' and parsed.hostname == '127.0.0.1' and parsed.port in (3000, 54321, 54324):
        route.continue_()
    else:
        route.abort()


def token(context):
    # Cookies HttpOnly são lidos pelo controlador do teste, nunca por JavaScript da página.
    cookies = [x for x in context.cookies(APP) if re.fullmatch(r'sb-.+-auth-token(?:\.\d+)?', x['name'])]
    cookies.sort(key=lambda x: int(x['name'].rsplit('.', 1)[-1]) if '.' in x['name'] else -1)
    check(bool(cookies) and all(x['httpOnly'] and x['secure'] and x['sameSite'] == 'Lax' for x in cookies),
          'browser', 'cookies de sessão HttpOnly, Secure e SameSite=Lax')
    encoded = ''.join(x['value'] for x in cookies)
    if not encoded.startswith('base64-'):
        raise Failure('Formato de cookie SSR inesperado')
    encoded = encoded[7:]
    payload = json.loads(base64.urlsafe_b64decode(encoded + '=' * (-len(encoded) % 4)))
    return payload['access_token']


def signup(page, email, password):
    stage('cadastro pelo formulário')
    page.goto(APP + '/criar-conta')
    page.get_by_label('E-mail', exact=True).fill(email)
    page.get_by_label('Senha', exact=True).fill(password)
    page.get_by_label('Confirme a senha', exact=True).fill(password)
    page.get_by_role('button', name='Criar conta', exact=True).click()
    page.get_by_role('status').filter(has_text='Se o cadastro puder ser concluído').wait_for()
    check(True, 'browser', 'cadastro pelo formulário solicita confirmação de e-mail')
    page.goto(APP + '/conta')
    page.wait_for_url(APP + '/login')
    check(True, 'browser', 'conta inacessível antes da confirmação')
    stage('confirmação de e-mail pelo navegador')
    link = mail_link(email, 'signup')
    page.goto(link)
    page.wait_for_url(APP + '/conta')
    page.get_by_text('Sua sessão foi validada.', exact=True).wait_for()
    check(True, 'browser', 'confirmação via SMTP local e callback PKCE abre conta')


def logout(page):
    stage('logout e bloqueio de página protegida')
    page.get_by_role('button', name='Sair da conta', exact=True).click()
    page.wait_for_url(APP + '/login')
    page.goto(APP + '/conta')
    page.wait_for_url(APP + '/login')
    check(page.get_by_text('Sua sessão foi validada.', exact=True).count() == 0,
          'browser', 'navegação direta à conta bloqueada após logout')
    page.go_back()
    page.wait_for_url(APP + '/login')
    check(page.get_by_text('Sua sessão foi validada.', exact=True).count() == 0,
          'browser', 'voltar no histórico não restaura página autenticada')


def login(page, email, password, accepted=True):
    stage('login pelo formulário')
    page.goto(APP + '/login')
    page.get_by_label('E-mail', exact=True).fill(email)
    page.get_by_label('Senha', exact=True).fill(password)
    page.get_by_role('button', name='Entrar', exact=True).click()
    if accepted:
        page.wait_for_url(APP + '/conta')
        page.get_by_text('Sua sessão foi validada.', exact=True).wait_for()
        check(True, 'browser', 'login com senha válida abre conta')
    else:
        page.get_by_role('status').filter(has_text='Não foi possível entrar').wait_for()
        check(page.url == APP + '/login', 'browser', 'senha anterior é rejeitada após redefinição')


def profile_checks(context, own_token, other_token):
    stage('RLS de perfil por requisições HTTP autenticadas')
    def claims(value):
        part = value.split('.')[1]
        return json.loads(base64.urlsafe_b64decode(part + '=' * (-len(part) % 4)))
    own, other = claims(own_token)['sub'], claims(other_token)['sub']
    headers = {'apikey': context['key'], 'Authorization': 'Bearer ' + own_token}
    def request(path, method='GET', body=None):
        return stack_module.request(stack_module.local(API + '/rest/v1/' + path), method, body, headers)
    status, rows, _ = request('profiles?select=*')
    check(status == 200 and len(rows) == 1 and rows[0]['user_id'] == own and rows[0]['status'] == 'active'
          and rows[0]['display_name'] is None, 'HTTP', 'usuário recebe somente perfil básico próprio')
    status, rows, _ = request('profiles?select=*&user_id=eq.' + other)
    check(status == 200 and rows == [], 'HTTP', 'perfil de outro usuário não é retornado')
    for table in ['platform_role_assignments', 'organization_memberships']:
        status, rows, _ = request(table + '?select=*')
        check(status == 200 and rows == [], 'HTTP', 'cadastro não atribui papéis em ' + table)
    for field, value in [('status', 'suspended'), ('user_id', other), ('created_at', '2000-01-01T00:00:00Z')]:
        status, _, _ = request('profiles?user_id=eq.' + own, 'PATCH', {field: value})
        check(status == 403, 'HTTP', 'alteração de campo protegido negada: ' + field)
    for table, body in [('platform_role_assignments', {'user_id': own, 'role': 'owner', 'reason': 'Synthetic denied'}),
                        ('organization_memberships', {'user_id': own, 'role': 'professional'})]:
        status, _, _ = request(table, 'POST', body)
        check(status == 403, 'HTTP', 'autoconcessão direta bloqueada: ' + table)
    status, rows, _ = request('profiles?select=*')
    check(status == 200 and len(rows) == 1 and rows[0]['user_id'] == own and rows[0]['status'] == 'active',
          'HTTP', 'tentativas negadas não alteraram perfil ou identidade')


def exercise(stack, appdir):
    from playwright.sync_api import sync_playwright
    stack.sql((ROOT / 'supabase/migrations/202610250001_identity_foundation.sql').read_text())
    stack.sql("notify pgrst, 'reload schema';")
    application = Application(appdir, stack.key)
    stage('instalação e build Next.js sem arquivos .env')
    application.start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            contexts = [browser.new_context() for _ in range(2)]
            for context in contexts:
                context.route('**/*', guard)
                context.set_default_timeout(20000)
            first, second = [context.new_page() for context in contexts]
            email1, email2 = 'browser-one@example.test', 'browser-two@example.test'
            old_password, new_password = secrets.token_urlsafe(24), secrets.token_urlsafe(24)
            signup(first, email1, old_password)
            token1 = token(contexts[0])
            check('auth-token' not in first.evaluate('document.cookie'), 'browser', 'JavaScript da página não lê cookies de sessão')
            signup(second, email2, secrets.token_urlsafe(24))
            token2 = token(contexts[1])
            profile_checks({'key': stack.key}, token1, token2)
            logout(first)
            login(first, email1, old_password)
            token(contexts[0])
            logout(first)
            stage('solicitação de recuperação pelo formulário')
            first.goto(APP + '/recuperar-senha')
            first.get_by_label('E-mail', exact=True).fill(email1)
            first.get_by_role('button', name='Enviar instruções', exact=True).click()
            first.get_by_role('status').filter(has_text='Se houver uma conta elegível').wait_for()
            check(True, 'browser', 'formulário de recuperação solicita instruções')
            stage('link de recuperação e nova senha no navegador')
            first.goto(mail_link(email1, 'recovery'))
            first.wait_for_url(APP + '/redefinir-senha')
            first.get_by_label('Nova senha', exact=True).fill(new_password)
            first.get_by_label('Confirme a senha', exact=True).fill(new_password)
            first.get_by_role('button', name='Salvar nova senha', exact=True).click()
            first.wait_for_url(APP + '/login?status=password-updated')
            check(True, 'browser', 'callback de recuperação e nova senha concluídos')
            login(first, email1, old_password, accepted=False)
            login(first, email1, new_password)
            token(contexts[0])
            logout(first)
            stage('sessão inexistente após logout')
            check(not any(re.fullmatch(r'sb-.+-auth-token(?:\.\d+)?', x['name']) for x in contexts[0].cookies(APP)),
                  'browser', 'logout remove cookies de sessão do navegador')
            check(stack.sql('select count(*) from public.platform_role_assignments;').stdout.strip() == '0',
                  'SQL local', 'nenhum usuário E2E recebeu funções globais')
            for context in contexts:
                context.close()
            browser.close()
    finally:
        application.stop()


def main():
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        raise Failure('Executor permitido somente em runner GitHub descartável')
    with tempfile.TemporaryDirectory(prefix='ja-browser-stack-') as work, tempfile.TemporaryDirectory(prefix='ja-browser-app-') as app:
        stack = Stack(work)
        try:
            stage('inicialização do Supabase local descartável')
            stack.start()
            exercise(stack, app)
        finally:
            result = stack.cli('stop', '--no-backup', required=False)
            if result.returncode:
                raise Failure('Limpeza do Supabase local falhou')
    browser_count = sum(plane == 'browser' for plane, _ in EVENTS)
    http_count = sum(plane == 'HTTP' for plane, _ in EVENTS)
    print(f'::notice title=Next.js isolated E2E::COMPLETE: browser={browser_count}, HTTP={http_count}', flush=True)
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a') as report:
            report.write('## Executed assertions\n')
            for plane, label in EVENTS:
                report.write(f'- **{plane}**: {label}\n')
            report.write('\nNot performed: manual design review, cross-browser/mobile or production deployment.\n')


if __name__ == '__main__':
    try:
        main()
    except Failure as error:
        print('::error title=Next.js isolated E2E::' + str(error), flush=True)
        raise SystemExit(1)
    except Exception:
        print('::error title=Next.js isolated E2E::Falha na etapa: ' + STAGE + '; detalhes sensíveis omitidos', flush=True)
        raise SystemExit(1)
