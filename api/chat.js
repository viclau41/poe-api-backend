export default async function handler(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method === 'POST') {
    // 模擬處理時間
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return new Response(JSON.stringify({
      text: '✅ API 基礎測試成功！這是測試回應。'
    }), { status: 200, headers });
  }

  return new Response('Method not allowed', { status: 405, headers });
}
