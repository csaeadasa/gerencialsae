const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  await pool.query(`ALTER TABLE re_participation_attachments ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Documentos preliminares'`);
  console.log('Database patched.');
  process.exit(0);
}
run();
