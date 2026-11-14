"""Supabase real descartável e Chromium. Nenhuma entrada de conexão externa."""
from pathlib import Path
import importlib.util
import base64
import hashlib
import hmac
import json
import os
import re
import struct
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('ja_browser', ROOT / 'supabase/tests/browser/run_browser.py')
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)
s = b.stack_module
COUNT = 0
STAGE = 'inicialização'


def check(ok, label):
    global COUNT
    if not ok:
        raise s.Failure(label)
    COUNT += 1
    print(f'::notice title=Authorized panels::PASS {COUNT}: {label}', flush=True)


def context(stack, user):
    status, result, _ = stack.api('/rest/v1/rpc/ja_panel_context', user, 'POST', {})
    check(status == 200 and isinstance(result, dict), 'contexto por JWT real via PostgREST')
    return result


def totp(secret):
    if time.time() % 30 > 27:
        time.sleep(3)
    key = base64.b32decode(secret.upper() + '=' * (-len(secret) % 8))
    digest = hmac.new(key, struct.pack('>Q', int(time.time()) // 30), hashlib.sha1).digest()
    offset = digest[-1] & 15
    return str((struct.unpack('>I', digest[offset:offset+4])[0] & 0x7fffffff) % 1000000).zfill(6)


def owner_mfa(stack, user):
    status, factor, _ = stack.api('/auth/v1/factors', user, 'POST', {'factor_type': 'totp', 'friendly_name': 'Synthetic panels'})
    check(status == 200, 'fator MFA sintético criado exclusivamente no Auth descartável')
    status, challenge, _ = stack.api('/auth/v1/factors/' + factor['id'] + '/challenge', user, 'POST', {})
    check(status == 200, 'desafio MFA real criado')
    status, session, _ = stack.api('/auth/v1/factors/' + factor['id'] + '/verify', user, 'POST', {'challenge_id': challenge['id'], 'code': totp(factor['totp']['secret'])})
    check(status == 200 and bool(session.get('access_token')), 'MFA real verificado')
    return session, factor['totp']['secret']


def exercise(stack, directory):
    global STAGE
    STAGE = 'migrações e identidades sintéticas'
    stack.sql((ROOT / 'supabase/migrations/202610250001_identity_foundation.sql').read_text())
    stack.sql("notify pgrst, 'reload schema';")
    users = {name: stack.signup('panels-' + name) for name in ['owner', 'legacy', 'pro-a', 'pro-b', 'student', 'basic']}
    owner = users['owner']
    owner2, secret = owner_mfa(stack, owner)
    oid = owner['user']['id']
    stack.sql(f"select ja_private.bootstrap_owner('{oid}', 'Synthetic test only');")
    legacy2 = stack.mfa(users['legacy'])
    stack.rpc('ja_grant_admin', owner2, {'p_user': users['legacy']['user']['id'], 'p_scopes': ['organizations.manage'], 'p_until': None, 'p_reason': 'Synthetic legacy before restriction'})
    stack.sql((ROOT / 'supabase/migrations/202611140001_exclusive_owner_panels.sql').read_text())
    stack.sql("notify pgrst, 'reload schema';")
    time.sleep(1)
    check(not context(stack, legacy2)['administrator'], 'admin legado AAL2 não ganha painel global')
    stack.rpc('ja_create_organization', legacy2, {'p_name': 'Denied'}, expected=403)
    stack.rpc('ja_grant_admin', owner2, {'p_user': users['basic']['user']['id'], 'p_scopes': [], 'p_until': None, 'p_reason': 'Denied'}, expected=403)
    check(context(stack, owner)['owner_candidate'] and not context(stack, owner)['administrator'], 'proprietário AAL1 não administra')
    stack.rpc('ja_record_admin_access', owner, {}, expected=403)
    check(context(stack, owner2)['administrator'] and not context(stack, owner2)['professional'], 'proprietário AAL2 administra sem herdar função profissional')
    stack.rpc('ja_record_admin_access', owner2, {}, expected=204)
    basic = context(stack, users['basic'])
    check(basic['active'] and not any(basic[key] for key in ['owner_candidate','administrator','professional','student']), 'metadados hostis no cadastro não concedem funções')
    status, _, _ = stack.api('/rest/v1/rpc/ja_panel_context', method='POST', body={})
    check(status in (401,403), 'API de contexto nega chamada anônima')
    status, _, _ = stack.api('/rest/v1/platform_role_assignments', users['basic'], 'POST', {'user_id':users['basic']['user']['id'],'role':'owner','reason':'Denied'})
    check(status == 403, 'API direta impede autoconcessão de proprietário')
    orgs = [stack.rpc('ja_create_organization', owner2, {'p_name':'Synthetic A'}), stack.rpc('ja_create_organization', owner2, {'p_name':'Synthetic B'})]
    memberships = {}
    for name, org, role in [('pro-a',orgs[0],'professional'),('pro-b',orgs[1],'professional'),('student',orgs[0],'student'),('student',orgs[1],'student')]:
        mid = stack.rpc('ja_invite_member', owner2, {'p_org':org,'p_user':users[name]['user']['id'],'p_role':role,'p_reason':'Synthetic authorized invitation'})
        check(not context(stack, users[name])[role if role == 'professional' else 'student'] or name == 'student', 'convite não ativa função antes do aceite')
        stack.rpc('ja_accept_membership', users[name], {'p_id':mid})
        memberships[(name,org)] = mid
    care = []
    for name,org in [('pro-a',orgs[0]),('pro-b',orgs[1])]:
        cid=stack.rpc('ja_request_care', users[name], {'p_org':org,'p_professional':users[name]['user']['id'],'p_student':users['student']['user']['id']})
        stack.rpc('ja_accept_care', users['student'], {'p_id':cid})
        care.append(cid)
    check([x['id'] for x in stack.rows('care_relationships', users['pro-a'])] == [care[0]], 'profissional A não lê acompanhamento de B')
    check([x['id'] for x in stack.rows('care_relationships', users['pro-b'])] == [care[1]], 'profissional B não lê acompanhamento de A')
    check(len(stack.rows('care_relationships', users['student'])) == 2, 'aluno mantém vínculos independentes nas duas organizações')
    check(stack.rows('care_relationships', owner2) == [], 'administração não libera acompanhamentos de outros profissionais')
    # Vínculo profissional do proprietário é uma decisão operacional SEPARADA, só em fixture sintética.
    grantor = users['pro-a']['user']['id']
    stack.sql(f"insert into public.organization_memberships(organization_id,user_id,role,status,granted_by,reason,accepted_at) values('{orgs[0]}','{oid}','professional','active','{grantor}','Synthetic separate operator decision',now());")
    check(context(stack, owner2)['administrator'] and context(stack, owner2)['professional'], 'proprietário pode acumular função profissional explicitamente separada')
    check(stack.rows('care_relationships', owner2) == [], 'acúmulo profissional não libera registros alheios')

    own_invite = stack.rpc('ja_invite_member', owner2, {'p_org':orgs[0], 'p_user':users['basic']['user']['id'], 'p_role':'student', 'p_reason':'Synthetic browser acceptance'})
    foreign_invite = stack.rpc('ja_invite_member', owner2, {'p_org':orgs[0], 'p_user':users['pro-b']['user']['id'], 'p_role':'professional', 'p_reason':'Synthetic pending foreign invitation'})
    STAGE = 'navegador real e ações servidor'
    application = b.Application(directory, stack.key)
    STAGE = 'build isolado Next.js'
    application.start()
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            contexts = []
            def page_for(name):
                ctx = browser.new_context()
                ctx.route('**/*', b.guard)
                ctx.set_default_timeout(20000)
                contexts.append(ctx)
                page = ctx.new_page()
                b.login(page, users[name]['email'], users[name]['password'])
                return page
            STAGE = 'login de conta básica'
            basic_page = page_for('basic')
            basic_page.context.add_cookies([{'name':'role','value':'owner','url':b.APP},{'name':'ja-role','value':'admin','url':b.APP}])
            check(basic_page.get_by_role('navigation',name='Seus painéis').get_by_role('link').count() == 0, 'browser: perfil básico não vê painéis')
            for path in ['/administrador?role=owner','/profissional?role=professional','/aluno?role=student','/seguranca/mfa']:
                basic_page.goto(b.APP+path)
                check(basic_page.get_by_role('heading',name='Administração da Plataforma JA').count() == 0 and basic_page.get_by_role('button',name='Criar organização').count() == 0, 'browser: URL direta e query manipulada não liberam administração')
            STAGE = 'convite presente na conta'
            basic_page.goto(b.APP+'/conta', wait_until='networkidle')
            basic_page.get_by_role('button',name='Aceitar convite').wait_for()
            STAGE = 'aceite legítimo de convite pelo navegador'
            with basic_page.expect_request(lambda req: req.method == 'POST' and req.url == b.APP+'/conta') as invitation_capture:
                basic_page.get_by_role('button',name='Aceitar convite').click()
            basic_page.get_by_role('navigation',name='Seus painéis').get_by_role('link',name='Aluno',exact=True).wait_for()
            basic_page.reload()
            check(basic_page.get_by_role('navigation',name='Seus painéis').get_by_role('link',name='Aluno',exact=True).count()==1, 'browser: aceite legítimo habilita apenas função previamente autorizada')
            STAGE = 'POST de aceite com convite pendente de terceiro'
            invitation_request = invitation_capture.value
            headers = {key:value for key,value in invitation_request.all_headers().items() if key in ('content-type','next-action')}
            headers['origin'] = b.APP
            body = invitation_request.post_data_buffer
            check('next-action' in headers and body and own_invite.encode() in body, 'captura da Server Action real contém identificador sintético esperado')
            tampered = body.replace(own_invite.encode(), foreign_invite.encode())
            denied = basic_page.context.request.post(b.APP+'/conta', data=tampered, headers=headers)
            check('Convite indispon' in denied.text() and not context(stack, users['basic'])['professional'] and stack.sql(f"select status from public.organization_memberships where id='{foreign_invite}';").stdout.strip() == 'invited', 'HTTP: ID adulterado não aceita convite pendente de terceiro nem amplia função')
            STAGE = 'painel profissional'
            pro = page_for('pro-a')
            pro.goto(b.APP+'/profissional')
            pro.get_by_role('heading',name='Meu painel profissional').wait_for()
            check(care[0] in pro.get_by_role('main').inner_text() and care[1] not in pro.get_by_role('main').inner_text(), 'browser: profissional vê somente seu vínculo')
            pro.goto(b.APP+'/administrador')
            check(pro.get_by_role('button',name='Criar organização').count()==0, 'browser: profissional não acessa ação administrativa')
            STAGE = 'painel aluno'
            student = page_for('student')
            student.goto(b.APP+'/aluno')
            student.get_by_role('heading',name='Meu painel de aluno').wait_for()
            check(all(cid in student.get_by_role('main').inner_text() for cid in care), 'browser: aluno vê seus dois vínculos autorizados')
            STAGE = 'login proprietário AAL1'
            admin = page_for('owner')
            check(admin.get_by_role('link',name='Administrador',exact=True).count()==0, 'browser: proprietário AAL1 não vê menu administrativo')
            STAGE = 'proteção administrativa por MFA'
            admin.goto(b.APP+'/administrador')
            admin.wait_for_url(b.APP+'/seguranca/mfa')
            STAGE = 'rejeição MFA inválido'
            admin.get_by_label('Código do autenticador').fill(str((int(totp(secret))+1)%1000000).zfill(6))
            admin.get_by_role('button',name='Confirmar acesso').click()
            admin.get_by_role('status').filter(has_text='Não foi possível validar').wait_for()
            check(admin.get_by_role('button',name='Criar organização').count()==0, 'browser: código MFA inválido não libera painel')
            # Novo passo TOTP evita reutilizar o código da matrícula do fator.
            step = int(time.time()) // 30
            while int(time.time()) // 30 == step:
                time.sleep(0.2)
            STAGE = 'verificação MFA válido'
            admin.get_by_label('Código do autenticador').fill(totp(secret))
            admin.get_by_role('button',name='Confirmar acesso').click()
            admin.wait_for_url(b.APP+'/administrador')
            admin.get_by_role('heading',name='Administração da Plataforma JA').wait_for()
            check(admin.get_by_role('link',name='Administrador',exact=True).count()==1, 'browser: MFA válido libera navegação exclusiva do proprietário')
            STAGE = 'ação de criação de organização'
            admin.get_by_label('Nome da organização').fill('Synthetic browser organization')
            with admin.expect_request(lambda req: req.method == 'POST' and req.url == b.APP+'/administrador') as action_capture:
                admin.get_by_role('button',name='Criar organização').click()
            admin.get_by_role('status').filter(has_text='Organização criada.').wait_for()
            response = admin.reload()
            check('no-store' in response.headers.get('cache-control','') and response.headers.get('referrer-policy') == 'no-referrer', 'browser: painel retorna cabeçalhos privados e sem referência externa')
            check('Synthetic browser organization' in admin.get_by_role('main').inner_text(), 'browser: ação administrativa persiste organização com auditoria')
            STAGE = 'POST administrativo direto por profissional'
            action_request = action_capture.value
            headers = {key:value for key,value in action_request.all_headers().items() if key in ('content-type','next-action')}
            check('next-action' in headers, 'requisição real identifica Server Action testada')
            headers['origin'] = b.APP
            before = stack.sql('select count(*) from public.organizations;').stdout.strip()
            denied = pro.context.request.post(b.APP+'/administrador', data=action_request.post_data_buffer, headers=headers)
            check(denied.status >= 400 and stack.sql('select count(*) from public.organizations;').stdout.strip() == before, 'HTTP: profissional não executa Server Action administrativa capturada por acesso direto')
            STAGE = 'proteção CSRF de origem externa'
            headers['origin'] = 'https://external.example.invalid'
            denied = admin.context.request.post(b.APP+'/administrador', data=action_request.post_data_buffer, headers=headers)
            check(denied.status >= 400 and stack.sql('select count(*) from public.organizations;').stdout.strip() == before, 'HTTP: origem externa não executa ação mesmo com sessão proprietária')
            STAGE = 'logout proprietário'
            b.logout(admin)
            STAGE = 'proteção administrativa por MFA'
            admin.goto(b.APP+'/administrador')
            admin.wait_for_url(b.APP+'/login')
            check(admin.get_by_role('button',name='Criar organização').count()==0, 'browser: logout bloqueia acesso direto ao painel')
            # Requisições independentes com o mesmo JWT refletem alterações no banco.
            STAGE = 'revogação e suspensão'
            stack.rpc('ja_end_membership', users['pro-a'], {'p_id':memberships[('pro-a',orgs[0])],'p_reason':'Synthetic revocation'})
            check(not context(stack, users['pro-a'])['professional'], 'JWT antigo não mantém função após encerramento de vínculo')
            pro.goto(b.APP+'/profissional')
            check(pro.get_by_role('heading',name='Meu painel profissional').count()==0, 'browser: vínculo encerrado bloqueia próxima requisição')
            stack.sql(f"update public.organizations set status='suspended' where id='{orgs[0]}'; update public.organizations set status='suspended' where id='{orgs[1]}';")
            check(not context(stack, users['student'])['student'], 'organizações suspensas retiram navegação do aluno')
            stack.sql(f"update public.profiles set status='suspended' where user_id='{oid}';")
            check(not context(stack, owner2)['administrator'], 'suspensão do perfil do proprietário bloqueia administração')
            stack.rpc('ja_create_organization', owner2, {'p_name':'Denied after suspension'}, expected=403)
            audit=stack.sql("select count(*) from public.audit_events where target_type='admin_panel' and action='read';").stdout.strip()
            check(int(audit) >= 2, 'leituras administrativas registradas em auditoria mínima')
            for ctx in contexts:
                ctx.close()
            browser.close()
    finally:
        application.stop()


def main():
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        raise s.Failure('Permitido somente em runner descartável GitHub Actions')
    with tempfile.TemporaryDirectory(prefix='ja-panels-stack-') as work, tempfile.TemporaryDirectory(prefix='ja-panels-app-') as app:
        stack = s.Stack(work)
        try:
            stack.start()
            exercise(stack, app)
        finally:
            stack.cli('stop', '--no-backup')
    print(f'::notice title=Authorized panels::COMPLETE: {COUNT} checks; Supabase real descartável e Chromium; sem produção ou dados reais', flush=True)

if __name__ == '__main__':
    try:
        main()
    except s.Failure as error:
        print('::error title=Authorized panels::'+str(error), flush=True)
        raise SystemExit(1)
    except Exception as error:
        kind = type(error).__name__
        kind = kind if re.fullmatch(r'[A-Za-z_]{1,60}', kind) else 'Exception'
        print('::error title=Authorized panels::Falha em '+STAGE+' ('+kind+'); detalhes sensíveis omitidos', flush=True)
        raise SystemExit(1)
