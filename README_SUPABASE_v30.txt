AGHU Notes SUPABASE v30 — correção definitiva da persistência de acessos

O problema corrigido:
- A tentativa de criar login podia chegar ao Supabase Auth, mas a resposta da
  Edge Function não voltar no formato esperado.
- A interface então dizia que o Supabase não confirmou o acesso e o login
  desaparecia da lista.

Na v30:
- criação é idempotente: CREATE OR RECONCILE;
- se a conta já tiver sido criada numa tentativa anterior, ela é encontrada
  pelo e-mail e reaproveitada;
- o backend reconcilia Auth + profiles + access_registry;
- a UI, se não receber o usuário na primeira resposta, consulta a lista
  automaticamente até confirmar pelo e-mail;
- acessos confirmados também ficam espelhados no localStorage, sem armazenar senha;
- a lista nunca descarta um acesso confirmado só por atraso de sincronização.

ATUALIZAÇÃO A PARTIR DA v29

1) Supabase > SQL Editor
   Execute: SUPABASE_PATCH_v30.sql

2) Supabase > Edge Functions > admin-users > Code
   Substitua TODO o código pelo arquivo:
   EDGE_FUNCTION_admin-users_v30.ts
   Clique em Deploy updates.

3) Edge Functions > admin-users > Settings
   DEIXE "Verify JWT with legacy secret" DESATIVADO.
   A própria função valida o token usando auth.getUser().

4) Publique todos os arquivos da v30 no GitHub Pages.

Esta atualização NÃO apaga notas.
Somente o login criador continua podendo excluir as próprias notas.
