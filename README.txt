AGHU Notes v16 — correção do ícone e contador de notas

1) CONTADOR
Antes de publicar, execute UMA VEZ no Supabase > SQL Editor:
supabase_v16_contadores_corrigidos.sql

A v16 usa um registro permanente (note_creation_log) para cada nota criada.
Esse registro não é apagado quando a nota é excluída. Assim, o contador
histórico de notas não depende mais apenas da tabela notes.

2) ÍCONE NO ANDROID
Esta versão usa caminhos absolutos do seu endereço atual:
https://appcarlosfranca.github.io/aghu/

Arquivos padrão adicionados:
favicon.ico
favicon-96-v16.png
icon-192-v16.png
icon-512-v16.png
maskable-192-v16.png
maskable-512-v16.png
apple-touch-icon-v16.png

3) PUBLICAÇÃO
Envie TODOS os arquivos desta pasta para a raiz do repositório "aghu".
Não envie somente index.html.

Depois:
- aguarde o GitHub Pages publicar;
- abra https://appcarlosfranca.github.io/aghu/ no Chrome;
- recarregue uma vez;
- APAGUE o atalho antigo da tela inicial;
- crie um NOVO atalho.

Mesmo que o Android crie apenas um atalho do Chrome (com a pequena marca do
Chrome), ele deverá usar o ícone AGHU Notes em vez da letra cinza genérica.

Se o menu oferecer "Instalar app", prefira essa opção.
