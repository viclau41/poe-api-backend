export const config = {
  runtime: 'edge',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      const requestData = await request.json();
      
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

      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: false,  // ⭐ 改為 false，返回普通JSON
      };

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',  // ⭐ 改為接受JSON
        },
        body: JSON.stringify(payloadForPoe),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      const data = await apiResponse.json();
      
      // ⭐ 提取回應文本並返回符合前端期望的格式
      const responseText = data.choices?.[0]?.message?.content || '無回應內容';
      
      return new Response(JSON.stringify({ text: responseText }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
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
