AGHU Notes v19 — correção visual final

ALTERAÇÕES:
- Nome do paciente agora é sempre preto (#111), igual às demais informações.
- O contador "Acessos • Notas" fica fixo e visível no canto inferior esquerdo
  da página do GitHub/PWA, inclusive no modo Primeiro plano.
- O contador ganha fundo branco discreto e contraste suficiente para leitura.
- Há atualização automática ao iniciar, ao renderizar a lista, ao retornar
  para a aba e periodicamente.

SUPABASE:
- Não há nova migração obrigatória se o SQL v18 já foi executado.
- Se ainda não executou, use supabase_v19_contadores.sql uma vez.

PUBLICAÇÃO:
- substitua TODOS os arquivos do GitHub pelos deste pacote;
- aguarde o Pages publicar;
- recarregue a página com Ctrl+F5 no computador;
- no celular/PWA, feche e abra novamente.
