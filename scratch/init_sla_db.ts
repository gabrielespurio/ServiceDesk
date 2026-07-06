
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Creating schedules table...");
    await db.execute(sql`CREATE TABLE IF NOT EXISTS schedules (id SERIAL PRIMARY KEY, name TEXT NOT NULL, timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo', rules TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())`);
    
    console.log("Creating sla_policies table...");
    await db.execute(sql`CREATE TABLE IF NOT EXISTS sla_policies (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, conditions TEXT NOT NULL, response_time INTEGER, resolution_time INTEGER, is_business_hours BOOLEAN NOT NULL DEFAULT FALSE, schedule_id INTEGER REFERENCES schedules(id), active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
    
    console.log("Tables created successfully");
    process.exit(0);
  } catch (e) {
    console.error("Error creating tables:", e);
    process.exit(1);
  }
}

main();
