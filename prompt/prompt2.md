Agora vamos para a Etapa 2: Integração com o banco de dados Neon (PostgreSQL) e sistema de progressão.

Requisitos desta etapa:
1. Criar a configuração de conexão com o Neon Database (usando driver serverless compatível com Next.js).
2. Criar o esquema SQL (migrações) para uma tabela de usuários/jogadores contendo:
   - id, username, email, xp, level, matches_played, wins, high_score.
3. Criar uma API Route no Next.js que receba o resultado de uma partida finalizada:
   - Calcule o XP ganho com base na pontuação e linhas feitas.
   - Atualize o XP, verifique se houve mudança de nível (com base em uma fórmula progressiva) e salve o High Score se for o caso.
4. Criar um componente visual simples de "Perfil do Jogador" exibindo o nível atual, barra de progresso de XP e o High Score puxados do banco Neon.