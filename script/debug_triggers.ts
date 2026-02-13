import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { triggers, forms, tickets, serviceQueues } from "../shared/schema";
import { desc } from "drizzle-orm";
import fs from "fs";

const { Pool } = pg;
const connectionString = "postgresql://neondb_owner:npg_50xlzQdOFWvA@ep-delicate-star-ac7ht2d9-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const pool = new Pool({ connectionString });
const db = drizzle(pool);

const out: string[] = [];
function log(msg: string) { out.push(msg); console.log(msg); }

async function main() {
    log("=== ALL TRIGGERS ===");
    const allTriggers = await db.select().from(triggers);
    for (const t of allTriggers) {
        log(`Trigger ID: ${t.id} | Name: ${t.name} | Active: ${t.active}`);
        log(`  Event: ${t.event}`);
        log(`  Conditions: ${t.conditions}`);
        log(`  Actions: ${t.actions}`);
    }

    log("\n=== ALL FORMS ===");
    const allForms = await db.select().from(forms);
    for (const f of allForms) {
        log(`Form ID: ${f.id} | Name: ${f.name} | Active: ${f.active}`);
    }

    log("\n=== ALL QUEUES ===");
    const allQueues = await db.select().from(serviceQueues);
    for (const q of allQueues) {
        log(`Queue ID: ${q.id} | Name: ${q.name} | Active: ${q.active}`);
    }

    log("\n=== RECENT TICKETS (last 5) ===");
    const recentTickets = await db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(5);
    for (const t of recentTickets) {
        log(`Ticket ID: ${t.id} | Title: ${t.title} | Category: ${t.category} | QueueId: ${t.queueId}`);
    }

    fs.writeFileSync("debug_output.txt", out.join("\n"));
    await pool.end();
}

main().catch(console.error);
