import { db } from "./db";
import { sql } from "drizzle-orm";

async function checkSchema() {
    try {
        const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'queue_id'`);
        console.log("Column queue_id exists:", result.rows.length > 0);

        const queues = await db.execute(sql`SELECT id, name FROM service_queues`);
        console.log("Service Queues count:", queues.rows.length);
        queues.rows.forEach(q => console.log(`- Queue ${q.id}: ${q.name}`));

        process.exit(0);
    } catch (error) {
        console.error("Error checking schema:", error);
        process.exit(1);
    }
}

checkSchema();
