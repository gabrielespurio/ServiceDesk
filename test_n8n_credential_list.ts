async function main() {
  const baseUrl = 'https://n8n.srv1286059.hstgr.cloud';
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjOTE3Y2NkYy05MGFlLTQ0ODktOWEyNy1mMTNlOGY1MzVhMjgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzgxNjM3MDIzfQ.MrJwWnwOSbVcDag9WqoFC_8dNLUdrgLneI_dEtYkf3I';

  try {
    const response = await fetch(`${baseUrl}/api/v1/credentials`, {
      method: "GET",
      headers: { "X-N8N-API-KEY": authToken }
    });
    const data = await response.json();
    console.log(`Success:`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log(`Fetch Error:`, err);
  }
}
main();
