Atue como um Engenheiro de Software Senior especialista em Front-end, Next.js, HTML5 Canvas, Web Audio API e jogos estilo Tetris Competitivo (Tetr.io).

Precisamos corrigir e polir o sistema multiplayer e o feedback visual/sonoro com base em testes reais do jogo. Por favor, implemente as seguintes melhorias:

---

### 1. Barra de Aviso de Lixo (Garbage Queue) Persistente e Em Tempo Real
- **Visibilidade Constante:** A barra lateral de lixo pendente (Garbage Queue) não pode sumir ou piscar. Ela deve ficar **permanentemente visível** na lateral do tabuleiro do jogador, mostrando em tempo real o acúmulo de blocos cinzas que estão prestes a subir.
- **Formato do Lixo Recebido (Abertura Vertical Estilo Tetr.io):** 
  - Quando as linhas de lixo cinzas sobem para o tabuleiro do jogador, a coluna vazia (o "buraco" que permite continuar fazendo combos e encaixes) **não** deve ser puramente aleatória a cada linha gerando bloqueios cegos. 
  - *Regra de Comportamento:* O buraco da coluna gerada nas linhas de lixo deve manter-se na mesma coluna (ou mover-se de forma suave e controlada por alguns acúmulos), simulando o padrão do Tetr.io. Isso garante que o jogador tenha uma abertura vertical viável para encaixar peças longas (como o I-Tetris) e tentar um resgate/combo.
- **Visualização dos Tabuleiros dos Oponentes:** 
  - Corrija a renderização das miniaturas dos outros jogadores. O tabuleiro de cada oponente deve refletir em tempo real (ou com delay mínimo de frames) o preenchimento de blocos e o envio/recebimento de lixo deles.

---

### 2. Animação de Recebimento de Lixo e Efeitos Sonoros (Web Audio API)
- **Animação Visual:**
  - Quando o lixo estiver prestes a subir do "Garbage Queue" para o tabuleiro principal, adicione uma animação de tremor/shake sutil nas linhas inferiores do tabuleiro e um efeito de pulso/flash avermelhado na barra indicadora.
- **Efeitos Sonoros (SFX):**
  - Implemente um gerenciador de áudio leve utilizando a Web Audio API nativa do navegador para disparar efeitos sonoros cruciais sem travamentos:
    - Som de "Alerta/Perigo" quando o lixo na fila estiver alto.
    - Som de impacto seco quando as linhas cinzas subirem de fato no tabuleiro.
    - Sons nítidos para rotação de peças, soft drop, hard drop, clear line e T-Spin.

---

### 3. Painel de Pódio Enriquecido (Estatísticas Detalhadas de Fim de Partida)
- **Tela de Vitória/Derrota (Podium):**
  - Ao término da partida multiplayer, exiba um painel detalhado de classificação (do 1º ao 8º lugar).
  - O **1º colocado (Vencedor) deve receber destaque visual maior** (maior espaçamento, cor dourada/neon brilhante, ícone de coroa ou efeitos de partículas).
  - Para **cada** jogador listado no pódio, exiba estatísticas completas coletadas durante a partida:
    - **Total de linhas enviadas** aos oponentes.
    - **Total de linhas recebidas** de inimigos.
    - **Total de jogadores eliminados (KOs)** diretamente pelos ataques.
    - **XP ganho** na partida e pontuação final.

---

Entregue os códigos atualizados dos componentes afetados (Renderizador do Canvas / UI do Multiplayer, Gerenciador de Áudio e Tela do Pódio), garantindo que tudo funcione perfeitamente integrado ao Next.js e ao Neon.