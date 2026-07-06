import "dotenv/config";
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function fixPasswords() {
  try {
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users. Checking passwords...`);

    for (const user of allUsers) {
      // Simple check for bcrypt hash: bcrypt hashes start with $2
      if (!user.password.startsWith("$2")) {
        console.log(`Hashing password for user: ${user.username}`);
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await db.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id));
        console.log(`Password updated for ${user.username}`);
      } else {
        console.log(`Password for ${user.username} is already hashed.`);
      }
    }
    console.log("All passwords processed.");
  } catch (error) {
    console.error("Error fixing passwords:", error);
  } finally {
    process.exit(0);
  }
}

fixPasswords();
