import { pool } from "./server/db";

async function main() {
  try {
    console.log("Adding missing columns to ai_knowledge_bases...");
    await pool.query(`
      ALTER TABLE "ai_knowledge_bases" 
      ADD COLUMN IF NOT EXISTS "auth_type" text DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS "token" text,
      ADD COLUMN IF NOT EXISTS "user_name" text,
      ADD COLUMN IF NOT EXISTS "password" text;
    `);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

main();
