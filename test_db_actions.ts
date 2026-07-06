import { db } from './server/db';
import { aiActions } from './shared/schema';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const actions = await db.select().from(aiActions).where(eq(aiActions.actionType, 'n8n')).orderBy(desc(aiActions.id)).limit(5);
  console.log(JSON.stringify(actions, null, 2));
  process.exit(0);
}
main();
