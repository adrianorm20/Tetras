Atue como um Engenheiro de Software Senior especialista em Arquitetura de Jogos, Next.js, HTML5 Canvas, Lógica de Matrizes e Sistemas Multiplayers em Tempo Real.

Precisamos corrigir um bug crítico de renderização/matriz no Tetris e implementar um novo modo de jogo multiplayer contínuo baseado em "Andares" (Floors) com sistema de Vida estilo TFT (100 a 0). Por favor, implemente os seguintes requisitos:

---

### 1. Correção de Bug: Resíduos/Blocos Perdidos ao Limpar Linhas
- **Problema Atual:** Ao completar e limpar uma linha no tabuleiro, às vezes restam blocos isolados ou resíduos visuais e lógicos na matriz.
- **Correção da Matriz (`clearLines`):**
  - Refatore rigorosamente a função de varredura e exclusão de linhas completas.
  - Garanta que, ao apagar uma linha (`row`), todas as linhas acima dela desçam de forma perfeitamente sincronizada na matriz bidimensional (substituindo linha por linha de cima para baixo).
  - Limpe completamente os índices do Canvas correspondentes para evitar que blocos fantasmas fiquem presos no ar.

---

### 2. Novo Modo: Multiplayer Contínuo de Andares (Endless Floor System)
- **Entrada Direta (Sem Salas Fechadas):** 
  - Crie um modo de jogo onde o jogador entra direto em uma fila contínua, disputando simultaneamente com outros jogadores conectados na mesma sessão global, sem precisar criar salas manuais por código de convite.
- **Sistema de Andares (Floors):**
  - Exiba ao lado da tela uma lista dinâmica de andares (ex: Andar 1 até o Andar X) mostrando onde cada oponente está em tempo real.
  - Se um jogador perde ou atinge o topo, a progressão dele é resetada ou ele sofre penalidade de vida, enquanto os oponentes que continuam vivos mantêm suas posições e sobem de andar.

---

### 3. Sistema de Vida Estilo TFT (100 a 0) e Progressão de Dificuldade
- **Barra de HP:** 
  - Em vez de dar Game Over instantâneo ao encostar no topo, o jogador possui uma barra de Vida (começando em 100 e descendo até 0). 
  - Sempre que a pilha chega ao topo ou sofre dano severo de lixo inimigo, o jogador perde uma quantia de HP (ex: -20 HP), o tabuleiro reseta de forma rápida (como uma penalidade de queda) e ele continua jogando até o HP zerar de fato.
- **Escalabilidade de Velocidade por Andar:**
  - Quanto mais alto o andar que o jogador alcança, mais rápido a gravidade (`dropInterval`) se torna, aumentando drasticamente a dificuldade e a pressão competitiva.

---

Entregue o código corrigido da engine de limpeza de matriz do Canvas e a estrutura do novo componente/modo de jogo de andares contínuos com HP.