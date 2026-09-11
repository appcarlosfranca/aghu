AGHU Notes SUPABASE v29 — Persistência definitiva de acessos

CORRIGIDO
- Novo login só é considerado salvo quando o Supabase Auth confirma a criação.
- Cada acesso criado também é registrado em public.access_registry.
- access_registry é sincronizado por triggers com auth.users e public.profiles.
- A lista do Administrador é reconciliada automaticamente com os usuários do Auth.
- O navegador mantém um espelho local dos acessos em localStorage.
- Se a listagem remota atrasar ou falhar temporariamente, os acessos já confirmados
  continuam visíveis pelo cache local.
- Senhas NÃO são gravadas em texto puro no cache local.

IMPORTANTE — PARA ATUALIZAR DA v28
1. Supabase > SQL Editor:
   execute SUPABASE_PATCH_v29.sql.

2. Supabase > Edge Functions > admin-users > Code:
   substitua TODO o código pelo arquivo EDGE_FUNCTION_admin-users_v29.ts
   e clique em Deploy updates.

3. Edge Functions > admin-users > Settings:
   DEIXE "Verify JWT with legacy secret" DESATIVADO.
   A função v29 valida o token do Administrador internamente usando auth.getUser().

4. Publique no GitHub Pages todo o conteúdo da v29.

NOTAS
- Esta atualização NÃO apaga notas.
- Supabase continua sendo a fonte canônica das notas.
- Service Worker não limpa IndexedDB/localStorage.
- Somente o login criador pode excluir as próprias notas.
- O Administrador pode criar, bloquear/ativar acessos, mas não apagar notas de usuários.
