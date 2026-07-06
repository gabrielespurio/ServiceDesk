import "dotenv/config";
import { storage } from "../server/storage";

async function main() {
  const policies = await storage.getSlaPolicies();
  console.log("SLA Policies:");
  console.log(JSON.stringify(policies, null, 2));

  const tickets = await storage.getTickets();
  console.log("\nLatest Tickets with SLA:");
  tickets.slice(0, 5).forEach(t => {
    console.log(`ID: ${t.id}, Title: ${t.title}, Category: ${t.category}, Priority: ${t.priority}, SLA: ${JSON.stringify((t as any).sla)}`);
  });

  const forms = await storage.getForms();
  console.log("\nForms:");
  console.log(JSON.stringify(forms, null, 2));
}

main().catch(console.error);
