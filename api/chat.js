export default async function handler(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const message = body.messages?.[0]?.content || body.message || '測試';
      
      // 立即響應，不等待外部 API
      return new Response(JSON.stringify({
        text: `🤖 Victor AI 助手：收到您的問題「${message}」

基於您的六壬盤式，我建議：
• 此事宜謹慎行事，觀察時機
• 近期內可能有轉機出現  
• 建議多聽取他人意見

💡 這是基礎分析，如需詳細解讀請聯繫 WhatsApp: 6188 3889

⚠️ 注意：AI 服務正在升級中，暫時提供簡化分析。`
      }), { 
        status: 200, 
        headers 
      });

    } catch (error) {
      return new Response(JSON.stringify({
        text: `❌ 處理錯誤：${error.message}`
      }), { 
        status: 500, 
        headers 
      });
    }
  }

  return new Response(JSON.stringify({
    text: '✅ Victor AI API 服務正常運行'
  }), { 
    status: 200, 
    headers 
  });
}
