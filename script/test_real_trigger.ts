import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { triggers, forms, tickets, serviceQueues } from "../shared/schema";
import { eq, desc, inArray, like } from "drizzle-orm";
import fs from "fs";

const { Pool } = pg;
const connectionString = "postgresql://neondb_owner:npg_50xlzQdOFWvA@ep-delicate-star-ac7ht2d9-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Set env before importing storage
process.env.DATABASE_URL = connectionString;
process.env.EXTERNAL_DATABASE_URL = connectionString;

const pool = new Pool({ connectionString });
const db = drizzle(pool);

const out: string[] = [];
function log(msg: string) { out.push(msg); }

// Override console to capture all output
const origLog = console.log;
console.log = (...args: any[]) => { const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '); out.push(msg); origLog(...args); };
console.warn = (...args: any[]) => { const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '); out.push(`[WARN] ${msg}`); };
console.error = (...args: any[]) => { const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '); out.push(`[ERR] ${msg}`); };

async function main() {
    try {
        // Step 1: Clean up stale test data
        log("=== Step 1: Cleaning stale test triggers ===");
        const deleted = await db.delete(triggers).where(inArray(triggers.id, [1, 3, 4, 5, 6])).returning();
        log(`Deleted ${deleted.length} stale test triggers`);

        const deletedForms = await db.delete(forms).where(like(forms.name, "Test Trigger%")).returning();
        log(`Deleted ${deletedForms.length} test forms`);

        const deletedQueues = await db.delete(serviceQueues).where(like(serviceQueues.name, "Test Trigger%")).returning();
        log(`Deleted ${deletedQueues.length} test queues`);

        // Step 2: Show current state
        log("\n=== Step 2: Current DB state ===");
        const allTriggers = await db.select().from(triggers);
        for (const t of allTriggers) {
            log(`Trigger ID: ${t.id} | Name: ${t.name} | Active: ${t.active}`);
            log(`  Conditions: ${t.conditions}`);
            log(`  Actions: ${t.actions}`);
        }
        const allForms = await db.select().from(forms);
        for (const f of allForms) {
            log(`Form ID: ${f.id} | Name: ${f.name}`);
        }
        const allQueues = await db.select().from(serviceQueues);
        for (const q of allQueues) {
            log(`Queue ID: ${q.id} | Name: ${q.name}`);
        }

        // Step 3: Test trigger via storage.createTicket
        log("\n=== Step 3: Testing trigger ===");
        const { storage } = await import("../server/storage");

        const testTicket = await storage.createTicket({
            title: "Teste Final Gatilho",
            description: "Verificando se o gatilho direciona para fila Suporte",
            category: "TI",
            priority: "media",
            creatorId: 1,
            status: "aberto"
        });

        log(`\n=== RESULT ===`);
        log(`Ticket ID: ${testTicket.id}`);
        log(`Category: ${testTicket.category}`);
        log(`QueueId: ${testTicket.queueId}`);

        if (testTicket.queueId === 8) {
            log("\n✅ SUCCESS: Ticket assigned to Suporte queue (ID: 8)!");
        } else {
            log(`\n❌ FAILURE: QueueId is ${testTicket.queueId}, expected 8`);
        }

        // Cleanup test ticket
        await db.delete(tickets).where(eq(tickets.id, testTicket.id));
        log("Test ticket cleaned up.");

    } catch (error: any) {
        log("ERROR: " + (error.stack || JSON.stringify(error)));
    } finally {
        fs.writeFileSync("verify_final.txt", out.join("\n"));
        await pool.end();
        process.exit(0);
    }
}

main();
