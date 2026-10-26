-- Plataforma JA: identidade e vínculos. Revisão obrigatória antes de aplicar.
-- Não cria proprietário, usuários Auth, dados clínicos ou permissões Método JA.
begin;

-- Falha antes de instalar objetos se o contrato operacional/Auth não estiver presente.
do $$
begin
  if current_user in ('anon', 'authenticated', 'service_role') or not exists (
    select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls)
  ) then raise exception 'Trusted migration role with BYPASSRLS required'; end if;
  if to_regclass('auth.users') is null or to_regclass('auth.mfa_factors') is null
    or to_regprocedure('auth.uid()') is null or to_regprocedure('auth.jwt()') is null then
    raise exception 'Supabase Auth contract missing';
  end if;
end;
$$;

create schema ja_private;
revoke all on schema ja_private from public, anon, authenticated, service_role;
grant usage on schema ja_private to authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text check (char_length(display_name) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  role text not null check (role in ('owner', 'admin')),
  scopes text[] not null default '{}' check (scopes <@ array['organizations.manage']::text[]),
  granted_by uuid references public.profiles(user_id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(user_id) on delete restrict,
  revocation_reason text,
  check (valid_until is null or valid_until > valid_from),
  check (revoked_at is null or revoked_at >= valid_from),
  check ((revoked_at is null and revoked_by is null and revocation_reason is null)
    or (revoked_at is not null and revoked_by is not null and revocation_reason is not null and char_length(btrim(revocation_reason)) between 1 and 500)),
  check (role <> 'owner' or (valid_until is null and cardinality(scopes) = 0)),
  check (role = 'owner' or (granted_by is not null and granted_by <> user_id))
);
create unique index one_current_owner on public.platform_role_assignments(role)
  where role = 'owner' and revoked_at is null;
create unique index one_unrevoked_platform_role on public.platform_role_assignments(user_id, role)
  where revoked_at is null;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_by uuid not null references public.profiles(user_id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  role text not null check (role in ('org_admin', 'professional', 'student')),
  status text not null default 'invited' check (status in ('invited', 'active', 'ended')),
  granted_by uuid not null references public.profiles(user_id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  check (granted_by <> user_id),
  check (accepted_at is null or accepted_at >= created_at),
  check ((status = 'invited' and accepted_at is null and ended_at is null)
    or (status = 'active' and accepted_at is not null and ended_at is null)
    or (status = 'ended' and ended_at is not null and ended_at >= created_at and end_reason is not null and char_length(btrim(end_reason)) between 1 and 500)),
  unique (id, organization_id, user_id, role)
);
create unique index one_open_membership on public.organization_memberships(organization_id, user_id, role)
  where status <> 'ended';
create index memberships_user on public.organization_memberships(user_id, organization_id);

create table public.care_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  professional_membership_id uuid not null,
  student_membership_id uuid not null,
  professional_user_id uuid not null references public.profiles(user_id) on delete restrict,
  student_user_id uuid not null references public.profiles(user_id) on delete restrict,
  professional_role text not null default 'professional' check (professional_role = 'professional'),
  student_role text not null default 'student' check (student_role = 'student'),
  requested_by uuid not null references public.profiles(user_id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  created_at timestamptz not null default now(),
  professional_accepted_at timestamptz,
  student_accepted_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  foreign key (professional_membership_id, organization_id, professional_user_id, professional_role)
    references public.organization_memberships(id, organization_id, user_id, role) on delete restrict,
  foreign key (student_membership_id, organization_id, student_user_id, student_role)
    references public.organization_memberships(id, organization_id, user_id, role) on delete restrict,
  check (professional_user_id <> student_user_id),
  check (requested_by in (professional_user_id, student_user_id)),
  check (professional_accepted_at is null or professional_accepted_at >= created_at),
  check (student_accepted_at is null or student_accepted_at >= created_at),
  check ((status = 'pending' and started_at is null and ended_at is null)
    or (status = 'active' and professional_accepted_at is not null and student_accepted_at is not null and started_at is not null and started_at >= created_at and ended_at is null)
    or (status = 'ended' and ended_at is not null and ended_at >= created_at and end_reason is not null and char_length(btrim(end_reason)) between 1 and 500))
);
create unique index one_open_care on public.care_relationships(organization_id, professional_user_id, student_user_id)
  where status <> 'ended';
create index care_student on public.care_relationships(student_user_id);
create index care_professional on public.care_relationships(professional_user_id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(user_id) on delete restrict,
  database_actor text not null,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  organization_id uuid references public.organizations(id) on delete restrict,
  reason text,
  occurred_at timestamptz not null default clock_timestamp()
);
create index audit_target on public.audit_events(target_type, target_id, occurred_at);

-- Helpers não expostos pelo PostgREST. Não aceitam identidade do chamador como parâmetro.
create function ja_private.active_user() returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select exists(select 1 from public.profiles p join auth.users u on u.id = p.user_id
    where p.user_id = auth.uid() and p.status = 'active' and u.email_confirmed_at is not null);
$$;
create function ja_private.is_owner() returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select ja_private.active_user() and coalesce(auth.jwt()->>'aal' = 'aal2', false)
    and exists(select 1 from public.platform_role_assignments where user_id = auth.uid()
      and role = 'owner' and revoked_at is null and valid_from <= now());
$$;
create function ja_private.platform_manager() returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select ja_private.is_owner() or (ja_private.active_user() and coalesce(auth.jwt()->>'aal' = 'aal2', false)
    and exists(select 1 from public.platform_role_assignments where user_id = auth.uid() and role = 'admin'
      and 'organizations.manage' = any(scopes) and revoked_at is null and valid_from <= now()
      and (valid_until is null or valid_until > now())));
$$;
create function ja_private.org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select ja_private.active_user() and exists(select 1 from public.organization_memberships m
    join public.organizations o on o.id = m.organization_id where m.organization_id = p_org
    and m.user_id = auth.uid() and m.status = 'active' and o.status = 'active');
$$;
create function ja_private.org_manager(p_org uuid) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select ja_private.platform_manager() or (ja_private.org_member(p_org)
    and coalesce(auth.jwt()->>'aal' = 'aal2', false) and exists(select 1 from public.organization_memberships
      where organization_id = p_org and user_id = auth.uid() and role = 'org_admin' and status = 'active'));
$$;

-- Auditoria mínima: sem snapshots de perfis, conteúdo clínico, e-mails ou JWTs.
create function ja_private.audit_change() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare v jsonb := to_jsonb(new);
begin
  insert into public.audit_events(actor_user_id, database_actor, action, target_type, target_id, organization_id, reason)
  values (auth.uid(), session_user, lower(tg_op), tg_table_name,
    coalesce((v->>'id')::uuid, (v->>'user_id')::uuid),
    case when tg_table_name = 'organizations' then (v->>'id')::uuid else (v->>'organization_id')::uuid end,
    coalesce(v->>'revocation_reason', v->>'end_reason', v->>'reason'));
  return new;
end;
$$;
create function ja_private.reject_delete() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin raise exception 'Historical records cannot be deleted by ordinary operations' using errcode = '42501'; end;
$$;
create function ja_private.touch_profile() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger profiles_timestamp before update on public.profiles for each row execute function ja_private.touch_profile();

-- Perfil mínimo, sem importar metadados controlados pelo usuário ou conceder funções.
create function ja_private.provision_profile() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
begin
  insert into public.profiles(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
-- Bloqueia inserções Auth concorrentes apenas durante instalação do trigger/backfill.
lock table auth.users in share row exclusive mode;
create trigger ja_provision_profile after insert on auth.users
  for each row execute function ja_private.provision_profile();
-- Backfill antes de instalar auditoria: não fabrica autoria ou decisões históricas.
insert into public.profiles(user_id) select id from auth.users on conflict (user_id) do nothing;

do $$
declare t text;
begin
  foreach t in array array['profiles','platform_role_assignments','organizations','organization_memberships','care_relationships'] loop
    execute format('create trigger ja_audit after insert or update on public.%I for each row execute function ja_private.audit_change()', t);
    execute format('create trigger ja_preserve before delete on public.%I for each row execute function ja_private.reject_delete()', t);
  end loop;
end;
$$;
create trigger audit_append_only before update or delete on public.audit_events
  for each row execute function ja_private.reject_delete();

-- Locks nos mesmos registros de organização/participação serializam aceites e encerramentos.
create function ja_private.check_care() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
begin
  if tg_op = 'UPDATE' and (new.organization_id, new.professional_membership_id, new.student_membership_id,
    new.professional_user_id, new.student_user_id, new.requested_by)
    is distinct from (old.organization_id, old.professional_membership_id, old.student_membership_id,
    old.professional_user_id, old.student_user_id, old.requested_by) then
    raise exception 'Care identity is immutable' using errcode = '23514';
  end if;
  if new.status <> 'ended' then
    perform 1 from public.organizations where id = new.organization_id and status = 'active' for share;
    if not found then raise exception 'Organization unavailable' using errcode = '23514'; end if;
    perform 1 from public.organization_memberships m join public.profiles p on p.user_id = m.user_id
      where m.id = new.professional_membership_id and m.status = 'active' and p.status = 'active' for share of m, p;
    if not found then raise exception 'Professional unavailable' using errcode = '23514'; end if;
    perform 1 from public.organization_memberships m join public.profiles p on p.user_id = m.user_id
      where m.id = new.student_membership_id and m.status = 'active' and p.status = 'active' for share of m, p;
    if not found then raise exception 'Student unavailable' using errcode = '23514'; end if;
  end if;
  if tg_op = 'UPDATE' and old.status = 'ended' then
    raise exception 'Ended care is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger care_integrity before insert or update on public.care_relationships
  for each row execute function ja_private.check_care();

-- Bootstrap operacional; sem EXECUTE para anon/authenticated/service_role.
-- UUID e motivo são fornecidos fora da migração, após verificação humana e MFA.
create function ja_private.bootstrap_owner(p_user uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = pg_catalog as $$
declare v_id uuid;
begin
  perform pg_advisory_xact_lock(742019, 1);
  if exists(select 1 from public.platform_role_assignments where role = 'owner' and revoked_at is null) then
    raise exception 'Owner already initialized' using errcode = '23505';
  end if;
  if not exists(select 1 from auth.users u join public.profiles p on p.user_id = u.id
    where u.id = p_user and u.email_confirmed_at is not null and p.status = 'active') then
    raise exception 'Verified active identity required' using errcode = '23514';
  end if;
  if not exists(select 1 from auth.mfa_factors where user_id = p_user and status = 'verified') then
    raise exception 'Verified MFA enrollment required' using errcode = '23514';
  end if;
  insert into public.platform_role_assignments(user_id, role, reason)
    values (p_user, 'owner', p_reason) returning id into v_id;
  return v_id;
end;
$$;

create function public.ja_grant_admin(p_user uuid, p_scopes text[], p_until timestamptz, p_reason text) returns uuid
language plpgsql security definer set search_path = pg_catalog as $$
declare v_id uuid;
begin
  if not ja_private.is_owner() or p_user = auth.uid() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if not exists(select 1 from public.profiles where user_id = p_user and status = 'active') then raise exception 'Invalid recipient' using errcode = '23514'; end if;
  insert into public.platform_role_assignments(user_id, role, scopes, granted_by, valid_until, reason)
    values (p_user, 'admin', p_scopes, auth.uid(), p_until, p_reason) returning id into v_id;
  return v_id;
end;
$$;
create function public.ja_revoke_admin(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = pg_catalog as $$
begin
  if not ja_private.is_owner() then raise exception 'Not authorized' using errcode = '42501'; end if;
  update public.platform_role_assignments set revoked_at = now(), revoked_by = auth.uid(), revocation_reason = p_reason
    where id = p_id and role = 'admin' and revoked_at is null;
  if not found then raise exception 'Assignment unavailable' using errcode = '22023'; end if;
end;
$$;
create function public.ja_create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = pg_catalog as $$
declare v_id uuid;
begin
  if not ja_private.platform_manager() then raise exception 'Not authorized' using errcode = '42501'; end if;
  insert into public.organizations(name, created_by) values (p_name, auth.uid()) returning id into v_id;
  return v_id;
end;
$$;
create function public.ja_invite_member(p_org uuid, p_user uuid, p_role text, p_reason text) returns uuid
language plpgsql security definer set search_path = pg_catalog as $$
declare v_id uuid;
begin
  if not ja_private.org_manager(p_org) or p_user = auth.uid()
    or (p_role = 'org_admin' and not ja_private.platform_manager()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  perform 1 from public.organizations where id = p_org and status = 'active' for share;
  if not found then raise exception 'Organization unavailable' using errcode = '23514'; end if;
  if not exists(select 1 from public.profiles where user_id = p_user and status = 'active') then raise exception 'Invalid recipient' using errcode = '23514'; end if;
  insert into public.organization_memberships(organization_id, user_id, role, granted_by, reason)
    values (p_org, p_user, p_role, auth.uid(), p_reason) returning id into v_id;
  return v_id;
end;
$$;
create function public.ja_accept_membership(p_id uuid) returns void
language plpgsql security definer set search_path = pg_catalog as $$
declare m public.organization_memberships;
begin
  if not ja_private.active_user() then raise exception 'Not authorized' using errcode = '42501'; end if;
  select * into m from public.organization_memberships where id = p_id and user_id = auth.uid() and status = 'invited' for update;
  if not found then raise exception 'Invitation unavailable' using errcode = '42501'; end if;
  perform 1 from public.organizations where id = m.organization_id and status = 'active' for share;
  if not found then raise exception 'Organization unavailable' using errcode = '23514'; end if;
  if m.role = 'org_admin' and coalesce(auth.jwt()->>'aal', '') <> 'aal2' then raise exception 'MFA required' using errcode = '42501'; end if;
  update public.organization_memberships set status = 'active', accepted_at = now() where id = m.id;
end;
$$;
create function public.ja_end_membership(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = pg_catalog as $$
declare m public.organization_memberships;
begin
  select * into m from public.organization_memberships where id = p_id for update;
  if not found or not ja_private.active_user() or (m.user_id <> auth.uid() and not ja_private.org_manager(m.organization_id)) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if m.status = 'ended' then raise exception 'Membership ended' using errcode = '22023'; end if;
  update public.care_relationships set status = 'ended', ended_at = now(), end_reason = p_reason
    where status <> 'ended' and (professional_membership_id = p_id or student_membership_id = p_id);
  update public.organization_memberships set status = 'ended', ended_at = now(), end_reason = p_reason where id = p_id;
end;
$$;
create function public.ja_request_care(p_org uuid, p_professional uuid, p_student uuid) returns uuid
language plpgsql security definer set search_path = pg_catalog as $$
declare v_id uuid; v_prof uuid; v_student uuid;
begin
  if not ja_private.active_user() or auth.uid() not in (p_professional, p_student) then raise exception 'Not authorized' using errcode = '42501'; end if;
  select id into v_prof from public.organization_memberships where organization_id = p_org and user_id = p_professional and role = 'professional' and status = 'active' for share;
  select id into v_student from public.organization_memberships where organization_id = p_org and user_id = p_student and role = 'student' and status = 'active' for share;
  insert into public.care_relationships(organization_id, professional_membership_id, student_membership_id,
    professional_user_id, student_user_id, requested_by, professional_accepted_at, student_accepted_at)
    values (p_org, v_prof, v_student, p_professional, p_student, auth.uid(),
      case when auth.uid() = p_professional then now() end, case when auth.uid() = p_student then now() end)
    returning id into v_id;
  return v_id;
end;
$$;
create function public.ja_accept_care(p_id uuid) returns void
language plpgsql security definer set search_path = pg_catalog as $$
declare c public.care_relationships;
begin
  if not ja_private.active_user() then raise exception 'Not authorized' using errcode = '42501'; end if;
  select * into c from public.care_relationships where id = p_id and status = 'pending' for update;
  if not found or auth.uid() not in (c.professional_user_id, c.student_user_id) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if auth.uid() = c.professional_user_id then c.professional_accepted_at := now(); else c.student_accepted_at := now(); end if;
  update public.care_relationships set professional_accepted_at = c.professional_accepted_at,
    student_accepted_at = c.student_accepted_at,
    status = case when c.professional_accepted_at is not null and c.student_accepted_at is not null then 'active' else 'pending' end,
    started_at = case when c.professional_accepted_at is not null and c.student_accepted_at is not null then now() end
    where id = p_id;
end;
$$;
create function public.ja_end_care(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = pg_catalog as $$
begin
  if not ja_private.active_user() then raise exception 'Not authorized' using errcode = '42501'; end if;
  update public.care_relationships set status = 'ended', ended_at = now(), end_reason = p_reason
    where id = p_id and status <> 'ended' and auth.uid() in (professional_user_id, student_user_id);
  if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
end;
$$;

-- Grants explícitos: nenhuma escrita direta exceto display_name do próprio perfil.
do $$
declare t text;
begin
  foreach t in array array['profiles','platform_role_assignments','organizations','organization_memberships','care_relationships','audit_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end;
$$;
grant usage on schema public to authenticated;
grant update(display_name) on public.profiles to authenticated;
create policy profile_read on public.profiles for select to authenticated
  using (user_id = auth.uid());
create policy profile_edit on public.profiles for update to authenticated
  using (user_id = auth.uid() and ja_private.active_user()) with check (user_id = auth.uid() and status = 'active');
create policy platform_assignment_read on public.platform_role_assignments for select to authenticated
  using (ja_private.active_user() and (user_id = auth.uid() or ja_private.is_owner()));
create policy organization_read on public.organizations for select to authenticated
  using (ja_private.org_member(id) or ja_private.org_manager(id) or (ja_private.active_user() and exists(
    select 1 from public.organization_memberships m where m.organization_id = public.organizations.id and m.user_id = auth.uid())));
create policy membership_read on public.organization_memberships for select to authenticated
  using (ja_private.active_user() and (user_id = auth.uid() or ja_private.org_manager(organization_id)));
create policy care_read on public.care_relationships for select to authenticated
  using (ja_private.active_user() and auth.uid() in (professional_user_id, student_user_id));
create policy audit_read on public.audit_events for select to authenticated
  using (ja_private.active_user() and (actor_user_id = auth.uid() or (ja_private.is_owner() and target_type <> 'care_relationships')));

-- Remove EXECUTE implícito de todas as funções desta entrega, inclusive sob defaults Supabase.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'ja_private' or (n.nspname = 'public' and p.proname in (
      'ja_grant_admin','ja_revoke_admin','ja_create_organization','ja_invite_member','ja_accept_membership',
      'ja_end_membership','ja_request_care','ja_accept_care','ja_end_care')) loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f.signature);
  end loop;
end;
$$;
grant execute on function ja_private.active_user(), ja_private.is_owner(), ja_private.platform_manager(),
  ja_private.org_member(uuid), ja_private.org_manager(uuid) to authenticated;
grant execute on function public.ja_grant_admin(uuid,text[],timestamptz,text), public.ja_revoke_admin(uuid,text),
  public.ja_create_organization(text), public.ja_invite_member(uuid,uuid,text,text), public.ja_accept_membership(uuid),
  public.ja_end_membership(uuid,text), public.ja_request_care(uuid,uuid,uuid), public.ja_accept_care(uuid), public.ja_end_care(uuid,text)
  to authenticated;

commit;
