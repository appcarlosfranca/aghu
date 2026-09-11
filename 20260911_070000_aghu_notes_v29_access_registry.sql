-- AGHU Notes v29
-- Correção da persistência de logins/acessos.
-- ADITIVO e idempotente. NÃO apaga notas existentes.

begin;

create table if not exists public.access_registry (
  id uuid primary key,
  email text not null,
  role text not null default 'user' check (role in ('admin','user')),
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists access_registry_email_lower_uidx
  on public.access_registry(lower(email));

alter table public.access_registry enable row level security;

-- Não há políticas de acesso direto pelo navegador:
-- o registro é administrado somente pela Edge Function com service role.

create or replace function public.sync_auth_user_access_registry()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.access_registry(id,email,role,active,created_at,updated_at)
  values(
    new.id,
    coalesce(new.email,''),
    'user',
    true,
    coalesce(new.created_at,now()),
    now()
  )
  on conflict(id) do update
    set email=excluded.email,
        updated_at=now();
  return new;
end;
$$;

drop trigger if exists trg_auth_user_access_registry on auth.users;
create trigger trg_auth_user_access_registry
after insert or update of email on auth.users
for each row execute function public.sync_auth_user_access_registry();

create or replace function public.sync_profile_access_registry()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.access_registry(id,email,role,active,created_at,updated_at)
  values(
    new.id,
    coalesce(new.email,''),
    new.role,
    new.active,
    coalesce(new.created_at,now()),
    now()
  )
  on conflict(id) do update
    set email=excluded.email,
        role=excluded.role,
        active=excluded.active,
        updated_at=now();
  return new;
end;
$$;

drop trigger if exists trg_profile_access_registry on public.profiles;
create trigger trg_profile_access_registry
after insert or update of email,role,active on public.profiles
for each row execute function public.sync_profile_access_registry();

-- Backfill dos usuários que já existem.
insert into public.access_registry(id,email,role,active,created_at,updated_at)
select
  u.id,
  coalesce(u.email,''),
  coalesce(p.role,'user'),
  coalesce(p.active,true),
  coalesce(u.created_at,now()),
  now()
from auth.users u
left join public.profiles p on p.id=u.id
on conflict(id) do update
  set email=excluded.email,
      role=excluded.role,
      active=excluded.active,
      updated_at=now();

-- Reaplica as proteções v28, caso ainda não tenham sido executadas.
alter table public.vault_records
  drop constraint if exists vault_records_user_id_fkey;

alter table public.vault_records
  add constraint vault_records_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete restrict;

create or replace function public.vault_delete_creator_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or auth.uid() <> old.user_id then
    raise exception 'Somente o login criador pode excluir este registro.'
      using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_vault_delete_creator_only on public.vault_records;
create trigger trg_vault_delete_creator_only
before delete on public.vault_records
for each row execute function public.vault_delete_creator_only();

drop policy if exists vault_delete_own_active on public.vault_records;
create policy vault_delete_own_active
on public.vault_records
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id=auth.uid()
      and p.active
  )
);

commit;
