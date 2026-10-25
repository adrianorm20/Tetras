import type { Metadata } from 'next';
import LeaderboardView from './LeaderboardView';

export const metadata: Metadata = {
  title: 'Leaderboard Global // Tetras Adriano',
  description: 'Classificação global dos maiores High Scores e maiores Níveis de Conta.',
};

export default function LeaderboardPage() {
  return <LeaderboardView />;
}
