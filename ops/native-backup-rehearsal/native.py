"""Native PostgreSQL clients and encrypted recovery, restricted to local test stacks."""
from pathlib import Path
import hashlib
import io
import json
import os
import re
import secrets
import subprocess
import tarfile
import time
import urllib.parse
import local_stack as local

BIN = Path('/usr/lib/postgresql/17/bin')
SCHEMAS = ('public', 'ja_private', 'supabase_migrations')
CUSTOM_ROLE = 'ja_native_synthetic'
TYPES = sorted(('SCHEMA', 'ACL', 'COMMENT', 'SECURITY LABEL', 'TYPE', 'DOMAIN',
                'FUNCTION', 'PROCEDURE', 'AGGREGATE', 'OPERATOR', 'OPERATOR CLASS',
                'OPERATOR FAMILY', 'COLLATION', 'CONVERSION', 'TABLE', 'TABLE ATTACH',
                'SEQUENCE', 'SEQUENCE OWNED BY', 'SEQUENCE SET', 'DEFAULT', 'CONSTRAINT',
                'FK CONSTRAINT', 'INDEX', 'INDEX ATTACH', 'RULE', 'TRIGGER', 'ROW SECURITY',
                'POLICY', 'DEFAULT ACL', 'TABLE DATA', 'MATERIALIZED VIEW',
                'MATERIALIZED VIEW DATA', 'VIEW', 'STATISTICS'), key=len, reverse=True)


def clean_environment():
    return {k: v for k, v in os.environ.items()
            if not k.startswith(('PG', 'SUPABASE_', 'NEXT_PUBLIC_SUPABASE_'))
            and k not in ('DATABASE_URL', 'APP_URL', 'GNUPGHOME', 'GPG_AGENT_INFO')}


def execute(args, phase, stdin=None, env=None, required=True):
    result = subprocess.run(args, input=stdin, text=True, capture_output=True,
                            timeout=600, env=env or clean_environment())
    if required and result.returncode:
        code = re.search(r'ERROR:\s+([0-9A-Z]{5})', result.stderr)
        raise local.Failure(phase + (f' (SQLSTATE {code[1]})' if code else f' (exit {result.returncode})'))
    return result


def connection(url):
    p = urllib.parse.urlsplit(url or '')
    if (p.scheme not in ('postgres', 'postgresql') or p.hostname not in ('127.0.0.1', 'localhost')
            or p.port != 54322 or p.path != '/postgres' or p.query or p.fragment
            or urllib.parse.unquote(p.username or '') != 'postgres' or not p.password):
        raise local.Failure('Conexão PostgreSQL fora do endpoint local permitido')
    return urllib.parse.unquote(p.password)


def pg_args():
    return ['--host=127.0.0.1', '--port=54322', '--username=postgres', '--dbname=postgres', '--no-password']


class Stack(local.Stack):
    def __init__(self, work, project):
        super().__init__(work)
        if project not in ('ja-native-source', 'ja-native-target'):
            raise local.Failure('Identificador fora do ensaio permitido')
        self.project = project

    def start(self):
        local.PROJECT = self.project
        super().start()
        password = connection(self.local_db_url)
        # Local disposable credential only. Never use URL/password in process arguments.
        escaped = password.replace('\\', '\\\\').replace(':', '\\:')
        passfile = Path(self.work, 'local.pgpass')
        passfile.write_text('127.0.0.1:54322:postgres:postgres:' + escaped + '\n')
        passfile.chmod(0o600)
        self.env = clean_environment()
        self.env['PGPASSFILE'] = str(passfile)
        self.env['PGSSLMODE'] = 'disable'  # Only loopback in a disposable runner, never hosted.

    def client(self, program, flags=(), stdin=None, required=True, connect=True):
        if program not in ('psql', 'pg_dump', 'pg_dumpall', 'pg_restore'):
            raise local.Failure('Cliente PostgreSQL fora da lista permitida')
        connection_flags = pg_args() if connect else []
        if program == 'pg_dumpall':
            # Unlike psql/pg_dump, pg_dumpall --dbname expects a conninfo string.
            connection_flags = ['--database=postgres' if f == '--dbname=postgres' else f for f in connection_flags]
        args = [str(BIN / program)] + connection_flags + list(flags)
        return execute(args, 'cliente nativo ' + program, stdin, self.env, required)

    def sql(self, sql, required=True):
        return self.client('psql', ['-X', '-At', '-v', 'ON_ERROR_STOP=on', '-v', 'VERBOSITY=sqlstate'], sql, required)

    def value(self, sql):
        return self.sql(sql).stdout.strip()


def select_toc(text):
    """Keep application objects, Auth rows/sequences and the ONE known JA trigger.

    Managed Auth definitions and its migration tracker remain supplied by the target CLI.
    No managed role definitions are restored from pg_dumpall.
    """
    selected, managed = [], 0
    for line in text.splitlines():
        if not line or line.startswith(';'):
            continue
        match = re.fullmatch(r'\d+;\s+\d+\s+\d+\s+(.+)', line)
        if not match:
            raise local.Failure('Formato inesperado no inventário pg_restore')
        body = match[1]
        kind = next((kind for kind in TYPES if body.startswith(kind + ' ')), None)
        if kind is None:
            raise local.Failure('Tipo de objeto não revisado no inventário')
        rest = body[len(kind) + 1:]
        schema, _, name = rest.partition(' ')
        if kind == 'SCHEMA':
            # Schemas are provisioned explicitly with source ownership in schema-setup.sql.
            continue
        if schema in SCHEMAS:
            selected.append(line)
        elif schema == '-' and kind in ('ACL', 'COMMENT', 'SECURITY LABEL'):
            if any(name.startswith('SCHEMA ' + s + ' ') for s in SCHEMAS):
                selected.append(line)
        elif schema == 'auth':
            if kind == 'TABLE DATA' and not name.startswith('schema_migrations '):
                selected.append(line)
            elif kind == 'SEQUENCE SET':
                selected.append(line)
            elif kind == 'TRIGGER' and name.startswith('users ja_provision_profile '):
                selected.append(line)
            else:
                managed += 1
        else:
            raise local.Failure('Schema não revisado no inventário')
    local.check(bool(selected) and managed > 0, 'TOC separa objetos gerenciados Auth de dados e customizações JA')
    local.check(any(' TRIGGER auth users ja_provision_profile ' in x for x in selected), 'TOC preserva explicitamente trigger JA em auth.users')
    local.check(not any(' TABLE DATA auth schema_migrations ' in x for x in selected), 'tracker interno Auth não será sobrescrito')
    return '\n'.join(selected) + '\n'


def custom_roles(text):
    lines = [line for line in text.splitlines()
             if line.startswith('CREATE ROLE "' + CUSTOM_ROLE + '";')
             or line.startswith('ALTER ROLE "' + CUSTOM_ROLE + '" WITH ')]
    if len(lines) != 2 or 'NOLOGIN' not in lines[1] or 'PASSWORD' in lines[1]:
        raise local.Failure('Definição inesperada do papel sintético')
    return '\n'.join(lines) + '\n'


def gpg(home, args, password, required=True):
    return execute(['gpg', '--homedir', str(home), '--batch', '--yes', '--no-tty',
                    '--pinentry-mode', 'loopback', '--no-symkey-cache', '--passphrase-fd', '0', *args],
                   'pacote criptografado', password + '\n', required=required)


def unpack_bundle(bundle, destination):
    allowed = {'database.dump', 'roles.sql', 'schema-setup.sql', 'manifest.json'}
    with tarfile.open(bundle, 'r') as archive:
        members = archive.getmembers()
        if len(members) != len(allowed) or {m.name for m in members} != allowed or any(not m.isfile() for m in members):
            raise local.Failure('Conteúdo inesperado no pacote recuperado')
        for member in members:
            with archive.extractfile(member) as data:
                (destination / member.name).write_bytes(data.read())
    manifest = json.loads((destination / 'manifest.json').read_text())
    expected = allowed - {'manifest.json'}
    if set(manifest.get('sha256', {})) != expected:
        raise local.Failure('Manifesto incompleto')
    local.check(all(hashlib.sha256((destination / name).read_bytes()).hexdigest() == digest
                    for name, digest in manifest['sha256'].items()), 'SHA-256 dos componentes recuperados confere com manifesto criptografado')


def encrypted_recovery(backup, timings):
    root = backup.parent
    home = root / 'gpg-home'
    home.mkdir(mode=0o700)
    bundle = root / 'synthetic.tar'
    encrypted = root / 'synthetic.tar.gpg'
    recovered = root / 'recovered'
    recovered.mkdir(mode=0o700)
    password = secrets.token_urlsafe(40)
    hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in backup.iterdir()}
    (backup / 'manifest.json').write_text(json.dumps({'format': 1, 'postgres_major': 17, 'synthetic_only': True, 'sha256': hashes}))
    with tarfile.open(bundle, 'w') as out:
        for p in sorted(backup.iterdir()):
            out.add(p, arcname=p.name)
    started = time.monotonic()
    try:
        gpg(home, ['--cipher-algo', 'AES256', '--symmetric', '--output', str(encrypted), str(bundle)], password)
        local.check(encrypted.is_file() and encrypted.stat().st_size > 0, 'pacote sintético criptografado com GnuPG AES-256')
        for p in backup.iterdir():
            p.unlink()
        bundle.unlink()
        local.check(not any(backup.iterdir()) and not bundle.exists(), 'originais em claro removidos antes da recuperação do pacote')
        bad = root / 'bad-password.tar'
        wrong = gpg(home, ['--output', str(bad), '--decrypt', str(encrypted)], secrets.token_urlsafe(40), required=False)
        local.check(wrong.returncode != 0, 'senha incorreta não recupera pacote')
        bad.unlink(missing_ok=True)
        altered = root / 'tampered.gpg'
        content = bytearray(encrypted.read_bytes())
        content[-1] ^= 1
        altered.write_bytes(content)
        bad = root / 'tampered.tar'
        result = gpg(home, ['--output', str(bad), '--decrypt', str(altered)], password, required=False)
        local.check(result.returncode != 0, 'adulteração do pacote é detectada; conteúdo rejeitado')
        bad.unlink(missing_ok=True)
        altered.unlink()
        gpg(home, ['--output', str(bundle), '--decrypt', str(encrypted)], password)
        unpack_bundle(bundle, recovered)
        timings['encrypt_decrypt_and_checks_seconds'] = round(time.monotonic() - started, 3)
        return recovered
    finally:
        execute(['gpgconf', '--homedir', str(home), '--kill', 'gpg-agent'], 'encerrar agente efêmero', required=False)


def backup_native(source, backup, timings):
    versions = [source.client(p, ['--version'], connect=False).stdout.strip() for p in ('pg_dump', 'pg_restore', 'psql', 'pg_dumpall')]
    local.check(all(re.search(r'\b17\.', v) for v in versions), 'quatro clientes nativos PostgreSQL 17 disponíveis no host')
    print('Native versions: ' + '; '.join(versions), flush=True)
    setup = source.value("select string_agg(format('CREATE SCHEMA IF NOT EXISTS %I; ALTER SCHEMA %I OWNER TO %I;',nspname,nspname,pg_get_userbyid(nspowner)), E'\\n' order by nspname) from pg_namespace where nspname in ('public','ja_private','supabase_migrations');")
    (backup / 'schema-setup.sql').write_text(setup + '\n')
    started = time.monotonic()
    source.client('pg_dump', ['--format=custom', '--quote-all-identifiers', '--file=' + str(backup / 'database.dump'),
                             '--schema=auth', '--schema=public', '--schema=ja_private', '--schema=supabase_migrations'])
    source.client('pg_dumpall', ['--roles-only', '--no-role-passwords', '--quote-all-identifiers', '--file=' + str(backup / 'roles.sql')])
    timings['native_backup_seconds'] = round(time.monotonic() - started, 3)
    local.check(all(p.stat().st_size > 0 for p in backup.iterdir()), 'archive custom, papéis sem senhas e preparação de schemas produzidos')
    return encrypted_recovery(backup, timings)


def restore_native(target, recovered, timings):
    local.check(target.value("select to_regrole('ja_native_synthetic') is null;") == 't', 'papel global personalizado não existe no destino inicializado')
    no_role = target.sql('grant usage on schema public to ja_native_synthetic;', required=False)
    local.check(no_role.returncode != 0 and '42704' in no_role.stderr, 'restauração de grants depende de definição complementar do papel')
    roles = custom_roles((recovered / 'roles.sql').read_text())
    toc_path = recovered / 'restore.list'
    target.client('pg_restore', ['--list', '--file=' + str(recovered / 'inventory.list'), str(recovered / 'database.dump')], connect=False)
    toc_path.write_text(select_toc((recovered / 'inventory.list').read_text()))
    for section in ('pre-data', 'data', 'post-data'):
        target.client('pg_restore', ['--use-list=' + str(toc_path), '--section=' + section,
                                     '--file=' + str(recovered / (section + '.sql')),
                                     str(recovered / 'database.dump')], connect=False)
    prepare = recovered / 'prepare.sql'
    prepare.write_text(roles + (recovered / 'schema-setup.sql').read_text() +
                       '\nalter default privileges in schema public revoke all on tables from public,anon,authenticated,service_role;\n'
                       'alter default privileges in schema public revoke all on functions from public,anon,authenticated,service_role;\n')
    started = time.monotonic()
    target.client('psql', ['-X', '-v', 'ON_ERROR_STOP=on', '-v', 'VERBOSITY=sqlstate', '--single-transaction',
                           '--file=' + str(prepare), '--file=' + str(recovered / 'pre-data.sql'),
                           '--command=SET session_replication_role=replica', '--file=' + str(recovered / 'data.sql'),
                           '--command=SET session_replication_role=origin', '--file=' + str(recovered / 'post-data.sql')])
    timings['native_restore_sql_seconds'] = round(time.monotonic() - started, 3)
    local.check(target.value('show session_replication_role;') == 'origin', 'sessões posteriores usam triggers habilitados')
