// 檔名: api/chat.js
// 修正為正確的 Poe API 格式

export const config = {
  runtime: 'edge',
};

const allowedOrigin = 'https://victorlau.myqnapcloud.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(request) {
  // 處理 OPTIONS 請求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      // 檢查來源
      const origin = request.headers.get('origin');
      if (origin !== allowedOrigin) {
        return new Response('Forbidden', { status: 403 });
      }

      const { message, model } = await request.json();
      if (!message) { 
        throw new Error('請求中缺少 "message"'); 
      }

      // 🎯 使用正確的 Poe API 格式！
      const payloadForPoe = {
        messages: [
          { role: "user", content: message }
        ],
        bot_name: model || "Claude-3-Haiku"  // 👈 使用 bot_name 而不是 model
      };

      console.log(`使用機器人: ${model || "Claude-3-Haiku"}`);

      // 🎯 直接調用真正的 Poe API
      const apiResponse = await fetch('https://poe-api-backend.vercel.app/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadForPoe),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      // 解析回應（假設返回 JSON 格式）
      const poeData = await apiResponse.json();
      
      // 提取文字回應
      const text = poeData.text || poeData.response || poeData.content || '無法獲取回應';

      return new Response(JSON.stringify({ text }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        text: `❌ 伺服器內部錯誤：${error.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method Not Allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
}
