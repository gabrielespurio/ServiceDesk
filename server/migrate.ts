import { db } from "./db";
import { sql } from "drizzle-orm";

async function runMigration() {
    try {
        console.log("Checking for queue_id column in tickets table...");
        const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets' AND column_name = 'queue_id'
    `);

        if (columnCheck.rows.length === 0) {
            console.log("Adding queue_id column to tickets table...");
            await db.execute(sql`ALTER TABLE tickets ADD COLUMN queue_id integer REFERENCES service_queues(id)`);
            console.log("Column queue_id added successfully.");
        } else {
            console.log("Column queue_id already exists.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
