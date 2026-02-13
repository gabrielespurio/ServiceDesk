import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { triggers, forms, serviceQueues } from "../shared/schema";
import { eq, inArray, like } from "drizzle-orm";
import fs from "fs";

const { Pool } = pg;
const connectionString = "postgresql://neondb_owner:npg_50xlzQdOFWvA@ep-delicate-star-ac7ht2d9-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function main() {
    // Delete stale test triggers (IDs 1, 3, 4, 5, 6)
    const r1 = await db.delete(triggers).where(inArray(triggers.id, [1, 3, 4, 5, 6])).returning();
    console.log("Deleted test triggers:", r1.length);

    // Delete test forms
    const r2 = await db.delete(forms).where(like(forms.name, "Test Trigger%")).returning();
    console.log("Deleted test forms:", r2.length);

    // Delete test queues
    const r3 = await db.delete(serviceQueues).where(like(serviceQueues.name, "Test Trigger%")).returning();
    console.log("Deleted test queues:", r3.length);

    // Show remaining
    const remaining = await db.select().from(triggers);
    console.log("Remaining triggers:", JSON.stringify(remaining, null, 2));

    const remainingForms = await db.select().from(forms);
    console.log("Remaining forms:", JSON.stringify(remainingForms.map(f => ({ id: f.id, name: f.name }))));

    const remainingQueues = await db.select().from(serviceQueues);
    console.log("Remaining queues:", JSON.stringify(remainingQueues.map(q => ({ id: q.id, name: q.name }))));

    fs.writeFileSync("cleanup_result.txt", "Done");
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
