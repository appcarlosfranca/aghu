AGHU Notes SUPABASE v28 — acessos corrigidos + preservação de notas

CORRIGIDO
- Cadastro de logins/acessos pelo Administrador.
- Edge Function modernizada para @supabase/server.
- JWT da sessão administrativa enviado explicitamente.
- Senha mínima de novo acesso: 6 caracteres.
- Mensagens de erro/sucesso melhoradas.
- Removida a função administrativa de excluir usuário.

PROTEÇÃO DAS NOTAS
- Somente o login criador pode excluir os próprios registros.
- RLS mantém isolamento total por usuário.
- Trigger bloqueia DELETE quando auth.uid() não é o proprietário.
- FK usa ON DELETE RESTRICT, evitando exclusão em cascata.
- Atualizar o código do GitHub não apaga o banco.
- O Service Worker não limpa IndexedDB.
- A migração v28 é aditiva: sem DELETE, TRUNCATE ou DROP TABLE.

PARA ATUALIZAR QUEM JÁ ESTÁ NA v27
1. Supabase > SQL Editor:
   execute SUPABASE_PATCH_v28.sql.

2. Supabase > Edge Functions > admin-users > Code:
   substitua todo o código pelo arquivo EDGE_FUNCTION_admin-users_v28.ts
   e clique em Deploy updates.

3. Supabase > Edge Functions > admin-users > Settings:
   deixe Verify JWT ATIVADO.

4. Publique no GitHub Pages todo o conteúdo deste pacote v28.

As notas existentes permanecem intactas.
