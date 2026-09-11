-- AGHU Notes v28
-- Proteção aditiva. NÃO apaga notas existentes.

begin;

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
    where p.id = auth.uid()
      and p.active
  )
);

commit;
