// 檔名: api/chat.js
// 簡化版本 - 直接返回 JSON 格式

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

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        throw new Error('後端 POE_TOKEN 未設定'); 
      }

      // 關鍵修正：改為非串流模式
      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: false,  // 👈 改為 false！
      };

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadForPoe),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      // 解析回應
      const poeData = await apiResponse.json();
      
      // 提取文字內容
      const text = poeData.choices?.[0]?.message?.content || '無法獲取回應';

      // 返回前端期望的格式
      return new Response(JSON.stringify({ text }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',  // 👈 改為 JSON！
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
