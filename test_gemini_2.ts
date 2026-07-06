import { db } from "./server/db";
import { aiAssistants, aiConnections } from "./shared/schema";
import { eq } from "drizzle-orm";

async function resolveAuthHeaders(authType: string, authConfig: any) {
  let headers: any = {};
  if (authType === "bearer" && authConfig?.token) {
    headers["Authorization"] = `Bearer ${authConfig.token}`;
  } else if (authType === "basic" && authConfig?.user && authConfig?.pass) {
    const encoded = Buffer.from(`${authConfig.user}:${authConfig.pass}`).toString("base64");
    headers["Authorization"] = `Basic ${encoded}`;
  } else if (authType === "oauth2_password" && authConfig?.tokenUrl && authConfig?.user && authConfig?.pass) {
    try {
      const formParams = new URLSearchParams();
      formParams.append("grant_type", "password");
      formParams.append("username", authConfig.user);
      formParams.append("password", authConfig.pass);
      const res = await fetch(authConfig.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formParams.toString()
      });
      if (res.ok) {
        const data = await res.json() as any;
        if (data.access_token) {
          headers["Authorization"] = `Bearer ${data.access_token}`;
        }
      }
    } catch (err) {}
  }
  return headers;
}

async function debugSecondCall() {
  try {
    const assistant = await db.query.aiAssistants.findFirst({
      where: eq(aiAssistants.id, 21),
      with: { actions: true }
    });
    if (!assistant) return;

    let toolConfig: any;
    for (const a of assistant.actions || []) {
      let c = a.config;
      if (typeof c === "string") c = JSON.parse(c);
      if (c.connectionId) {
        const globalConn = await db.select().from(aiConnections).where(eq(aiConnections.id, c.connectionId)).limit(1);
        if (globalConn.length > 0) {
          const conn = globalConn[0];
          const authCfg = conn.authConfig ? JSON.parse(conn.authConfig as string) : {};
          toolConfig = {
            name: conn.name.replace(/[^a-zA-Z0-9_-]/g, ""),
            endpoint: conn.url,
            method: conn.method,
            authType: conn.authType,
            token: authCfg.token,
            user: authCfg.user,
            pass: authCfg.pass,
            tokenUrl: authCfg.tokenUrl,
            parameters: conn.parameters ? JSON.parse(conn.parameters as string) : []
          };
        }
      }
    }

    if (!toolConfig) return console.log("No tool found");

    const url = toolConfig.endpoint;
    const headers = await resolveAuthHeaders(toolConfig.authType, toolConfig);
    const urlObj = new URL(url);
    urlObj.searchParams.append("codigoUnidade", "5354"); // hardcoded for test
    const finalUrl = urlObj.toString();

    console.log("Fetching:", finalUrl);
    const res = await fetch(finalUrl, { method: toolConfig.method || "GET", headers });
    const text = await res.text();
    console.log("AutoCerto Response Length:", text.length);
    let result;
    try { result = JSON.parse(text); } catch { result = text; }

    if (Array.isArray(result)) {
      console.log("AutoCerto Array items:", result.length);
    }

    const contents = [
      { role: "user", parts: [{ text: "gostaria de saber se tem algum gol disponivel para venda?" }] },
      { role: "model", parts: [{ functionCall: { name: toolConfig.name, args: {} } }] },
      { role: "user", parts: [{ functionResponse: { name: toolConfig.name, response: { result } } }] }
    ];

    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + assistant.apiKey;
    console.log("Sending to Gemini...");
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: "You are a test bot." }] } })
    });

    const data2 = await geminiRes.json() as any;
    console.log("Gemini API Response:", JSON.stringify(data2).substring(0, 500));

  } catch (err: any) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
debugSecondCall();
