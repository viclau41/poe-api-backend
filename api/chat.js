export default async function handler(request) {
  const headers = {
    'Access-Control-Allow-Origin': 'https://victorlau.myqnapcloud.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // 臨時返回固定響應
  return new Response(JSON.stringify({
    text: '✅ Victor API 臨時離線維護中，請使用內置分析功能'
  }), { status: 200, headers });
}
