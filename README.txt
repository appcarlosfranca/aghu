AGHU Notes v20 — correção definitiva do contador

CAUSA:
Na v19, o bloco HTML do contador era carregado DEPOIS do JavaScript principal.
Quando o app iniciava, accessCount e notesCreatedCount ainda não existiam no DOM,
então as referências ficavam null. Por isso a caixa aparecia, mas mostrava “—”.

CORREÇÃO:
- o contador agora fica antes do JavaScript principal;
- os elementos são procurados novamente por ID em cada atualização;
- valor inicial = 0, nunca “—”;
- atualização no bootstrap, DOMContentLoaded, load, foco, retorno à aba
  e atualização periódica;
- cache PWA atualizado para v20.

SUPABASE:
Se o SQL v18/v17 já foi executado e o SQL Editor mostra os valores corretos,
não execute nenhum SQL novo.

PUBLICAÇÃO:
1. Substitua TODOS os arquivos no GitHub pelos deste pacote.
2. Aguarde o GitHub Pages publicar.
3. Faça Ctrl+F5 no computador.
4. No celular/PWA, feche completamente e abra novamente.
