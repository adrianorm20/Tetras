import type { Metadata } from 'next';
import LeaderboardView from './LeaderboardView';

export const metadata: Metadata = {
  title: 'Leaderboard Global // TETR.IO Adriano',
  description: 'Classificação global dos maiores High Scores e maiores Níveis de Conta sincronizados com o Neon Database.',
};

export default function LeaderboardPage() {
  return <LeaderboardView />;
}
