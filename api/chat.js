export const config = {
  runtime: 'edge',
};

// 密鑰映射系統
const keyMap = {
  '529': 'green',
  '315': 'red', 
  '412': 'blue',
  '61883889': 'phone',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 添加 GET 支持用於測試
  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'Victor API Working',
      timestamp: new Date().toISOString(),
      poeToken: process.env.POE_TOKEN ? 'Configured' : 'Not Set'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'POST') {
    try {
      const origin = request.headers.get('origin');
      const apiKey = request.headers.get('x-api-key');
      
      // 驗證來源或密鑰
      const validOrigin = origin?.includes('victorlau.myqnapcloud.com');
      const validKey = keyMap[apiKey] !== undefined;
      
      if (!validOrigin && !validKey) {
        return new Response(JSON.stringify({ 
          text: 'Access Forbidden' 
        }), { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // 記錄訪問（如果使用密鑰）
      if (validKey) {
        console.log(`Access granted with key: ${keyMap[apiKey]}`);
      }
      
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
        throw new Error('Missing message in request'); 
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        throw new Error('POE_TOKEN not configured'); 
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
        throw new Error(`Poe API failed (${apiResponse.status}): ${errorText}`);
      }

      const data = await apiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || 'No response content';
      
      return new Response(JSON.stringify({ 
        text: responseText 
      }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        text: `Server error: ${error.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  return new Response(JSON.stringify({
    text: 'Method not allowed'
  }), { 
    status: 405, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
