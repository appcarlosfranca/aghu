-- AGHU Notes v30
-- Reforço idempotente da persistência dos acessos.
-- NÃO apaga notas e NÃO remove usuários.

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

-- Sincroniza Auth -> access_registry.
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
    coalesce((select p.role from public.profiles p where p.id=new.id),'user'),
    coalesce((select p.active from public.profiles p where p.id=new.id),true),
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

-- Sincroniza profiles -> access_registry.
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

-- Garante que todo usuário Auth atual tenha profile.
insert into public.profiles(id,email)
select u.id,u.email
from auth.users u
where not exists(select 1 from public.profiles p where p.id=u.id)
on conflict(id) do nothing;

-- Backfill/Reconcilição imediata.
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

commit;
