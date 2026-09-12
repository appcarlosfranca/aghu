AGHU Notes CLOUD v49

Persistência:
- Contas, senhas e notas permanecem no Supabase quando o código do GitHub é atualizado.
- O cache local mantém o mesmo banco IndexedDB AGHUNotesLocal.
- O Administrador não pode excluir contas nem redefinir senhas, evitando perda das notas criptografadas.
- Somente o criador/proprietário pode excluir a própria nota.

Compartilhamento:
- Menu da nota > Compartilhar > digite somente o login da outra conta.
- A nota é compartilhada como cópia criptografada usando AES-GCM + RSA-OAEP.
- O destinatário vê em Compartilhadas e pode copiar para suas próprias notas.
- A conta destinatária precisa acessar a v49 ao menos uma vez para gerar sua chave pública.
- Se o autor editar a nota depois, compartilhar novamente atualiza a cópia compartilhada.
