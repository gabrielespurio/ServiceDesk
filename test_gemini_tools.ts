import { db } from "./server/db";
import { aiAssistants, aiConnections } from "./shared/schema";
import { eq } from "drizzle-orm";

async function debugGemini() {
  try {
    const assistant = await db.query.aiAssistants.findFirst({
      where: eq(aiAssistants.id, 21),
      with: { actions: true }
    });

    if (!assistant) {
      console.log("Assistant 21 not found");
      return;
    }

    const apiToolsAction = assistant.actions?.filter((a: any) => a.actionType === "api_tool" && a.config) || [];
    const parsedApiTools = [];
    for (const a of apiToolsAction) {
      let config = a.config;
      if (typeof config === "string") config = JSON.parse(config);
      
      if (config.connectionId) {
        const globalConn = await db.select().from(aiConnections).where(eq(aiConnections.id, config.connectionId)).limit(1);
        if (globalConn.length > 0) {
          const conn = globalConn[0];
          const authCfg = conn.authConfig ? JSON.parse(conn.authConfig as string) : {};
          parsedApiTools.push({
            name: conn.name.replace(/[^a-zA-Z0-9_-]/g, ""),
            description: conn.description || `Chamada para API ${conn.name}`,
            endpoint: conn.url,
            method: conn.method,
            authType: conn.authType,
            token: authCfg.token,
            user: authCfg.user,
            pass: authCfg.pass,
            parameters: conn.parameters ? JSON.parse(conn.parameters as string) : []
          });
        }
      }
    }

    const tools = parsedApiTools.length > 0 ? [{
      functionDeclarations: parsedApiTools.map((t: any) => {
        const requiredParams = (t.parameters || []).filter((p: any) => p.required !== false).map((p: any) => p.name);
        return {
          name: t.name,
          description: t.description,
          parameters: {
            type: "OBJECT",
            properties: (t.parameters || []).reduce((acc: any, p: any) => {
              acc[p.name] = { type: p.type === 'number' ? 'NUMBER' : p.type === 'boolean' ? 'BOOLEAN' : 'STRING', description: p.description };
              return acc;
            }, {}),
            ...(requiredParams.length > 0 ? { required: requiredParams } : {})
          }
        };
      })
    }] : undefined;

    const result = await executeApiTool('ConsultaEstoqueZankraveiculos', {}, parsedApiTools); console.log('Result:', result); process.exit(0); const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + assistant.apiKey;
    const contents = [
      { role: "user", parts: [{ text: "quais carros da volksvagem você tem?" }] }
    ];

    const payload = {
      contents,
      systemInstruction: { parts: [{ text: "You are a test bot." }] },
      tools
    };

    console.log("Sending payload:", JSON.stringify(payload, null, 2));

    const apiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await apiResponse.text();
    console.log("Response Status:", apiResponse.status, apiResponse.statusText);
    console.log("Response Body:", text);

  } catch (err: any) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

debugGemini();
