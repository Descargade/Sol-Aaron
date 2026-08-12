import pg from 'pg';
import crypto from 'crypto';
const { Client } = pg;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

const passwords = [
  { username: 'solsaldena', displayName: 'Sol', password: 'soladmin2025' },
  { username: 'aarongonzalez', displayName: 'Aaron', password: 'aaronadmin2025' },
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  await client.query('DELETE FROM story_admin_users');
  console.log('Deleted old admin users');

  for (const p of passwords) {
    const hash = hashPassword(p.password);
    await client.query(
      'INSERT INTO story_admin_users (username, display_name, password_hash) VALUES ($1, $2, $3)',
      [p.username, p.displayName, hash]
    );
  }
  console.log('Created new admin users:');
  console.log('  solsaldena / soladmin2025');
  console.log('  aarongonzalez / aaronadmin2025');
  await client.end();
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
