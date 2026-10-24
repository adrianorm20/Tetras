Atue como um Engenheiro de Software Senior especialista em Next.js (App Router), TypeScript, HTML5 Canvas e banco de dados Neon (PostgreSQL Serverless).

Nós implementamos o banco de dados utilizando **Neon (PostgreSQL)** em vez do Supabase. Agora precisamos realizar a Etapa final de auditoria de código, correção de bugs da engine de Tetris e preparação para o deploy na Vercel conectado ao GitHub.

Por favor, revise e entregue:

1. **Correção de Bugs da Engine de Tetris:**
   - Corrigir o bug do Clear Line (resíduos de blocos visuais/lógicos ao limpar linhas).
   - Corrigir o Soft Drop descontrolado da tecla seta para baixo (implementar timer/debounce fluido em vez de disparar pelo repeat nativo do OS).
   - Validar colisões e rotações SRS.

2. **Otimização do Neon DB no Next.js:**
   - Garantir que as queries que atualizam o XP, High Score e buscam o Leaderboard (Top 10) estejam utilizando o driver `@neondatabase/serverless` corretamente.
   - Adicionar tratamento de erros robusto e tipagem com TypeScript para as transações de XP e Nível no Neon.

3. **Guia de Deploy (GitHub + Vercel + Neon):**
   - Como configurar o repositório no GitHub (.gitignore correto).
   - Como configurar a variável de ambiente `DATABASE_URL` na Vercel utilizando a string com **Connection Pooling** do Neon para evitar estouro de conexões serverless.
   - Checklist de build para garantir que nenhum erro de TypeScript/Lint quebre o deploy na Vercel.