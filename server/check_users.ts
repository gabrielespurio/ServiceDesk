import { db } from "./db";
import { users } from "../shared/schema";

async function run() {
    try {
        const allUsers = await db.select().from(users);
        console.log(JSON.stringify(allUsers, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
run();
