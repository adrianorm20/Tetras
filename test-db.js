const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

async function testConnection() {
  console.log('Testing Neon connection with DATABASE_URL...');
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('DATABASE_URL_UNPOOLED present:', !!process.env.DATABASE_URL_UNPOOLED);
  console.log('NEON_BRANCH:', process.env.NEON_BRANCH);

  const sqlPooled = neon(process.env.DATABASE_URL);
  const pooledResult = await sqlPooled`SELECT version(), current_database(), now()`;
  console.log('Pooled query succeeded!');
  console.log('Postgres Version:', pooledResult[0].version);
  console.log('Current Database:', pooledResult[0].current_database);
  console.log('Server Time:', pooledResult[0].now);

  const sqlDirect = neon(process.env.DATABASE_URL_UNPOOLED);
  const directResult = await sqlDirect`SELECT 1 as direct_test`;
  console.log('Direct query succeeded! Test value:', directResult[0].direct_test);
}

testConnection().catch(err => {
  console.error('Connection failed:', err);
  process.exit(1);
});
