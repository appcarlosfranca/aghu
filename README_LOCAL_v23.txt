AGHU Notes LOCAL v23 — Google Docs automático + criptografia local + menu da nota

1. GOOGLE DOCS
- O botão Google Docs NÃO abre mais docs.new nem nova aba.
- Ele abre apenas a configuração/autorização Google dentro do app.
- Depois de conectar a conta, cada salvamento pode criar/atualizar automaticamente
  um Google Docs correspondente dentro da pasta "AGHU Notes" no Google Drive.
- A mesma nota usa o mesmo documentId, evitando cópias duplicadas.
- O conteúdo textual da nota é copiado para o Google Docs.
- Para ativar, é necessário um Google OAuth Client ID do tipo Web Application.
- Escopos usados: drive.file e documents.
- Como esta versão é estática (GitHub Pages, sem backend), a autorização Google
  pode precisar ser renovada quando o token da sessão expirar.

2. CRIPTOGRAFIA
- O código HTML/JS do site não pode ser criptografado/oculto de forma real:
  o navegador precisa recebê-lo para executar.
- Os DADOS do usuário são criptografados em repouso com AES-GCM.
- A chave é derivada da senha com PBKDF2 e fica apenas em memória durante a sessão.
- Notas, etiquetas, metadados, histórico, anexos e imagens são protegidos.
- Cache e rascunhos secundários também passam a ser gravados criptografados.
- Registros antigos em texto claro são migrados para formato criptografado
  após login bem-sucedido do respectivo usuário.
- A senha em si não é armazenada em texto claro. O Administrador vê senhas novas
  porque elas são guardadas criptografadas sob a chave administrativa.

3. MENU DA NOTA
As ações ficam dentro de "☰ Menu":
- Fixar
- Arquivar
- Duplicar
- Compartilhar
- Desenho
- Google Docs
- Calculadora
- Histórico
- Excluir

4. IMPORTANTE
- Esta continua sendo a versão SEM Supabase.
- O Google Docs é uma integração externa opcional.
- Sem Google conectado, todas as funções locais continuam operando.
