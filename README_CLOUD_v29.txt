AGHU Notes CLOUD v29 — LOGIN ADMINISTRADOR CORRIGIDO

CAUSA
A conta tentada nas imagens (carlosjfranca07@gmail.com) ainda não existia no
Supabase Auth. Por isso o Supabase devolvia "Invalid login credentials".

CORREÇÃO APLICADA
- O backend Supabase foi atualizado para reconhecer carlosjfranca07@gmail.com
  como Administrador principal na criação inicial.
- No primeiro acesso pelo botão "Administrador", caso essa conta ainda não
  exista, ela é criada oficialmente no Supabase usando a senha digitada.
- Depois do primeiro acesso, a mesma conta e senha passam a funcionar também
  no login normal, em qualquer dispositivo.
- O login normal de clientes não cria contas automaticamente.
- Contas de clientes continuam sendo criadas pelo painel Administrador.

PRIMEIRO ACESSO
1. Publique todos os arquivos deste ZIP na raiz do GitHub.
2. Abra o aplicativo atualizado.
3. Clique em "Administrador".
4. Login: carlosjfranca07@gmail.com
5. Digite a senha que você deseja usar para a conta online.
6. Clique em "Entrar".
7. Depois disso, a conta ficará registrada no Supabase.

OBSERVAÇÃO
Se a conta já tiver sido criada antes, a senha não é redefinida automaticamente.
