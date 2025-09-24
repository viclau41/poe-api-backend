export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      // 立即返回，避免超時
      const body = await request.json();
      const message = body.messages?.[0]?.content || body.message || '測試';
      
      return new Response(JSON.stringify({
        text: `✅ Victor AI 助手：收到您的問題「${message}」。API 連接正常，正在處理中...`
      }), { 
        status: 200, 
        headers: corsHeaders 
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        text: `❌ 處理錯誤：${error.message}`
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  return new Response('Method not allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
}
