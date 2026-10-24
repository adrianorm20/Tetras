Por fim, vamos para a Etapa 4: O sistema multiplayer em tempo real inspirado no Tetr.io (até 8 jogadores por sala).

Requisitos desta etapa:
1. Sugira e implemente a tecnologia de tempo real mais adequada (ex: PartyKit, Socket.io ou Supabase Realtime) integrada ao Next.js para gerenciar salas de até 8 jogadores.
2. *Sistema de Envio de Lixo (Garbage):* Quando um jogador limpa múltiplas linhas (Tetris, T-Spins), linhas de lixo devem ser enfileiradas para serem enviadas aos oponentes.
3. *Mecânica de Foco (Targeting):* Na interface de jogo, exiba miniaturas dos tabuleiros dos outros jogadores da sala em tempo real. Permita que o jogador altere facilmente quem ele está focando/atacando (com opções como "Atacar o líder", "Atacar quem me ataca" ou clique direto na miniatura).
4. Atualizar o final da partida multiplayer para computar vitórias, derrotas e atualizar o XP no Neon Database para todos os participantes.