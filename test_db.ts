import { db } from './server/db';
import { aiLogs } from './shared/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const logs = await db.select().from(aiLogs).orderBy(desc(aiLogs.createdAt)).limit(10);
  console.log(JSON.stringify(logs, null, 2));
  process.exit(0);
}
main();
