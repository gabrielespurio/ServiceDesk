import { db } from '../server/db';
import { aiActions } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const actions = await db.select().from(aiActions).where(eq(aiActions.assistantId, 21));
  console.log("ASSISTANT ACTIONS:");
  console.log(JSON.stringify(actions, null, 2));
  process.exit(0);
}
main();
