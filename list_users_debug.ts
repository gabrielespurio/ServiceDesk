import "dotenv/config";
import { db } from "./server/db";
import { users } from "./shared/schema";

async function listUsers() {
  try {
    const allUsers = await db.select().from(users);
    console.log("Users in database:", JSON.stringify(allUsers, null, 2));
  } catch (error) {
    console.error("Error listing users:", error);
  } finally {
    process.exit(0);
  }
}

listUsers();
