Atue como um Engenheiro de Software Senior especialista em Game Design, Next.js, HTML5 Canvas e Lógica de Tetris Competitivo.

Precisamos reajustar totalmente a curva de dificuldade e o tempo de duração das partidas (tanto no Singleplayer quanto no Multiplayer). O ritmo atual está excessivamente lento e precisa ser muito mais agressivo e dinâmico. Por favor, implemente os seguintes requisitos:

---

### 1. Curva de Agressividade Extrema e Duração Máxima (Teto de 4 Minutos)
- **Eliminação de Progressão Lenta:** 
  - Remova qualquer progressão baseada em níveis longos ou tempos estendidos (como levar 6+ minutos). O jogo não pode ser infinito.
  - O tempo total máximo planejado para uma partida antes de se tornar humanamente quase impossível deve ser de **no máximo 4 minutos**.
- **Aceleração Rápida desde o Início:**
  - A velocidade de queda (`dropInterval`) **não** deve começar lenta e demorar para subir. Ela deve iniciar em uma velocidade inicial moderada e **aumentar rapidamente a cada 15 a 30 segundos** (ou continuamente com base no tempo decorrido em milissegundos).
- **O Teto Final (Frenético aos 4 Minutos):**
  - Ao atingir a marca de 3 a 4 minutos de partida, o `dropInterval` deve cair para um teto mínimo extremamente rápido (ex: 50ms a 80ms ou menos), criando uma pressão absurda, onde as peças praticamente caem instantaneamente, forçando o encerramento rápido da partida.

---

### 2. Aplicação Global (Singleplayer e Multiplayer)
- Aplique essa mesma fórmula rigorosa de ganho rápido de velocidade tanto no loop do motor solo quanto no estado global/servidor do multiplayer, garantindo que nenhum dos modos se arraste por muito tempo.

---

Entregue o código atualizado do motor do Canvas e do gerenciador de tempo/velocidade com essa nova fórmula agressiva implementada.