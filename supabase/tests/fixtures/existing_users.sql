-- Identidades sintéticas sem e-mail, senha ou dados clínicos, anteriores à migração.
insert into auth.users(id, email_confirmed_at, raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000001', now(), '{"role":"owner"}'),
 ('00000000-0000-4000-8000-000000000009', now(), '{"role":"admin"}');
