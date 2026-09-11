AGHU Notes CLOUD v31

AJUSTES DESTA VERSÃO

1. MENU INTERNO DA NOTA
- Corrigido conflito visual entre o menu de ações e a barra rich text.
- O menu agora é renderizado como camada flutuante independente (portal).
- Possui z-index próprio, reposicionamento automático e não fica preso/clippado
  pelo editor ou pela toolbar.
- Reposiciona ao redimensionar e ao rolar a tela.
- Em telas pequenas respeita as bordas da viewport e ganha rolagem interna.

2. RESPONSIVIDADE GLOBAL
- Layout fluido para celular, tablet, notebook e desktop.
- Topbar, busca, filtros, editor, toolbar, diálogos, imagens e cartões passam a
  respeitar 100% da largura disponível.
- Sidebar passa a funcionar como painel sobreposto em telas menores.
- Toolbar de texto reorganiza seus grupos sem provocar estouro horizontal.
- Imagens e conteúdo colado dentro das notas são limitados à largura do editor.
- Tabelas largas rolam dentro do próprio componente, sem quebrar a página.
- Modo Janelas muda progressivamente de várias colunas para 2 e depois 1 coluna.

3. PERÍMETRO NEON ANIMADO
- A cor de contorno escolhida para cada nota continua funcionando.
- Agora um traço luminoso percorre continuamente todo o perímetro de cada cartão.
- A animação utiliza a própria cor configurada da nota.
- Cor padrão permanece preto/grafite, com realce móvel claro para ser visível.
- Nota selecionada ganha movimento um pouco mais evidente.
- "Reduzir movimento" do sistema é respeitado.

Todo o restante da v30 foi preservado: Supabase, autenticação online, sincronização,
criptografia, Google Docs, imagens rápidas, Administrador, Campanha JK e PWA.
