Atue como um Engenheiro de Software Senior especialista em Next.js (App Router), TypeScript, jogos HTML5 Canvas e arquitetura serverless em tempo real (Neon PostgreSQL + Vercel).

Precisamos realizar a Etapa Final de Ajustes no nosso jogo estilo Tetr.io com os seguintes requisitos específicos:

---

### 1. Autenticação e Gestão de Usuários (Login e Cadastro In-Page)
- **Fluxo Único na Mesma Tela:** Crie um modal overlay (sem redirecionar para novas abas ou páginas) para "Criar Conta" e "Fazer Login".
- **Segurança com Neon:** 
  - Integre com o banco Neon PostgreSQL.
  - As senhas NUNCA devem ser salvas em texto puro. Utilize `bcryptjs` (ou `argon2`) para fazer o hash seguro das senhas no backend (Next.js API Route / Server Action).
  - Implemente autenticação via JWT armazenado em cookies HTTP-Only ou através de uma biblioteca leve como `jose` ou `next-auth`/`lucia`.
  - Garanta que o estado do usuário logado (id, username, xp, level, high_score) fique disponível no estado global da aplicação.

---

### 2. Controle de Início de Jogo e Menu de Modos
- **Menu Principal:** Remova a inicialização automática do motor de jogo ao carregar a página.
- **Painel de Seleção:** Crie uma tela/interface com botões estilizados (estilo Arcade/Futurista):
  - **Modo Solo (Singleplayer):** Inicia a partida solo com pontuação, níveis e salvamento automático no Neon.
  - **Modo Multiplayer:** Abre o lobby de salas.

---

### 3. Multiplayer Serverless em Tempo Real na Vercel (Salas Públicas e Privadas)
- **Infraestrutura Compatível com Vercel:** Como funções Serverless tradicionais não mantêm WebSockets persistentes nativamente, implemente a comunicação em tempo real usando **PartyKit**, **Pusher** ou **Ably** (que integram perfeitamente com a Vercel e o Next.js).
- **Gerenciamento de Salas no Neon + Realtime:**
  - **Criação de Sala:** O jogador pode criar uma sala (gerando um Código Único de 6 caracteres para convite direto) e optar por torná-la **Pública** (visível na lista global de salas cadastradas no Neon) ou **Privada** (acessível apenas via código).
  - **Lobby Dinâmico:** Exiba os jogadores na sala, seus status de "Pronto" e o host com permissão para iniciar a partida quando houver 2 ou mais jogadores (até 8).
  - **Resultado Final:** Ao término da partida multiplayer, atualize as estatísticas (vitórias, derrotas, XP ganho) diretamente na tabela de usuários do Neon para todos os participantes.

---

### 4. Ajustes Finos de Física e Mecânicas de Jogo (Fórmula Tetr.io)
- **Gravidade Progressiva (Aumento de Velocidade):**
  - Implemente aceleração gradual de queda das peças com o passar do tempo ou avanço de níveis, tanto no Singleplayer quanto no Multiplayer, para aumentar a pressão competitiva.
- **Lock Delay (Ajuste de Peça no Chão):**
  - Quando a peça tocar na pilha/chão, ela NÃO deve fixar instantaneamente.
  - Adicione um timer de **Lock Delay** (ex: 500ms). Enquanto o timer estiver correndo, se o jogador mover para os lados ou girar a peça (SRS), o lock reset/delay é atualizado, permitindo encaixes rápidos e criação de combos/T-Spins antes do congelamento definitivo.
- **Envio de Lixo Avançado (Garbage Sending) no Multiplayer:**
  - Ajuste o cálculo de envio de lixo conforme o padrão competitivo:
    - 1 Linha = 0 lixo | 2 Linhas = 1 lixo | 3 Linhas = 2 lixo | Tetris (4 Linhas) = 4 lixo.
    - Bônus por Combos consecutivos e T-Spins.
  - O lixo recebido entra em uma barra de aviso prévio (Garbage Queue) e só sobe no tabuleiro do jogador quando ele posiciona a peça atual.

---

Entregue:
1. Os arquivos de código atualizados/criados para as rotas de Auth, Motor Canvas (Lock Delay/Speed) e Handlers do Multiplayer.
2. O esquema SQL atualizado das tabelas do Neon (`users`, `rooms`).
3. O passo a passo das variáveis de ambiente necessárias no `.env.local` e na Vercel.