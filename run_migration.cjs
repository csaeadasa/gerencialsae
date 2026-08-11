const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const client = await pool.connect();
  try {
    await client.query("ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS checklist JSONB;");
    console.log("Success");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
run();
