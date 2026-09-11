AGHU Notes LOCAL v21 — versão pré-Supabase

Esta versão mantém o mesmo código-base visual e funcional da linha atual,
mas NÃO possui integração, autenticação ou sincronização com Supabase.

ARMAZENAMENTO
- notas: IndexedDB/local do navegador;
- etiquetas e histórico: armazenamento local;
- imagens/desenhos: IndexedDB local;
- contadores: locais deste aparelho;
- login: local deste navegador/aparelho.

LOGIN LOCAL
- no primeiro acesso, informe um e-mail e uma senha (mínimo 4 caracteres);
- esse primeiro login vira a credencial LOCAL do aparelho;
- nos acessos seguintes, a sessão permanece salva;
- não há cadastro na internet.

IMPORTANTE
- os dados NÃO sincronizam entre celular, tablet e computador;
- limpar "dados do site/aplicativo" no navegador pode apagar as notas locais;
- desinstalar o PWA e apagar os dados do navegador pode remover a base local;
- nenhuma configuração SQL ou Supabase é necessária.

PUBLICAÇÃO NO GITHUB
- pode hospedar normalmente no GitHub Pages;
- envie TODOS os arquivos deste pacote;
- o GitHub hospeda apenas o código; as notas continuam salvas exclusivamente
  no navegador/aparelho de cada usuário.
