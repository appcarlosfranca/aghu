AGHU Notes SUPABASE v27 — sincronização criptografada

Projeto: imwwqdgovfxhntsdkxlz
URL: https://imwwqdgovfxhntsdkxlz.supabase.co
A publishable key já está no index.html.

NÃO coloque no index:
- senha do banco PostgreSQL;
- connection string com senha;
- service_role key.

PASSO A PASSO

1) Banco
No terminal, dentro da pasta deste pacote:
  supabase login
  supabase link --project-ref imwwqdgovfxhntsdkxlz
  supabase db push

Alternativa: copie SUPABASE_MIGRATION_v27.sql para o SQL Editor do Supabase e clique Run.

2) Função administrativa
  supabase functions deploy admin-users --project-ref imwwqdgovfxhntsdkxlz

3) Primeiro Administrador
No painel Supabase:
  Authentication > Users > Add user
Crie o seu e-mail/senha de Administrador.

Depois abra PROMOVER_PRIMEIRO_ADMIN.sql, troque
SEU_EMAIL_ADMIN@gmail.com pelo e-mail criado e execute no SQL Editor.

4) GitHub Pages
Substitua TODOS os arquivos do repositório pelos arquivos desta versão.

ARQUITETURA DE SEGURANÇA
- Supabase Auth autentica cada conta.
- RLS isola usuário por usuário.
- Notas, conteúdo, nome/idade/prontuário, etiquetas e histórico são
  criptografados no navegador com AES-GCM antes de subir.
- Supabase recebe ciphertext em vault_records.payload.
- Imagens são criptografadas antes do Storage.
- A chave criptográfica é derivada da senha no primeiro login do aparelho.
- Uma CryptoKey não exportável é lembrada no IndexedDB para não pedir senha a cada F5.
- Em outro aparelho, é necessário fazer login ao menos uma vez.
- Rascunhos locais continuam protegendo contra queda de internet.

MIGRAÇÃO DA v26
No mesmo navegador, se existir conta local v26 com o mesmo e-mail e senha,
o primeiro login da v27 tenta migrar automaticamente notas, etiquetas,
histórico e imagens para a nova conta Supabase, recriptografando tudo.

ADMIN
O Supabase Auth não fornece senhas em texto claro. O painel mostra "Protegida".
Por segurança, a redefinição direta de senha fica bloqueada para contas que já
tenham conteúdo criptografado. Isso evita tornar notas antigas ilegíveis.
