import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function main() {
  await client.connect();
  const r = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  r.rows.forEach(row => console.log('  -', row.table_name));
  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
