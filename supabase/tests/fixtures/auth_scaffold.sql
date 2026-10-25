-- SOMENTE PostgreSQL descartável. Não executar em projeto Supabase existente.
-- Contrato mínimo do Auth para testar SQL/RLS, não uma implementação do Auth.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'
);
create table auth.mfa_factors (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  factor_type text not null,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;

-- Simula defaults amplos do Supabase: a migração deve removê-los de seus objetos.
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
