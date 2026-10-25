Atue como um Engenheiro de Software Senior especialista em Game Design, Next.js, HTML5 Canvas e Lógica de Tetris Competitivo.

Precisamos implementar um sistema de **Dificuldade Progressiva (Aceleração Gradual da Gravidade)** para evitar que as partidas fiquem infinitas tanto no modo Singleplayer quanto no Multiplayer. Por favor, implemente os seguintes requisitos:

---

### 1. Curva de Velocidade Progressiva (Gravidade Dinâmica)
- **Fórmula de Queda (Tick Rate):**
  - O intervalo de tempo em que a peça desce automaticamente (`dropInterval`) deve diminuir progressivamente conforme o jogador avança (seja contado pelo tempo de partida em segundos ou pelo número de linhas totais limpas/nível atual).
  - Implemente uma fórmula de progressão suave (ex: velocidade inicial de 1000ms por linha, reduzindo exponencialmente ou por degraus de nível até atingir um teto mínimo de velocidade desafiador, ex: 100ms a 150ms nos níveis mais altos).
- **Aceleração no Multiplayer:**
  - No modo multiplayer, a velocidade geral do servidor/jogo deve acelerar de forma global ou individual à medida que o tempo passa (ex: a cada 1 minute de partida, a gravidade base aumenta X%), aumentando a pressão e forçando o fim da partida.

---

### 2. Sincronização do Loop do Jogo
- Garanta que o `requestAnimationFrame` ou o timer de gravidade (`setInterval`/`setTimeout`) utilize o valor atualizado de `dropInterval` em tempo real, sem que o jogador precise reiniciar a peça para sentir a nova velocidade.
- O Soft Drop (seta para baixo) e o Hard Drop (espaço) devem continuar funcionando de forma independente e proporcional à nova velocidade base.

---

Entregue o código atualizado do motor de jogo (Canvas Loop / State Machine) com a implementação dessa curva de dificuldade progressiva integrada para ambos os modos.