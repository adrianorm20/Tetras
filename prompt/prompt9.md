Atue como um Engenheiro de Software Senior especialista em Sistemas Multiplayers em Tempo Real, Next.js, HTML5 Canvas e Lógica de Jogo Tetris (Tetr.io).

Identificamos um bug crítico no sistema de combate multiplayer que precisa ser corrigido imediatamente:

---

### 1. Correção Crítica na Fila de Lixo (Garbage Queue) e Aplicação no Tabuleiro
- **Persistência e Acúmulo Real:** O indicador de lixo pendente está sumindo do nada e as linhas enviadas pelos inimigos não estão subindo corretamente para o tabuleiro principal.
- **Correção da Máquina de Estados do Lixo:** 
  - Quando um oponente envia linhas, o valor deve ser somado rigidamente na fila de espera (`pendingGarbage`).
  - O lixo **nunca** deve sumir sozinho sem ser processado. Ele só deve ser transferido para o tabuleiro físico do jogador no momento em que o jogador trava (lock) uma peça sem limpar linhas, ou caso exista uma regra de timer/turno.
  - Quando o lixo é aplicado ao tabuleiro, as linhas cinzas devem nascer na parte inferior do grid, empurrando todo o tabuleiro para cima de forma fluida, e **respeitando a coluna de abertura vertical constante** (para permitir resgates e combos, conforme padrão Tetr.io).

---

### 2. Correção do Game Over Falso / Encerramento do Nada
- **Detecção Real de Topo:** O jogo está encerrando repentinamente ("do nada") com uma linha imaginária após receber ataques. 
- **Ajuste na Colisão:** Verifique a função de `isGameOver()` e a adição de linhas cinzas. O fim de jogo só deve ocorrer estritamente se uma nova peça gerada colidir imediatamente com blocos existentes (incluindo as novas linhas de lixo que subiram) ou se houver tentativa de spawn em espaço ocupado. Garanta que as linhas de lixo subindo não gerem coordenadas inválidas (`NaN` ou estouro de matriz) na matriz do Canvas.

---

### 3. Sincronização de Rede (Multiplayer Sync)
- Garanta que os pacotes de envio/recebimento de garbage via WebSocket/PartyKit estejam despachando os eventos com os IDs corretos dos alvos, impedindo que o lixo enviado se perca no meio da comunicação de rede.

---

Entregue o código corrigido dos hooks de estado do multiplayer e da função de processamento de garbage/game-over no Canvas.