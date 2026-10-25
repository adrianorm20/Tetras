Atue como um Engenheiro de Software Senior especialista em Game Design, Next.js, HTML5 Canvas, Animações e Lógica de Tetris Competitivo (Tetr.io).

Precisamos implementar duas melhorias essenciais na mecânica de lixo (Garbage) e no feedback visual de perigo (Danger Warning) tanto para o Singleplayer quanto para o Multiplayer:

---

### 1. Posicionamento Inteligente das Aberturas do Lixo (Accessible Garbage Holes)
- **Problema Atual:** Quando o lixo sobe, a coluna vazia (buraco) muitas vezes aparece debaixo de áreas do tabuleiro que já estão cobertas por peças do próprio jogador, impossibilitando a limpeza do lixo e travando o jogo injustamente.
- **Lógica de Geração Inteligente:**
  - Refatore a função de geração de linhas de lixo (`generateGarbageLines`).
  - O buraco/espaço vazio da linha de lixo não deve ser puramente aleatório. Ele deve priorizar colunas que estejam **acessíveis** (onde a altura atual da pilha do jogador naquela coluna permita a descida de peças verticais sem que haja obstruções totalmente bloqueadas acima).
  - Garanta que essa coluna de abertura se mantenha estável por alguns acúmulos seguidos de lixo, criando uma "chaminé" vertical limpa que o jogador possa usar para descer barras (I-pieces) e realizar combos de resgate.

---

### 2. Animação de Emergência e Alerta de Perigo (Board Danger Pulse)
- **Gatilho de Perigo:** Monitorar a altura da pilha do jogador no Canvas em tempo real. Se o bloco mais alto do tabuleiro ultrapassar a marca crítica de **80% da altura total** (ex: restando 4 linhas ou menos para atingir o topo/Game Over):
  - **Animação Visual:** Ative um efeito de pulso/glow vermelho nas bordas da tela e/ou na moldura do tabuleiro principal, piscando em ritmo acelerado para dar feedback imediato de que o jogador está prestes a perder.
  - **Interrupção:** O efeito de alerta deve cessar imediatamente assim que o jogador limpar linhas e rebaixar a altura do tabuleiro para um nível seguro (abaixo dos 80%).

---

Entregue o código atualizado do gerador de lixo (Garbage System) e do renderizador do Canvas com essa lógica de aberturas acessíveis e o efeito animado de alerta vermelho.