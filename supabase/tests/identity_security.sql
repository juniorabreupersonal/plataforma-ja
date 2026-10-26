-- Executar SOMENTE depois da migração, em banco isolado com fixtures sintéticas.
-- Todos os dados deste arquivo são revertidos; fixtures anteriores pertencem ao banco descartável.
begin;
create schema ja_test;
create function ja_test.assert_true(ok boolean, label text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end;
$$;
create function ja_test.expect_error(command text, expected text, label text) returns void
language plpgsql as $$
declare actual text;
begin
  begin execute command; exception when others then get stacked diagnostics actual = returned_sqlstate; end;
  if actual is distinct from expected then raise exception 'FAIL: %, expected %, got %', label, expected, coalesce(actual, 'success'); end if;
  raise notice 'PASS: %', label;
end;
$$;
create function ja_test.login(p_user uuid, p_aal text default 'aal1') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
end;
$$;
grant usage on schema ja_test to anon, authenticated, service_role;
grant execute on all functions in schema ja_test to anon, authenticated, service_role;

select ja_test.assert_true((select count(*) = 2 from public.profiles), 'backfill de duas identidades existentes');
select ja_test.assert_true((select count(*) = 0 from public.platform_role_assignments), 'migração não cria proprietário nem funções');
select ja_test.assert_true((select bool_and(display_name is null) from public.profiles), 'metadados não importados');
select ja_test.assert_true((select count(*) = 6 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity), 'seis tabelas com RLS forçada');

-- Cadastro posterior à migração provisiona somente perfil, ignorando metadados hostis.
insert into auth.users(id,email_confirmed_at,raw_user_meta_data)
select ('00000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid, now(), '{"role":"owner","professional":true}'::jsonb
from generate_series(2,6) i;
select ja_test.assert_true((select count(*) = 7 from public.profiles), 'trigger cria novos perfis');
select ja_test.assert_true((select count(*) = 0 from public.platform_role_assignments), 'cadastro não concede privilégios');
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000007');
select ja_test.expect_error($q$select ja_private.bootstrap_owner('00000000-0000-4000-8000-000000000001','teste')$q$,
  '23514', 'bootstrap exige MFA cadastrado');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','totp','verified',now(),now());
select ja_private.bootstrap_owner('00000000-0000-4000-8000-000000000001','Inicialização sintética de teste') as owner_assignment \gset
select ja_test.expect_error($q$select ja_private.bootstrap_owner('00000000-0000-4000-8000-000000000001','repetição')$q$,
  '23505','bootstrap não reinicializa proprietário');
select ja_test.assert_true((select count(*) = 1 from public.audit_events where target_type='platform_role_assignments'), 'bootstrap auditado');

set local role service_role;
select ja_test.expect_error('select * from public.profiles','42501','BYPASSRLS não substitui privilégios de tabela revogados');
select ja_test.expect_error($q$select public.ja_create_organization('teste')$q$,'42501','service_role sem concessão implícita de RPC');
reset role;

set local role anon;
select ja_test.expect_error('select * from public.profiles','42501','anônimo não lê perfis');
select ja_test.expect_error($q$select public.ja_create_organization('teste')$q$,'42501','anônimo não executa RPC');
select ja_test.expect_error($q$select ja_private.bootstrap_owner('00000000-0000-4000-8000-000000000009','teste')$q$,'42501','bootstrap inacessível ao anônimo');
reset role;

set local role authenticated;
select ja_test.login('00000000-0000-4000-8000-000000000007');
select ja_test.assert_true(not ja_private.active_user(),'identidade sem confirmação não recebe acesso operacional');
select ja_test.login('00000000-0000-4000-8000-000000000009');
select ja_test.assert_true((select count(*)=1 from public.profiles), 'usuário lê apenas próprio perfil');
update public.profiles set display_name='Perfil sintético' where user_id=auth.uid();
select ja_test.assert_true((select display_name='Perfil sintético' from public.profiles), 'edição de nome próprio permitida');
select ja_test.expect_error($q$update public.profiles set status='suspended' where user_id=auth.uid()$q$,'42501','usuário não altera estado');
select ja_test.expect_error($q$insert into public.platform_role_assignments(user_id,role,reason) values(auth.uid(),'owner','teste')$q$,'42501','autoconcessão direta bloqueada');
select ja_test.expect_error($q$select public.ja_grant_admin(auth.uid(),array['organizations.manage'],null,'teste')$q$,'42501','autoconcessão por RPC bloqueada');
select ja_test.expect_error($q$select public.ja_create_organization('teste')$q$,'42501','cadastro comum não cria organização');
select ja_test.expect_error($q$select ja_private.bootstrap_owner(auth.uid(),'teste')$q$,'42501','bootstrap inacessível ao autenticado');
select ja_test.expect_error($q$delete from public.profiles where user_id=auth.uid()$q$,'42501','exclusão direta bloqueada');
select ja_test.expect_error($q$update public.audit_events set reason='alterado'$q$,'42501','auditoria não alterável');

select ja_test.login('00000000-0000-4000-8000-000000000001');
select ja_test.expect_error($q$select public.ja_create_organization('A')$q$,'42501','proprietário sem aal2 não administra');
select ja_test.login('00000000-0000-4000-8000-000000000001','aal2');
select ja_test.expect_error($q$select public.ja_grant_admin(auth.uid(),array['organizations.manage'],null,'teste')$q$,'42501','proprietário não se concede papel');
select count(*) as audit_before_failure from public.audit_events \gset
select ja_test.expect_error($q$select public.ja_grant_admin('00000000-0000-4000-8000-000000000002',array['method.access'],null,'teste')$q$,'23514','escopo Método JA não pode ser concedido nesta migração');
select ja_test.assert_true((select count(*)=:'audit_before_failure'::bigint from public.audit_events),'falha não deixa concessão ou auditoria parcial');
select public.ja_grant_admin('00000000-0000-4000-8000-000000000002',array['organizations.manage'],now()+interval '1 hour','Delegação sintética') as admin_assignment \gset
select public.ja_create_organization('Organização sintética A') as org_a \gset
select public.ja_create_organization('Organização sintética B') as org_b \gset
select ja_test.expect_error(format($q$select public.ja_invite_member(%L,'00000000-0000-4000-8000-000000000003','owner','teste')$q$, :'org_a'),
 '23514','papel organizacional inválido rejeitado');
select public.ja_invite_member(:'org_a','00000000-0000-4000-8000-000000000003','professional','Habilitação sintética') as prof_a \gset
select public.ja_invite_member(:'org_a','00000000-0000-4000-8000-000000000004','professional','Habilitação sintética') as prof2_a \gset
select public.ja_invite_member(:'org_a','00000000-0000-4000-8000-000000000005','student','Convite sintético') as student_a \gset
select public.ja_invite_member(:'org_b','00000000-0000-4000-8000-000000000006','professional','Habilitação sintética') as prof_b \gset
select public.ja_invite_member(:'org_b','00000000-0000-4000-8000-000000000005','student','Convite sintético') as student_b \gset
select public.ja_invite_member(:'org_a','00000000-0000-4000-8000-000000000002','org_admin','Administração sintética') as org_admin \gset
select ja_test.expect_error($q$select public.ja_invite_member(null,auth.uid(),'professional','teste')$q$,'42501','sem atribuição organizacional a si próprio');

select ja_test.login('00000000-0000-4000-8000-000000000002','aal2');
select ja_test.expect_error($q$select public.ja_grant_admin('00000000-0000-4000-8000-000000000003',array['organizations.manage'],null,'teste')$q$,'42501','administrador delegado não cria administradores globais');
select public.ja_accept_membership(:'org_admin');
select ja_test.login('00000000-0000-4000-8000-000000000002');
select ja_test.expect_error($q$select public.ja_create_organization('sem MFA')$q$,'42501','delegado sem aal2 bloqueado');

select ja_test.login('00000000-0000-4000-8000-000000000003');
select public.ja_accept_membership(:'prof_a');
select ja_test.assert_true((select count(*)=1 from public.organizations),'profissional A não vê organização B');
select ja_test.assert_true((select count(*)=1 from public.organization_memberships),'profissional não lista outros participantes');
select ja_test.expect_error($q$select public.ja_accept_membership('00000000-0000-4000-8000-000000000000')$q$,'42501','aceite de convite alheio/inexistente negado');
select ja_test.expect_error($q$select public.ja_invite_member(null,'00000000-0000-4000-8000-000000000009','professional','teste')$q$,'42501','profissional não habilita outros usuários');
select ja_test.login('00000000-0000-4000-8000-000000000004');
select public.ja_accept_membership(:'prof2_a');
select ja_test.login('00000000-0000-4000-8000-000000000005');
select public.ja_accept_membership(:'student_a');
select public.ja_accept_membership(:'student_b');
select ja_test.login('00000000-0000-4000-8000-000000000006');
select public.ja_accept_membership(:'prof_b');

select ja_test.login('00000000-0000-4000-8000-000000000003');
select public.ja_request_care(:'org_a','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000005') as care_a \gset
select ja_test.assert_true((select status='pending' and student_accepted_at is null from public.care_relationships),'um aceite não ativa acompanhamento');
select ja_test.login('00000000-0000-4000-8000-000000000004');
select ja_test.assert_true((select count(*)=0 from public.care_relationships),'outro profissional do mesmo aluno não vê vínculo alheio');
select public.ja_request_care(:'org_a','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005') as care_a2 \gset
select ja_test.login('00000000-0000-4000-8000-000000000006');
select public.ja_request_care(:'org_b','00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000005') as care_b \gset
select ja_test.login('00000000-0000-4000-8000-000000000005');
select ja_test.assert_true((select count(*)=3 from public.care_relationships),'aluno vê três vínculos independentes em duas organizações');
select public.ja_accept_care(:'care_a');
select public.ja_accept_care(:'care_a2');
select public.ja_accept_care(:'care_b');
select ja_test.assert_true((select count(*)=3 from public.care_relationships where status='active'),'aceites bilaterais ativam três vínculos');
select ja_test.expect_error(format($q$select public.ja_end_care(%L,null)$q$, :'care_a'),
 '23514','encerramento exige motivo não nulo');
select ja_test.assert_true((select count(*)=3 from public.care_relationships where status='active'),'falha de encerramento preserva estado anterior');
select ja_test.expect_error($q$insert into public.audit_events(database_actor,action,target_type,target_id) values('fake','grant','profile',auth.uid())$q$,'42501','usuário não fabrica auditoria');

select ja_test.login('00000000-0000-4000-8000-000000000002','aal2');
select ja_test.assert_true((select count(*)=0 from public.care_relationships),'administrador global/organizacional não recebe acesso assistencial');
select ja_test.login('00000000-0000-4000-8000-000000000001','aal2');
select ja_test.assert_true((select count(*)=0 from public.care_relationships),'proprietário não recebe acesso assistencial');
select ja_test.assert_true((select count(*)=0 from public.audit_events where target_type='care_relationships'),'auditoria não vira acesso assistencial indireto ao proprietário');
select public.ja_revoke_admin(:'admin_assignment','Encerramento da delegação sintética');
select ja_test.login('00000000-0000-4000-8000-000000000002','aal2');
select ja_test.expect_error($q$select public.ja_create_organization('revogado')$q$,'42501','revogação bloqueia operação com mesmos claims');

select ja_test.login('00000000-0000-4000-8000-000000000003');
select public.ja_end_membership(:'prof_a','Encerramento sintético');
select ja_test.assert_true((select status='ended' from public.care_relationships),'encerramento mantém vínculo histórico visível ao participante');
select ja_test.expect_error($q$select public.ja_request_care(null,auth.uid(),'00000000-0000-4000-8000-000000000005')$q$,'23514','participação encerrada não pode criar acompanhamento');
select ja_test.login('00000000-0000-4000-8000-000000000005');
select ja_test.assert_true((select count(*)=3 from public.care_relationships),'histórico pessoal não é apagado com saída do profissional');
select ja_test.assert_true((select count(*)=2 from public.care_relationships where status='active'),'outros vínculos não são encerrados automaticamente');
select public.ja_end_care(:'care_b','Encerramento pelo aluno');

select ja_test.login('00000000-0000-4000-8000-000000000009');
select ja_test.assert_true((select count(*)=0 from public.organizations),'terceiro sem vínculo não lista organizações');
select ja_test.assert_true((select count(*)=0 from public.care_relationships),'terceiro não lista acompanhamentos');
select ja_test.assert_true((select count(*)=0 from public.platform_role_assignments),'metadado admin não concede função');
select ja_test.expect_error($q$select public.ja_request_care(null,'00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000005')$q$,'42501','terceiro não cria vínculo entre outras identidades');
reset role;
select ja_test.login(null);

-- Integridade no banco, mesmo quando uma operação administrativa contorna RLS.
select ja_test.expect_error(format($q$insert into public.care_relationships(organization_id,professional_membership_id,student_membership_id,professional_user_id,student_user_id,requested_by)
 values(%L,%L,%L,'00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000004')$q$, :'org_b', :'prof2_a', :'student_b'),
 '23503','FK composta bloqueia mistura de organizações');
select ja_test.expect_error($q$delete from auth.users where id='00000000-0000-4000-8000-000000000005'$q$,'23503','Auth não apaga perfil e histórico por cascata');
select ja_test.expect_error('delete from public.audit_events','42501','auditoria append-only inclusive em operação comum do banco');
select ja_test.assert_true((select count(*)=1 from public.platform_role_assignments where role='admin' and revoked_at is not null),'revogação preserva decisão');
select ja_test.assert_true((select count(*)>15 from public.audit_events),'operações autorizadas produziram auditoria');

-- Expiração e suspensão com os mesmos claims devem ser verificadas no banco.
update public.platform_role_assignments set revoked_at=null, revoked_by=null, revocation_reason=null,
 valid_from=now()-interval '2 days', valid_until=now()-interval '1 day' where id=:'admin_assignment';
set local role authenticated;
select ja_test.login('00000000-0000-4000-8000-000000000002','aal2');
select ja_test.expect_error($q$select public.ja_create_organization('expirado')$q$,'42501','validade expirada bloqueia acesso');
reset role;
update public.profiles set status='suspended' where user_id='00000000-0000-4000-8000-000000000001';
set local role authenticated;
select ja_test.login('00000000-0000-4000-8000-000000000001','aal2');
select ja_test.expect_error($q$select public.ja_create_organization('suspenso')$q$,'42501','perfil suspenso bloqueia proprietário');
reset role;
rollback;
