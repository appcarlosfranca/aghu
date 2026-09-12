AGHU Notes CLOUD v53 — correção cirúrgica de responsividade/login

Correção única:
- Em tablet/celular, a regra responsiva #appShell { display:block!important } estava vencendo .hidden.
- Isso fazia o aplicativo/sidebar aparecer por trás da tela de login e podia manter o aviso da Campanha JK junto da interface.
- Agora o estado hidden sempre prevalece, sem alterar temas, notas, compartilhamento, menus, cores, filtros ou demais funções da v52.
