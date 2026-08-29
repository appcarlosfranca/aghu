-- AGHU Notes v11 — metadados manuais do paciente
-- Execute UMA VEZ no SQL Editor do Supabase.
-- Não apaga nenhuma nota existente.

alter table public.notes
  add column if not exists patient_meta jsonb not null default '{}'::jsonb;
