/**
 * Script de Reset do Banco de Dados
 * Remove todas as contas de teste/fake (sem password_hash)
 * e mantem apenas contas reais de jogadores registrados.
 *
 * Uso: npx tsx scripts/reset-db.ts
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL nao esta definida no .env.local');
  process.exit(1);
}

const sql = neon(url);

async function resetDatabase() {
  console.log('Conectando ao Neon PostgreSQL...');

  const before = await sql`SELECT id, username, email, password_hash IS NOT NULL as has_password FROM players ORDER BY id;`;
  console.log('Contas existentes (' + before.length + ' total):');
  for (const row of before) {
    const r = row as { id: number; username: string; email: string; has_password: boolean };
    console.log('  [' + r.id + '] ' + r.username + ' (' + r.email + ') - senha: ' + (r.has_password ? 'REAL' : 'FAKE/SEM SENHA'));
  }

  const deleted = await sql`DELETE FROM players WHERE password_hash IS NULL RETURNING id, username;`;

  if (deleted.length === 0) {
    console.log('Nenhuma conta fake encontrada para remover.');
  } else {
    console.log(deleted.length + ' conta(s) fake removida(s):');
    for (const row of deleted) {
      const r = row as { id: number; username: string };
      console.log('  REMOVIDO: [' + r.id + '] ' + r.username);
    }
  }

  const after = await sql`SELECT id, username, email FROM players ORDER BY id;`;
  console.log('Contas reais restantes (' + after.length + ' total):');
  for (const row of after) {
    const r = row as { id: number; username: string; email: string };
    console.log('  MANTIDO: [' + r.id + '] ' + r.username + ' (' + r.email + ')');
  }

  console.log('Reset concluido! Apenas contas com senha real foram mantidas.');
}

resetDatabase().catch((err) => {
  console.error('Erro durante o reset:', err);
  process.exit(1);
});
