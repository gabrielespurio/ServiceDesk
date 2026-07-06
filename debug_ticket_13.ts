import "dotenv/config";
import { db } from './server/db';
import { tickets } from './shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const t = await db.select().from(tickets).where(eq(tickets.id, 13));
  console.log(JSON.stringify(t, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
