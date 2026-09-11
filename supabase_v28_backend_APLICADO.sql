-- AGHU Notes CLOUD v28 — referência do backend já aplicado
-- Projeto: aufujiafalafuncsbjzu

create extension if not exists pgcrypto;

-- Tabela central de perfis/acessos
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login text not null unique,
  auth_email text not null,
  role text not null default 'user' check (role in ('admin','user')),
  crypto_salt text not null default encode(gen_random_bytes(16),'base64'),
  first_access_done boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- O backend ativo também contém:
-- public.is_admin()
-- public.is_active_user()
-- public.mark_first_access()
-- public.admin_activate_user(uuid,text)
-- public.admin_set_user_active(uuid,boolean)
-- public.admin_reset_user_password(uuid,text)
-- public.admin_delete_user(uuid)
-- trigger public.handle_new_aghu_user() em auth.users
-- trigger public.confirm_aghu_provisioned_user() em auth.users
-- RLS por auth.uid() e conta ativa nas tabelas notes/labels/note_labels/note_versions/attachments
-- Storage note-images privado com políticas por /<uid>/...
-- Realtime: notes, labels, note_labels, note_versions, attachments

-- Observação: este arquivo é de referência/documentação. As migrations já foram aplicadas.
