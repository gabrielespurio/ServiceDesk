import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use EXTERNAL_DATABASE_URL if set, otherwise fallback to DATABASE_URL
const connectionString = process.env.DATABASE_URL || process.env.EXTERNAL_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL or EXTERNAL_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
