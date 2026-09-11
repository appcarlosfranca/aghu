AGHU Notes SUPABASE v31 — cadastro 100% pelo Administrador do AGHU Notes

REGRA PRINCIPAL
Depois que a estrutura Supabase/Edge Function estiver instalada, NÃO é necessário
criar clientes manualmente em Authentication > Users.

Todos os novos acessos são criados assim:
AGHU Notes > Administrador > Usuários e acessos > Criar novo acesso

O Administrador informa:
- Login/e-mail
- Senha

Ao clicar em "Criar acesso", o AGHU Notes faz automaticamente:
1. criação do usuário no Supabase Auth;
2. criação/atualização do profile;
3. gravação no access_registry;
4. sincronização da lista de contas;
5. espelho local do acesso confirmado.

Se uma tentativa anterior já tiver criado o Auth user, o sistema reconcilia pelo e-mail
e não cria duplicidade.

IMPORTANTE
- Não use o Dashboard do Supabase para cadastrar clientes.
- O Dashboard continua sendo apenas infraestrutura/backend.
- A única conta que precisou ser promovida manualmente foi o Administrador inicial.
- Depois disso, o fluxo normal de novos usuários fica inteiramente dentro do AGHU Notes.
- Senhas não são armazenadas em texto puro no cache local.
- Notas existentes continuam preservadas.
- Somente o login criador pode excluir suas próprias notas.

ATUALIZAÇÃO
Se você já executou SUPABASE_PATCH_v30.sql e publicou a Edge Function v30,
não precisa alterar o banco novamente para esta v31.
Basta publicar os arquivos da v31 no GitHub Pages.

Se ainda não executou a configuração v30:
- execute SUPABASE_PATCH_v31.sql no SQL Editor;
- publique EDGE_FUNCTION_admin-users_v31.ts em Edge Functions > admin-users;
- mantenha "Verify JWT with legacy secret" DESATIVADO.
