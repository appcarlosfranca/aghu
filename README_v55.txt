AGHU Notes CLOUD v55 — AJUSTES CIRÚRGICOS

1. Tema
- Primeiro acesso: Branco.
- Depois, cada usuário mantém a própria escolha de tema.

2. Google Docs
- E-mail da Conta Google separado do OAuth Client ID.
- O Client ID técnico deixa de ser confundido com e-mail.
- Suporte a GOOGLE_CLIENT_ID no APP_CONFIG.
- Login hint da Conta Google aplicado no OAuth.
- Se a versão anterior salvou um e-mail no campo Client ID, a v55 corrige esse dado automaticamente.

3. Cor do bloco
- A cor individual da borda é preservada localmente e sincronizada no patient_meta.
- Rascunhos pendentes passam a receber a mesma cor para não sobrescrevê-la depois.

4. Compartilhamento
- Gravação passou para RPC atômica save_note_share.
- Removida a dependência de .single() que gerava “Cannot coerce the result to a single JSON object”.
- Destinatário continua sendo informado somente por login/e-mail.

Nenhuma outra função/layout foi removida ou alterada.
