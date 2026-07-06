import { pool } from "./server/db";

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ai_categories" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
    `);
    
    // Add columns if they don't exist
    await pool.query(`ALTER TABLE "ai_assistants" ADD COLUMN IF NOT EXISTS "scope" text DEFAULT 'external' NOT NULL;`);
    await pool.query(`ALTER TABLE "ai_assistants" ADD COLUMN IF NOT EXISTS "category_id" integer;`);
    
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

main();
