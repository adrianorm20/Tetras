Atue como um Engenheiro de Software Senior especialista em Game Design Competitivo, Next.js, HTML5 Canvas e Mecânicas Avançadas do SRS (Super Rotation System / Tetr.io).

Precisamos realizar 3 refinamentos estratégicos de balanceamento e física no nosso jogo:

---

### 1. Sistema de Foco de Ataque para o Modo de Andares (Targeting do Líder)
- **Lógica de Redistribuição de Lixo:** 
  - No modo contínuo de andares (Lobby Infinito), o envio de lixo (Garbage) gerado ao limpar combos, Tetris ou T-Spins deve ter um peso de direcionamento automático: **focar prioritariamente no jogador que está no andar mais alto (Líder da sessão)**.
  - Isso cria uma dinâmica de "Catch-up Mechanism", onde o líder recebe ataques combinados do lobby para não disparar isoladamente, permitindo viradas e ultrapassagens.

---

### 2. Lock Delay Dinâmico (Proporcional à Velocidade de Queda)
- **Ajuste de Lock Delay com a Gravidade:**
  - Atualmente, o Lock Delay (tempo de tolerância ao tocar o chão antes do congelamento da peça) é fixo.
  - Implemente um **Lock Delay Dinâmico**: à medida que o tempo de partida avança e a velocidade de queda (`dropInterval`) acelera, o tempo de Lock Delay deve ser reduzido proporcionalmente (ex: de 500ms nos andares iniciais para 150ms-200ms em velocidades insanas).
  - Além disso, adicione um limite máximo de movimentos/rotações por peça (ex: máximo de 15 ações de spin/move após tocar no chão), para impedir que jogadores "travem" a velocidade do jogo infinitamente ficando girando a peça sem fixá-la.

---

### 3. Ajuste Fino do SRS Wall Kicks (Mecânica de Deslize/Caminhada ao Girar)
- **Implementação Rigorosa de Kick Offsets:**
  - Garanta que a tabela de rotação SRS (Super Rotation System) valide corretamente os vetores de teste (Wall Kicks) quando a peça é girada continuamente em cantos apertados.
  - Ao pressionar/espamar a rotação em espaços estreitos ou com blocos ao redor, a peça deve ser empurrada para posições adjacentes válidas ativas na tabela SRS, permitindo jogadas técnicas avançadas como deslizes laterais sob blocos (Wall Kick Gliding) e T-Spins.

---

Entregue os códigos atualizados da matriz SRS, do motor de Lock Delay e da lógica de direcionamento de Garbage no multiplayer.