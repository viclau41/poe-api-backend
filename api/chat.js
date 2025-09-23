export const config = {
  runtime: 'edge',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // 暫時設為 * 確保能正常運作
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      // 🔍 收集調試信息
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      const referer = request.headers.get('referer');
      
      console.log('=== 調試信息 ===');
      console.log('Origin:', origin);
      console.log('Host:', host);
      console.log('Referer:', referer);
      console.log('==================');
      
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
        stream: false,
      };

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payloadForPoe),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      const data = await apiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || '無回應內容';
      
      // 🔍 在回應中也包含調試信息
      const debugInfo = `\n\n[調試信息] Origin: ${origin}, Host: ${host}`;
      
      return new Response(JSON.stringify({ 
        text: responseText + debugInfo 
      }), {
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
