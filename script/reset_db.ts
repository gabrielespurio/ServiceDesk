import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Dropping all tables...");
    await db.execute(sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
    console.log("All tables dropped.");
    process.exit(0);
}

main().catch(console.error);
