AGHU Notes CLOUD v28

- GitHub Pages hospeda o app.
- Supabase Auth centraliza login/senha.
- Mesmo login em tablet, computador ou celular acessa a mesma base.
- Realtime + atualização periódica sincronizam notas.
- RLS separa usuários.
- Título, conteúdo, patient_meta, idade/POL, etiquetas, versões e nomes de arquivos são criptografados no navegador com AES-GCM antes do envio.
- Imagens/anexos também são criptografados antes do upload para o bucket privado.
- A chave deriva da senha com PBKDF2; não é enviada ao Supabase.
- Após recarregar a página, a senha é solicitada novamente para reconstruir a chave.
- Administrador online cria, bloqueia, redefine senha e exclui acessos.
- Confetes dourados/neon usam o primeiro acesso central salvo no Supabase.

O backend Supabase do projeto já recebeu as migrations v28 (profiles/RLS/Storage privado/Realtime/RPCs administrativos).
