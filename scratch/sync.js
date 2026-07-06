import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL });

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_assistants (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      description TEXT,
      objective TEXT,
      personality TEXT,
      active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS ai_knowledge_bases (
      id SERIAL PRIMARY KEY,
      assistant_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'ready' NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS ai_channels (
      id SERIAL PRIMARY KEY,
      assistant_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      config TEXT,
      active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS ai_actions (
      id SERIAL PRIMARY KEY,
      assistant_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      config TEXT,
      active BOOLEAN DEFAULT true NOT NULL
    );
  `);
  console.log("Tables created successfully");
  process.exit(0);
}
run().catch(console.error);
