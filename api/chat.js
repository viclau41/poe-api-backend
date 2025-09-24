export default async function handler(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const message = body.messages?.[0]?.content || body.message || '測試';
    
    return new Response(JSON.stringify({
      text: `✅ API 連接成功！收到您的訊息：${message}`
    }), { status: 200, headers });
  }

  return new Response('Method not allowed', { status: 405, headers });
}
