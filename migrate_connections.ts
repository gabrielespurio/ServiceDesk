import { pool } from "./server/db";

async function main() {
  try {
    await pool.query(`DROP TABLE IF EXISTS "ai_connections" CASCADE;`);
    await pool.query(`
      CREATE TABLE "ai_connections" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "type" text DEFAULT 'api_rest' NOT NULL,
        "url" text NOT NULL,
        "method" text DEFAULT 'GET' NOT NULL,
        "auth_type" text DEFAULT 'none',
        "auth_config" text,
        "headers" text,
        "parameters" text,
        "body_schema" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

main();
