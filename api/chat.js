export const config = {
  runtime: 'edge',
};

// 🎨 顏色代碼對照表（方案1）- 呢個暫時唔會用到，但保留喺度
const keyMap = {
  '529': 'green',    // g(103) + r(114) + e(101) + e(101) + n(110) = 529
  '315': 'red',      // r(114) + e(101) + d(100) = 315
  '412': 'blue',     // b(98) + l(108) + u(117) + e(101) = 424 (如果需要)
  '61883889': 'phone', // 您的電話號碼作為備用
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      // ------------------- 安全驗證已暫時停用 -------------------
      // const origin = request.headers.get('origin');
      // const apiKey = request.headers.get('x-api-key');
      
      // // 🔒 雙重驗證：域名 OR 有效密鑰
      // const validOrigin = origin?.includes('victorlau.myqnapcloud.com');
      // const validKey = keyMap[apiKey] !== undefined;  // ⭐ 檢查密鑰是否在對照表中
      
      // if (!validOrigin && !validKey) {
      //   return new Response('Forbidden', { status: 403 });
      // }
      // ---------------------------------------------------------
      
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
      return new Response(JSON.stringify({ text: `❌ 伺服器內部錯誤：${error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  return new Response('方法不被允許', { status: 405, headers: corsHeaders });
}
