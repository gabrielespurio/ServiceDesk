import { URL } from 'url';

async function main() {
  const webhookUrl = 'https://n8n.srv1286059.hstgr.cloud/webhook-test/234eedd3-a717-46db-8708-fc493d87028b';
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjOTE3Y2NkYy05MGFlLTQ0ODktOWEyNy1mMTNlOGY1MzVhMjgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzgxNjM3MDIzfQ.MrJwWnwOSbVcDag9WqoFC_8dNLUdrgLneI_dEtYkf3I';
  
  const urlObj = new URL(webhookUrl);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

  const workflowData = {
    name: `[HelpDesk] Agente: Test N8N HTTP Tool`,
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "test-webhook",
          responseMode: "responseNode",
          options: {}
        },
        type: "n8n-nodes-base.webhook",
        typeVersion: 1,
        position: [250, 300],
        id: "webhook-node",
        name: "Webhook"
      },
      {
        parameters: {
          options: {}
        },
        type: "@n8n/n8n-nodes-langchain.agent",
        typeVersion: 1,
        position: [480, 300],
        id: "agent-node",
        name: "AI Agent"
      },
      {
        parameters: {
          modelName: 'gemini-1.5-flash',
          options: {}
        },
        type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
        typeVersion: 1,
        position: [480, 480],
        id: "model-node",
        name: "Google Gemini Chat Model"
      },
      {
        parameters: {},
        type: "@n8n/n8n-nodes-langchain.toolHttpRequest",
        typeVersion: 1,
        position: [600, 480],
        id: "http-tool",
        name: "Read Webpage"
      },
      {
        parameters: {
          respondWith: "allIncomingData",
          options: {}
        },
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.1,
        position: [720, 300],
        id: "respond-node",
        name: "Respond to Webhook"
      }
    ],
    connections: {
      "Webhook": {
        "main": [
          [
            {
              "node": "AI Agent",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "AI Agent": {
        "main": [
          [
            {
              "node": "Respond to Webhook",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Google Gemini Chat Model": {
        "ai_languageModel": [
          [
            {
              "node": "AI Agent",
              "type": "ai_languageModel",
              "index": 0
            }
          ]
        ]
      },
      "Read Webpage": {
        "ai_tool": [
          [
            {
              "node": "AI Agent",
              "type": "ai_tool",
              "index": 0
            }
          ]
        ]
      }
    },
    settings: {}
  };

  try {
    const response = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: "POST",
      headers: {
        "X-N8N-API-KEY": authToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(workflowData)
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.log(`Failed N8N API Call: ${response.status} ${response.statusText}`);
      console.log(`Error Body:`, errText);
    } else {
      const data = await response.json();
      console.log(`Success:`, data);
    }
  } catch (err) {
    console.log(`Fetch Error:`, err);
  }
}
main();
