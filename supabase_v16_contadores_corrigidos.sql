-- AGHU Notes v16 — correção robusta dos contadores
-- Execute UMA VEZ no SQL Editor do Supabase.
-- Pode executar novamente sem apagar notas.

create extension if not exists pgcrypto;

create table if not exists public.app_counters (
  id smallint primary key default 1 check (id = 1),
  access_count bigint not null default 0,
  notes_created_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.app_counters (id, access_count, notes_created_count)
values (1, 0, (select count(*)::bigint from public.notes))
on conflict (id) do nothing;

-- Registro permanente de cada nota criada.
-- NÃO possui FK para notes, justamente para o histórico sobreviver
-- quando uma nota for excluída definitivamente.
create table if not exists public.note_creation_log (
  note_id uuid primary key,
  user_id uuid,
  created_at timestamptz not null default now()
);

-- Recupera todas as notas que ainda existem atualmente.
insert into public.note_creation_log (note_id, user_id, created_at)
select id, user_id, created_at
from public.notes
on conflict (note_id) do nothing;

-- Se a v15 já tinha um número maior (por notas posteriormente apagadas),
-- ele é preservado. Caso contrário, corrige pelo log/quantidade atual.
update public.app_counters
set notes_created_count = greatest(
      notes_created_count,
      (select count(*)::bigint from public.note_creation_log),
      (select count(*)::bigint from public.notes)
    ),
    updated_at = now()
where id = 1;

alter table public.app_counters enable row level security;
alter table public.note_creation_log enable row level security;

revoke all on table public.app_counters from anon, authenticated;
revoke all on table public.note_creation_log from anon, authenticated;

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
  select
    c.access_count,
    greatest(
      c.notes_created_count,
      (select count(*)::bigint from public.note_creation_log)
    ) as notes_created_count
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
  select
    c.access_count,
    greatest(
      c.notes_created_count,
      (select count(*)::bigint from public.note_creation_log)
    ) as notes_created_count
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
declare
  inserted_rows integer := 0;
begin
  insert into public.note_creation_log (note_id, user_id, created_at)
  values (new.id, new.user_id, coalesce(new.created_at, now()))
  on conflict (note_id) do nothing;

  get diagnostics inserted_rows = row_count;

  if inserted_rows > 0 then
    update public.app_counters
    set notes_created_count = app_counters.notes_created_count + 1,
        updated_at = now()
    where id = 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_count_note_created on public.notes;

create trigger trg_count_note_created
after insert on public.notes
for each row
execute function public.count_note_created();

-- Conferência final.
select
  c.access_count,
  c.notes_created_count as contador_gravado,
  (select count(*) from public.note_creation_log) as notas_registradas_no_log,
  greatest(
    c.notes_created_count,
    (select count(*)::bigint from public.note_creation_log)
  ) as notas_exibidas
from public.app_counters c
where c.id = 1;
