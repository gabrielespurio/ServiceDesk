
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { triggers, tickets, serviceQueues, forms } from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const logFile = path.resolve("verification_result.txt");

function log(message: any) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
    console.log(msg);
    fs.appendFileSync(logFile, msg + "\n");
}

fs.writeFileSync(logFile, "Starting Trigger Execution Test...\n");

const { Pool } = pg;
const connectionString = "postgresql://neondb_owner:npg_50xlzQdOFWvA@ep-delicate-star-ac7ht2d9-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function main() {
    try {
        // 1. Create a Test Queue
        const [queue] = await db.insert(serviceQueues).values({
            name: "Test Trigger Queue 2",
            description: "Queue for testing triggers",
            active: true
        }).returning();
        log(`Created Queue: ${queue.name} (ID: ${queue.id})`);

        // 2. Create a Test Form
        const [form] = await db.insert(forms).values({
            name: "Test Trigger Form 2",
            description: "Form for testing triggers",
            fields: "[]",
            active: true
        }).returning();
        log(`Created Form: ${form.name} (ID: ${form.id})`);

        // 3. Create a Trigger
        const conditions = JSON.stringify({
            all: [
                { field: "form", value: form.id.toString() },
                { field: "ticket", value: "created" }
            ],
            any: []
        });

        const actions = JSON.stringify([
            { type: "action.assign_queue", value: queue.id.toString() }
        ]);

        const [trigger] = await db.insert(triggers).values({
            name: "Test Trigger 2",
            description: "Auto-assign to Test Queue",
            event: "ticket.created",
            conditions,
            actions,
            active: true
        }).returning();
        log(`Created Trigger: ${trigger.name} (ID: ${trigger.id})`);

        // 4. Create a Ticket via Storage logic
        process.env.DATABASE_URL = connectionString;

        // Using require to load the module
        // Note: This relies on tsx compiling on the fly
        const { storage } = await import("../server/storage");

        const ticket = await storage.createTicket({
            title: "Test Ticket for Trigger 2",
            description: "Testing if trigger fires",
            category: form.name,
            priority: "media",
            creatorId: 1,
            status: "aberto"
        });

        log(`Created Ticket: ${ticket.title} (ID: ${ticket.id})`);
        log(`Ticket Queue ID: ${ticket.queueId}`);

        if (ticket.queueId === queue.id) {
            log("SUCCESS: Ticket was assigned to the correct queue!");
        } else {
            log(`FAILURE: Ticket Queue ID (${ticket.queueId}) does not match Test Queue ID (${queue.id})`);
        }

        // Cleanup
        await db.delete(tickets).where(eq(tickets.id, ticket.id));
        await db.delete(triggers).where(eq(triggers.id, trigger.id));
        await db.delete(forms).where(eq(forms.id, form.id));
        await db.delete(serviceQueues).where(eq(serviceQueues.id, queue.id));
        log("Cleanup complete.");

    } catch (error: any) {
        log("Test Failed:");
        if (error instanceof Error) {
            log(error.stack);
        } else {
            log(JSON.stringify(error, null, 2));
        }
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();
