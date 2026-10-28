"""Synthetic-only recovery rehearsal. No remote targets, .env, secrets or artifacts."""
from pathlib import Path
import hashlib
import base64
import hmac
import struct
import json
import os
import tempfile
import time
import local_stack as local

BASE = Path(__file__).resolve().parent
SOURCE = 'ja-backup-source'
TARGET = 'ja-backup-target'
TIMINGS = {}


def report_check(ok, label):
    if not ok:
        raise local.Failure(label)
    local.COUNT += 1
    print(f'PASS {local.COUNT}: {label}', flush=True)


# Reserve annotations for the final aggregate result; no individual-record output.
local.check = report_check


class Stack(local.Stack):
    def __init__(self, work, project):
        super().__init__(work)
        self.project = project

    def start(self):
        local.PROJECT = self.project
        super().start()

    def sql(self, sql, required=True):
        return local.command(['docker', 'exec', '--interactive', 'supabase_db_' + self.project,
                              'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At',
                              '-v', 'ON_ERROR_STOP=on', '-v', 'VERBOSITY=sqlstate'],
                             'SQL local ' + self.project, stdin=sql, required=required)

    def value(self, sql):
        return self.sql(sql).stdout.strip()

    def dump(self, output, *flags):
        self.cli('db', 'dump', '--local', '--file', str(output), *flags)
        local.check(output.is_file() and output.stat().st_size > 0, 'exportação local não vazia: ' + output.name)


def fingerprint(stack):
    # Digests only in memory, never logs. Includes data, owners, grants, RLS, policies,
    # constraints and triggers; no auth records are printed.
    queries = {
        'schemas': "select nspname,nspowner::regrole::text,nspacl::text from pg_namespace where nspname in ('public','ja_private') order by 1",
        'columns': "select n.nspname,c.relname,a.attname,a.attacl::text,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname in ('public','ja_private') and c.relkind='r' and a.attnum>0 and not a.attisdropped order by 1,2,3",
        'tables': "select c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relowner::regrole::text,c.relacl::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','ja_private') and c.relkind='r' order by 1",
        'functions': "select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef,p.proconfig,p.proowner::regrole::text,p.proacl::text,pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','ja_private') order by 1,2,3",
        'policies': "select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','ja_private') order by 1,2,3",
        'constraints': "select n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid),k.convalidated from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','ja_private') order by 1,2,3",
        'triggers': "select n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and (n.nspname in ('public','ja_private') or (n.nspname='auth' and t.tgname='ja_provision_profile')) order by 1,2,3",
        'indexes': "select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname in ('public','ja_private') order by 1,2,3",
    }
    result = {key: stack.value('select coalesce(jsonb_agg(to_jsonb(q)),\'[]\'::jsonb) from (' + sql + ') q;') for key, sql in queries.items()}
    tables = json.loads(stack.value("select json_agg(format('%I.%I',schemaname,tablename) order by schemaname,tablename) from pg_tables where schemaname in ('public','auth','supabase_migrations') and tablename <> 'schema_migrations' or schemaname='supabase_migrations';"))
    for table in tables:
        # Exclude only Auth's native internal migration tracker; application history retained.
        result[table] = stack.value(f"select count(*)::text || ':' || md5(coalesce(string_agg(rowdata, '' order by rowdata),'')) from (select row_to_json(t)::text rowdata from {table} t) q;")
    return result


def login(stack, user):
    status, session, _ = stack.api('/auth/v1/token?grant_type=password', method='POST', body={'email': user['email'], 'password': user['password']})
    local.check(status == 200 and bool(session.get('access_token')), 'Auth restaurado aceita senha sintética original')
    return session


def run(source, target, backup):
    source.start()
    first = source.signup('backup-before')
    source.sql((BASE / 'fixtures/identity.sql').read_text())
    source.sql("notify pgrst, 'reload schema';")
    owner = source.signup('backup-owner')
    other = source.signup('backup-outsider')
    professional = source.signup('backup-professional')
    owner2 = source.mfa(owner)
    source.sql("select ja_private.bootstrap_owner('" + owner['user']['id'] + "','Synthetic backup rehearsal');")
    org = source.rpc('ja_create_organization', owner2, {'p_name': 'Synthetic backup organization'})
    membership = source.rpc('ja_invite_member', owner2, {'p_org': org, 'p_user': first['user']['id'], 'p_role': 'student', 'p_reason': 'Synthetic backup invitation'})
    source.rpc('ja_accept_membership', first, {'p_id': membership})
    professional_membership = source.rpc('ja_invite_member', owner2, {'p_org': org, 'p_user': professional['user']['id'], 'p_role': 'professional', 'p_reason': 'Synthetic professional invitation'})
    source.rpc('ja_accept_membership', professional, {'p_id': professional_membership})
    care = source.rpc('ja_request_care', professional, {'p_org': org, 'p_professional': professional['user']['id'], 'p_student': first['user']['id']})
    source.rpc('ja_accept_care', first, {'p_id': care})
    source.sql("create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[], name text); insert into supabase_migrations.schema_migrations(version,name,statements) values ('202610250001','identity_foundation',array['synthetic rehearsal tracking record']); create role ja_backup_synthetic nologin; grant usage on schema public to ja_backup_synthetic;")
    local.check(source.value('select count(*) from public.profiles;') == '4', 'quatro perfis sintéticos antes do backup')
    # Stop writers, not the source database. CLI dump uses only a named local stack.
    for service in ['auth', 'rest']:
        local.command(['docker', 'stop', f'supabase_{service}_{SOURCE}'], 'pausar escritores locais')
    before = fingerprint(source)
    trigger = source.value("select pg_get_triggerdef(oid) || ';' from pg_trigger where tgrelid='auth.users'::regclass and tgname='ja_provision_profile';")
    local.check(trigger.startswith('CREATE TRIGGER ja_provision_profile'), 'definição do trigger Auth capturada do catálogo')
    (backup / 'auth-custom.sql').write_text(trigger + '\n')
    started = time.monotonic()
    source.dump(backup / 'roles.sql', '--role-only')
    source.dump(backup / 'schema.sql', '--schema', 'public,ja_private,supabase_migrations')
    source.dump(backup / 'data.sql', '--schema', 'auth,public,ja_private,supabase_migrations', '--data-only', '--use-copy')
    TIMINGS['backup_seconds'] = round(time.monotonic() - started, 3)
    checksums = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in backup.glob('*.sql')}
    local.check(len(checksums) == 4, 'quatro componentes com SHA-256 calculado em memória')
    # Source remains on its own retained volume. Destination has another project ID/volume.
    source.cli('stop')
    target.start()
    local.check(source.project != target.project, 'destino com identificador e volume distintos da origem')
    local.check(target.value("select to_regclass('public.profiles') is null;") == 't', 'destino sem tabelas de aplicação antes da restauração')
    local.check(all(hashlib.sha256((backup / name).read_bytes()).hexdigest() == digest for name, digest in checksums.items()), 'hashes conferidos imediatamente antes da restauração')
    started = time.monotonic()
    # Preserve least privilege: CLI docs warn target defaults otherwise add grants.
    # No real project involved. Managed Auth schema comes from the same CLI build.
    sql = "begin; alter default privileges in schema public revoke all on tables from public, anon, authenticated, service_role; alter default privileges in schema public revoke all on functions from public, anon, authenticated, service_role;\n"
    sql += (backup / 'roles.sql').read_text() + '\n' + (backup / 'schema.sql').read_text() + '\n'
    sql += (backup / 'data.sql').read_text() + '\n'
    # CLI data dump uses replica role; restore always resets it before custom trigger/tests.
    sql += 'set session_replication_role=origin;\n' + (backup / 'auth-custom.sql').read_text() + '\ncommit;\n'
    target.sql(sql)
    TIMINGS['restore_sql_seconds'] = round(time.monotonic() - started, 3)
    restored = fingerprint(target)
    for key in before:
        local.check(restored.get(key) == before[key], 'integridade restaurada: ' + key)
    local.check(target.value("select exists(select 1 from pg_roles where rolname='ja_backup_synthetic' and not rolcanlogin);") == 't', 'papel sintético sem LOGIN restaurado')
    local.check(target.value("select has_schema_privilege('ja_backup_synthetic','public','usage');") == 't', 'privilégio do papel sintético preservado')
    local.check(target.value("select count(*) from public.profiles p left join auth.users u on u.id=p.user_id where u.id is null;") == '0', 'nenhum perfil órfão')
    local.check(target.value("select count(*) from public.organization_memberships m left join public.profiles p on p.user_id=m.user_id left join public.organizations o on o.id=m.organization_id where p.user_id is null or o.id is null;") == '0', 'relacionamentos restaurados sem órfãos')
    for statement, state, label in [
        ("insert into public.profiles(user_id) values ('00000000-0000-0000-0000-000000000999');", '23503', 'FK restaurada rejeita perfil sem usuário Auth'),
        ("insert into public.profiles(user_id) values ('" + first['user']['id'] + "');", '23505', 'PK restaurada impede perfil duplicado'),
        ("update public.profiles set status='invalid' where user_id='" + first['user']['id'] + "';", '23514', 'CHECK restaurado rejeita estado inválido'),
        ("delete from public.profiles where user_id='" + first['user']['id'] + "';", '42501', 'trigger restaurado preserva histórico contra exclusão'),
    ]:
        result = target.sql(statement, required=False)
        local.check(result.returncode != 0 and state in result.stderr, label)
    target.sql("notify pgrst, 'reload schema';")
    time.sleep(2)
    one, two = login(target, first), login(target, other)
    for person in [one, two]:
        rows = target.rows('profiles', person)
        local.check(len(rows) == 1 and rows[0]['user_id'] == person['user']['id'], 'RLS restaurada isola perfis com JWT real')
    status, rows, _ = target.api('/rest/v1/profiles', method='GET')
    local.check(status == 401, 'anon não lê perfis restaurados')
    status, _, _ = target.api('/rest/v1/profiles?user_id=eq.' + one['user']['id'], one, 'PATCH', {'status': 'suspended'})
    local.check(status == 403, 'RLS e grants restaurados impedem alteração de campo protegido')
    target.rpc('ja_create_organization', login(target, owner), {'p_name': 'AAL1 denied after restore'}, expected=403)
    owner1 = login(target, owner)
    # Challenge the ORIGINAL factor using its original synthetic secret, not a new enrollment.
    factor = source.synthetic_factor
    status, challenge, _ = target.api('/auth/v1/factors/' + factor['id'] + '/challenge', owner1, 'POST', {})
    local.check(status == 200, 'Auth cria desafio para fator TOTP restaurado')
    if time.time() % 30 > 26:
        time.sleep(4)
    secret = factor['totp']['secret'].upper()
    key = base64.b32decode(secret + '=' * (-len(secret) % 8))
    digest = hmac.new(key, struct.pack('>Q', int(time.time()) // 30), hashlib.sha1).digest()
    offset = digest[-1] & 15
    code = str((struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7fffffff) % 1000000).zfill(6)
    status, owner_restored2, _ = target.api('/auth/v1/factors/' + factor['id'] + '/verify', owner1, 'POST', {'challenge_id': challenge['id'], 'code': code})
    local.check(status == 200 and bool(owner_restored2.get('access_token')), 'MFA restaurado valida TOTP original e emite nova sessão')
    target.rpc('ja_create_organization', owner_restored2, {'p_name': 'Synthetic restored AAL2'})
    local.check(len(target.rows('care_relationships', one)) == 1, 'aluno mantém vínculo restaurado')
    local.check(len(target.rows('care_relationships', login(target, professional))) == 1, 'profissional autorizado mantém vínculo restaurado')
    local.check(target.rows('care_relationships', two) == [], 'terceiro não vê vínculo restaurado')
    local.check(target.rows('care_relationships', owner_restored2) == [], 'proprietário não obtém acesso assistencial após restauração')
    status, refreshed, _ = target.api('/auth/v1/token?grant_type=refresh_token', method='POST', body={'refresh_token': first['refresh_token']})
    local.check(status == 200 and bool(refreshed.get('access_token')), 'refresh token sintético anterior ao backup funciona no destino local')
    before_count = int(target.value('select count(*) from public.profiles;'))
    newcomer = target.signup('backup-after-restore')
    local.check(int(target.value('select count(*) from public.profiles;')) == before_count + 1, 'trigger restaurado provisiona novo perfil via Auth real')
    local.check(target.rows('platform_role_assignments', newcomer) == [], 'novo cadastro após restauração não recebe privilégios')
    target.sql("update public.profiles set display_name='Synthetic restored name' where user_id='" + newcomer['user']['id'] + "';")
    local.check(target.value("select count(*)>0 from public.audit_events where target_id='" + newcomer['user']['id'] + "';") == 't', 'trigger de auditoria funciona após restauração')
    local.check(target.value("select count(*) from supabase_migrations.schema_migrations where version='202610250001';") == '1', 'histórico de migração preservado')
    TIMINGS['restore_and_validation_seconds'] = round(time.monotonic() - started, 3)


def main():
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        raise local.Failure('Permitido somente em GitHub runner descartável')
    os.umask(0o077)
    with tempfile.TemporaryDirectory(prefix='ja-backup-') as temp:
        base = Path(temp)
        for name in ['source', 'target', 'backup']:
            (base / name).mkdir()
        source = Stack(str(base / 'source'), SOURCE)
        target = Stack(str(base / 'target'), TARGET)
        try:
            run(source, target, base / 'backup')
        finally:
            results = [s.cli('stop', '--no-backup', required=False).returncode for s in [source, target]]
            if any(results):
                raise local.Failure('Falha na remoção de ambiente descartável')
    report = f'{local.COUNT} assertions passed. Timings: {json.dumps(TIMINGS)}. Synthetic only; no backup uploaded.'
    print('::notice title=Backup rehearsal::' + report)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as out:
            out.write(report + '\n')


if __name__ == '__main__':
    try:
        main()
    except local.Failure as exc:
        print('::error title=Backup rehearsal::' + str(exc), flush=True)
        raise SystemExit(1)
    except Exception:
        print('::error title=Backup rehearsal::Falha inesperada; saída sensível omitida', flush=True)
        raise SystemExit(1)
