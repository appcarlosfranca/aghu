AGHU Notes CLOUD v56

1. SESSÃO EXCLUSIVA
- Um login mantém apenas uma sessão ativa no aplicativo.
- Novo login substitui o anterior.
- Dispositivo anterior volta automaticamente ao login com:
  “Sua conta foi acessada em outro dispositivo”.
- Realtime + heartbeat + checagem de contingência.

2. VENDA AUTOMÁTICA PIX
- “Adquirir acesso — R$ 50,00” fora do login.
- Geração dinâmica de Pix por Edge Function.
- QR Code + Pix Copia e Cola.
- Verificação do pagamento pelo provedor.
- Webhook assinado.
- Link criptograficamente aleatório, expiração em 48h e uso único.
- Criação automática de login e senha pelo próprio comprador.
- Proteções contra duplicidade, reuso do token, alteração de valor e webhook repetido.

Nenhuma credencial privada foi incluída no GitHub.
Consulte PIX_CONFIGURACAO_v56.txt para cadastrar as credenciais do Mercado Pago/e-mail.
