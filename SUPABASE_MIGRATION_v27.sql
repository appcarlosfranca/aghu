create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('admin','user')),
  active boolean not null default true,
  first_access_done boolean not null default false,
  encryption_salt text not null default encode(gen_random_bytes(16),'base64'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  insert into public.profiles(id,email)
  values(new.id,new.email)
  on conflict(id) do update set email=excluded.email,updated_at=now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles(id,email)
select id,email from auth.users
on conflict(id) do update set email=excluded.email;

create table if not exists public.vault_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('notes','labels','note_labels','note_versions','attachments')),
  record_id uuid not null,
  note_id uuid,
  ref_id uuid,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,kind,record_id)
);

create index if not exists vault_records_user_kind_idx on public.vault_records(user_id,kind);
create index if not exists vault_records_user_note_idx on public.vault_records(user_id,note_id);
create index if not exists vault_records_user_ref_idx on public.vault_records(user_id,ref_id);

alter table public.profiles enable row level security;
alter table public.vault_records enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select to authenticated
using(id=auth.uid());

drop policy if exists vault_select_own_active on public.vault_records;
create policy vault_select_own_active
on public.vault_records for select to authenticated
using(
  user_id=auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.active)
);

drop policy if exists vault_insert_own_active on public.vault_records;
create policy vault_insert_own_active
on public.vault_records for insert to authenticated
with check(
  user_id=auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.active)
);

drop policy if exists vault_update_own_active on public.vault_records;
create policy vault_update_own_active
on public.vault_records for update to authenticated
using(
  user_id=auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.active)
)
with check(
  user_id=auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.active)
);

drop policy if exists vault_delete_own_active on public.vault_records;
create policy vault_delete_own_active
on public.vault_records for delete to authenticated
using(
  user_id=auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.active)
);

create or replace function public.mark_first_access()
returns void
language sql
security definer
set search_path=public,pg_temp
as $$
  update public.profiles
  set first_access_done=true,updated_at=now()
  where id=auth.uid();
$$;
grant execute on function public.mark_first_access() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit)
values('note-images','note-images',false,20971520)
on conflict(id) do update set public=false,file_size_limit=20971520;

drop policy if exists note_images_select_own on storage.objects;
create policy note_images_select_own
on storage.objects for select to authenticated
using(
  bucket_id='note-images'
  and (storage.foldername(name))[1]=auth.uid()::text
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.active)
);

drop policy if exists note_images_insert_own on storage.objects;
create policy note_images_insert_own
on storage.objects for insert to authenticated
with check(
  bucket_id='note-images'
  and (storage.foldername(name))[1]=auth.uid()::text
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.active)
);

drop policy if exists note_images_update_own on storage.objects;
create policy note_images_update_own
on storage.objects for update to authenticated
using(bucket_id='note-images' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='note-images' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists note_images_delete_own on storage.objects;
create policy note_images_delete_own
on storage.objects for delete to authenticated
using(bucket_id='note-images' and (storage.foldername(name))[1]=auth.uid()::text);
