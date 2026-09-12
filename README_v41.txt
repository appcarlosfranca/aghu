AGHU Notes CLOUD v41 — Google Docs OAuth

CORREÇÃO
- Detecta quando o aplicativo é aberto por file:// e bloqueia a tentativa OAuth com uma explicação clara.
- Exibe a origem atual que precisa ser cadastrada no Google Cloud.
- Valida o formato do OAuth Client ID.
- Mantém o fluxo oficial Google Identity Services em popup.
- Melhora mensagens para pop-up bloqueado/fechado.
- Informa a necessidade de habilitar Google Drive API e Google Docs API.

PARA O GITHUB PAGES
Origem JavaScript autorizada esperada:
https://appcarlosfranca.github.io

O caminho /aghu/ NÃO entra no campo "Origem JavaScript autorizada"; apenas protocolo + domínio.

TESTE LOCAL
Não abra index.html diretamente pelo Explorador/Downloads para testar Google OAuth.
Para desenvolvimento local use localhost e cadastre a origem correspondente no Google Cloud.

O restante da v40 foi preservado.
