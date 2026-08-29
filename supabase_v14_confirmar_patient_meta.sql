-- AGHU Notes v14 — correção definitiva dos metadados manuais
-- Execute UMA VEZ no SQL Editor do Supabase.
-- É seguro executar novamente: não apaga nenhuma nota.

alter table public.notes
  add column if not exists patient_meta jsonb not null default '{}'::jsonb;

-- Confirma a coluna criada:
select column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name='notes'
  and column_name='patient_meta';
