import { pool } from "./server/db";
import express from "express";
import session from "express-session";
import passport from "passport";
import fetch from "node-fetch";

// We don't even need to mock express, we can just call the route handler function if we extracted it,
// but it's simpler to directly fetch the database and run the logic manually to see what crashes.

import { db } from "./server/db";
import { aiAssistants, aiConnections } from "./shared/schema";
import { eq } from "drizzle-orm";

async function testLogic() {
  try {
    const assistants = await db.query.aiAssistants.findMany();
    for (const assistant of assistants) {
      console.log("Assistant:", assistant.name);

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
      } else {
        parsedApiTools.push(config);
      }
    }

    console.log("Parsed tools:", JSON.stringify(parsedApiTools, null, 2));

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

    console.log("Gemini Tools:", JSON.stringify(tools, null, 2));

    }
  } catch (err: any) {
    console.error("Crashed:", err.message, err.stack);
  } finally {
    process.exit(0);
  }
}

testLogic();
