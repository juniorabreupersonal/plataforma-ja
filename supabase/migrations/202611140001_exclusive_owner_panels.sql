-- Etapa 166. Depende de 202610250001_identity_foundation.sql (PR #4).
-- Não inicializa proprietário, não cria usuários e não altera dados assistenciais.
begin;

-- Nesta fase, atribuições admin históricas não conferem poderes globais.
create or replace function ja_private.platform_manager() returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select ja_private.is_owner();
$$;
create or replace function public.ja_grant_admin(p_user uuid, p_scopes text[], p_until timestamptz, p_reason text) returns uuid
language plpgsql security definer set search_path = pg_catalog as $$
begin
  raise exception 'Global delegation disabled' using errcode = '42501';
end;
$$;
revoke all on function public.ja_grant_admin(uuid,text[],timestamptz,text) from public, anon, authenticated, service_role;

-- Fonte atual de navegação, sem metadados do usuário, cookies de papel ou cache.
-- SECURITY INVOKER: inclusive as leituras continuam sujeitas às RLS do PR #4.
create function public.ja_panel_context() returns jsonb
language sql stable security invoker set search_path = pg_catalog as $$
  select jsonb_build_object(
    'active', ja_private.active_user(),
    'owner_candidate', ja_private.active_user() and exists (
      select 1 from public.platform_role_assignments r where r.user_id = auth.uid()
        and r.role = 'owner' and r.revoked_at is null and r.valid_from <= now()
        and (r.valid_until is null or r.valid_until > now())),
    'administrator', ja_private.is_owner(),
    'professional', ja_private.active_user() and exists (
      select 1 from public.organization_memberships m join public.organizations o on o.id = m.organization_id
        where m.user_id = auth.uid() and m.role = 'professional' and m.status = 'active' and o.status = 'active'),
    'student', ja_private.active_user() and exists (
      select 1 from public.organization_memberships m join public.organizations o on o.id = m.organization_id
        where m.user_id = auth.uid() and m.role = 'student' and m.status = 'active' and o.status = 'active'));
$$;

-- Acesso administrativo relevante é auditado; falha impede renderizar o painel.
create function public.ja_record_admin_access() returns void
language plpgsql security definer set search_path = pg_catalog as $$
begin
  if not ja_private.is_owner() then raise exception 'Not authorized' using errcode = '42501'; end if;
  insert into public.audit_events(actor_user_id, database_actor, action, target_type, target_id)
    values (auth.uid(), session_user, 'read', 'admin_panel', auth.uid());
end;
$$;
revoke all on function public.ja_panel_context(), public.ja_record_admin_access() from public, anon, authenticated, service_role;
grant execute on function public.ja_panel_context(), public.ja_record_admin_access() to authenticated;
commit;
