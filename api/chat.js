// 檔名: api/chat.js
// 修正版：支援六壬程式的 JSON 格式

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
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      const origin = request.headers.get('origin');
      if (origin !== allowedOrigin) {
        return new Response('Forbidden', { status: 403 });
      }

      const { message, model, messages } = await request.json();
      
      // 支援兩種格式：舊的 message 和新的 messages
      let finalMessage;
      if (messages) {
        finalMessage = messages[0].content;  // 新格式
      } else if (message) {
        finalMessage = message;  // 舊格式
      } else {
        throw new Error('請求中缺少 "message" 或 "messages"');
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { throw new Error('後端 POE_TOKEN 未設定'); }

      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: finalMessage }],
        stream: false,  // 改為非串流模式，支援六壬程式
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

      const responseData = await apiResponse.json();
      const replyContent = responseData.choices[0].message.content;

      // 返回六壬程式期望的格式
      const responseForClient = { text: replyContent };

      return new Response(JSON.stringify(responseForClient), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(JSON.stringify({ text: `❌ 伺服器內部錯誤：${error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  return new Response('方法不被允許', { status: 405, headers: corsHeaders });
}
