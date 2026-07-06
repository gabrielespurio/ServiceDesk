import { URL } from 'url';

async function main() {
  const baseUrl = 'https://n8n.srv1286059.hstgr.cloud';
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjOTE3Y2NkYy05MGFlLTQ0ODktOWEyNy1mMTNlOGY1MzVhMjgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzgxNjM3MDIzfQ.MrJwWnwOSbVcDag9WqoFC_8dNLUdrgLneI_dEtYkf3I';

  const credData = {
    name: "HelpDesk Gemini API Key",
    type: "googleGeminiSdkApi",
    data: {
      apiKey: "TEST_API_KEY_123"
    }
  };

  try {
    const response = await fetch(`${baseUrl}/api/v1/credentials`, {
      method: "POST",
      headers: {
        "X-N8N-API-KEY": authToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(credData)
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.log(`Failed: ${response.status} ${response.statusText}`);
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
