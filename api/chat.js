export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://victorlau.myqnapcloud.com',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const message = body.messages?.[0]?.content || body.message || '測試';
    
    return new Response(JSON.stringify({
      text: `✅ Victor AI 助手回應：收到您的問題「${message}」。API 連接正常，但需要配置 POE_TOKEN 才能提供 AI 分析。`
    }), { status: 200, headers: corsHeaders });
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
}
