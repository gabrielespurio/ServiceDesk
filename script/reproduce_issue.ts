import "dotenv/config";
import { storage } from "../server/storage";
import { insertTeamSchema } from "@shared/schema";

async function main() {
    try {
        console.log("Fetching users to be members...");
        const users = await storage.getUsers();
        if (users.length === 0) {
            console.log("No users found. Creating a dummy user.");
            await storage.createUser({
                username: "testuser",
                password: "password",
                fullName: "Test User",
                email: "test@example.com",
                role: "user"
            });
        }
        const memberUserIds = [99999];
        console.log("Member IDs:", memberUserIds);

        const teamData = {
            name: "Test Team FK Fail",
            description: "This fails due to invalid user ID",
        };

        console.log("Validating team data...");
        const validatedTeam = insertTeamSchema.parse(teamData);

        console.log("Creating team...");
        const team = await storage.createTeam(validatedTeam, memberUserIds);
        console.log("Team created successfully:", team);
    } catch (err) {
        console.error("Error creating team:", err);
    }
}

main().catch(console.error);
