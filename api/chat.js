export const config = {
  runtime: 'edge',
};

// 改回原來的開放設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',        // ⭐ 改回 * 
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      // ⭐ 移除這段來源檢查：
      // const origin = request.headers.get('origin');
      // if (origin !== allowedOrigin) {
      //   return new Response('Forbidden', { status: 403 });
      // }

      const requestData = await request.json();
      
      // 支援兩種格式
      let message, model;
      if (requestData.messages) {
        message = requestData.messages[0]?.content;
        model = requestData.bot_name;
      } else {
        message = requestData.message;
        model = requestData.model;
      }

      if (!message) { 
        throw new Error('請求中缺少 "message"'); 
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        throw new Error('後端 POE_TOKEN 未設定'); 
      }

      // ⭐ 確保支援所有AI模型
      const finalModel = model || 'Claude-3-Haiku-20240307';

      const payloadForPoe = {
        model: finalModel,
        messages: [{ role: 'user', content: message }],
        stream: true,
      };

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payloadForPoe),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      return new Response(apiResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream; charset=utf-8',
        },
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
