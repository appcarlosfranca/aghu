AGHU Notes v18

ALTERAÇÕES:
1. Colar prontuário:
   - cola como texto simples;
   - remove linhas em branco duplicadas;
   - usa espaçamento simples no editor.

2. Barra H1/H2/Aa/B:
   - fica fixa enquanto o texto é rolado.

3. Celular/janela estreita:
   - quando a área de Notas tem até 760 px, aparece SOMENTE o nome do paciente;
   - Local, Idade, Prontuário, Data, EDIT e ações ficam ocultos;
   - tocar no nome abre diretamente a nota.

4. Contadores:
   - execute supabase_v18_contadores.sql uma vez;
   - o app passa a ler os números diretamente da tabela app_counters;
   - mantém RPC como fallback;
   - atualiza a cada 5 segundos e ao voltar para o app.

5. Calculadora:
   - local, sem conexão;
   - disponível no menu lateral e também dentro do editor.

PUBLICAÇÃO:
- primeiro execute o SQL v18;
- depois substitua TODOS os arquivos no GitHub;
- recarregue o site uma vez para ativar o cache v18.
