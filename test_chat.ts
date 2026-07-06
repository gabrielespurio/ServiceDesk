import { pool } from "./server/db";

async function main() {
  try {
    const res = await fetch("http://localhost:5000/api/ai/assistants/21/chat", { // We will find the correct ID
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", text: "teste" }] })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
