import { db } from "./server/db";
import { aiAssistants } from "./shared/schema";
import { eq } from "drizzle-orm";

async function testQuota() {
  const assistant = await db.query.aiAssistants.findFirst({
    where: eq(aiAssistants.id, 21) // Zankra Veiculos
  });

  if (!assistant || !assistant.apiKey) {
    console.log("No API Key found");
    return;
  }

  const testModel = async (model: string) => {
    console.log(`Testing model: ${model}`);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${assistant.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "oi" }]
      })
    });
    
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Response: ${JSON.stringify(data, null, 2)}`);
    console.log("-----------------------------------------");
  };

  await testModel("gpt-4o-mini");
  await testModel("gpt-5-mini");
}

testQuota();
