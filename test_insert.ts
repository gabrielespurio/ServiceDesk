import { db } from "./server/db";
import { aiConnections } from "./shared/schema";

async function main() {
  try {
    const [newConn] = await db.insert(aiConnections).values({
      name: "teste",
      description: "teste",
      type: "api_rest",
      url: "t",
      method: "GET",
      authType: "none",
      authConfig: JSON.stringify({ token: "", user: "", pass: "" }),
      headers: null,
      parameters: JSON.stringify([]),
      bodySchema: null
    }).returning();
    console.log("Success:", newConn);
  } catch (e) {
    console.error("DB Error:", e);
  } finally {
    process.exit(0);
  }
}
main();
