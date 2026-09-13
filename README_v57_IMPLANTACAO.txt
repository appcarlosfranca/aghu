AGHU NOTES CLOUD v57 — IMPLANTAÇÃO SEGURA

PROJETO SUPABASE CORRETO
Project ref: imwwqdgovfxhntsdkxlz
Project URL: https://imwwqdgovfxhntsdkxlz.supabase.co

O QUE ESTA VERSÃO PRESERVA
- O schema real já existente: public.profiles + public.vault_records.
- As notas, versões e anexos já criptografados.
- Compatibilidade com os registros AES-GCM antigos (PBKDF2 180.000 iterações).
- Compatibilidade com cache local legado AGHUENC1 de 210.000 iterações.
- Temas, responsividade, Google Docs, compartilhamento, PWA, autosave, lixeira e demais recursos atuais.

ORDEM DE IMPLANTAÇÃO
1. No projeto imwwqdgovfxhntsdkxlz, execute a migração:
   supabase/migrations/20260913_aghu_notes_v57_vault_session_pix.sql

2. Implante as Edge Functions:
   - admin-users
   - pix-create
   - pix-status
   - pix-webhook
   - activate-account

3. Confirme no projeto os secrets já configurados:
   - MP_ACCESS_TOKEN
   - MP_WEBHOOK_SECRET
   - APP_BASE_URL=https://appcarlosfranca.github.io/aghu/

   Para envio automático do link por e-mail, acrescente:
   - RESEND_API_KEY
   - RESEND_FROM_EMAIL

4. Mercado Pago > Webhooks:
   ALTERE o endereço antigo para:
   https://imwwqdgovfxhntsdkxlz.supabase.co/functions/v1/pix-webhook

   Para este fluxo /v1/payments por Pix, mantenha o evento de pagamentos correspondente.

5. Somente depois de banco + funções estarem implantados, publique os arquivos da RAIZ
   no GitHub Pages.

6. Teste:
   - login de conta existente e leitura das notas antigas;
   - criar/editar nota e conferir sincronização em outro aparelho;
   - sessão exclusiva em dois dispositivos;
   - compartilhar nota para outro login;
   - gerar Pix;
   - confirmar Pix;
   - usar o link uma única vez para criar uma conta.

7. A chave Secret API key antiga chamada "default" só deve ser revogada depois
   desses testes. As novas Edge Functions usam explicitamente a chave nomeada
   "aghu_backend_v2" por SUPABASE_SECRET_KEYS.

SEGURANÇA
- Nenhuma sb_secret_* foi colocada no HTML, GitHub ou neste pacote.
- MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET permanecem somente no ambiente das Edge Functions.
- O Administrador não possui função de apagar notas dos usuários.
- A migração é aditiva e não contém DELETE/TRUNCATE de vault_records.
