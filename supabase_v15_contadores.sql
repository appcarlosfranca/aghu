-- AGHU Notes v15 — contadores globais
-- Execute UMA VEZ no SQL Editor do Supabase.
-- É seguro executar novamente e não apaga dados.

create table if not exists public.app_counters (
  id smallint primary key default 1 check (id = 1),
  access_count bigint not null default 0,
  notes_created_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.app_counters (id, access_count, notes_created_count)
values (1, 0, (select count(*)::bigint from public.notes))
on conflict (id) do nothing;

alter table public.app_counters enable row level security;
revoke all on table public.app_counters from anon, authenticated;

create or replace function public.increment_app_access()
returns table(access_count bigint, notes_created_count bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.app_counters
  set access_count = app_counters.access_count + 1,
      updated_at = now()
  where id = 1;

  return query
  select c.access_count, c.notes_created_count
  from public.app_counters c
  where c.id = 1;
end;
$$;

create or replace function public.get_app_counters()
returns table(access_count bigint, notes_created_count bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select c.access_count, c.notes_created_count
  from public.app_counters c
  where c.id = 1;
$$;

grant execute on function public.increment_app_access() to anon, authenticated;
grant execute on function public.get_app_counters() to anon, authenticated;

create or replace function public.count_note_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.app_counters
  set notes_created_count = app_counters.notes_created_count + 1,
      updated_at = now()
  where id = 1;
  return new;
end;
$$;

drop trigger if exists trg_count_note_created on public.notes;

create trigger trg_count_note_created
after insert on public.notes
for each row
execute function public.count_note_created();

select access_count, notes_created_count, updated_at
from public.app_counters
where id = 1;
