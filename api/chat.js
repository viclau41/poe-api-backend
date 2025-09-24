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

// 🔧 確保所有響應都有完整的 CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400', // 24小時
};

export default async function handler(request) {
  try {
    // 處理 OPTIONS 預檢請求
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204, 
        headers: corsHeaders 
      });
    }

    // 處理 GET 請求（測試用）
    if (request.method === 'GET') {
      return new Response(JSON.stringify({
        status: '✅ Victor API 運行中',
        timestamp: new Date().toISOString(),
        poeToken: process.env.POE_TOKEN ? '✅ 已設定' : '❌ 未設定',
        allowedOrigin: 'https://victorlau.myqnapcloud.com'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 處理 POST 請求
    if (request.method === 'POST') {
      const origin = request.headers.get('origin');
      const apiKey = request.headers.get('x-api-key');
      
      // 驗證來源或密鑰
      const validOrigin = origin?.includes('victorlau.myqnapcloud.com');
      const validKey = keyMap[apiKey] !== undefined;
      
      if (!validOrigin && !validKey) {
        return new Response(JSON.stringify({ 
          text: '❌ 訪問被拒絕：無效來源或密鑰' 
        }), { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // 記錄訪問
      if (validKey) {
        console.log(`API 訪問：密鑰 ${apiKey} (${keyMap[apiKey]})`);
      }
      
      let requestData;
      try {
        requestData = await request.json();
      } catch (parseError) {
        return new Response(JSON.stringify({ 
          text: '❌ 請求格式錯誤：無效的 JSON' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      let message, model;
      if (requestData.messages) {
        message = requestData.messages[0]?.content;
        model = requestData.bot_name;
      } else {
        message = requestData.message;
        model = requestData.model;
      }

      if (!message) { 
        return new Response(JSON.stringify({ 
          text: '❌ 缺少必要參數：message' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        return new Response(JSON.stringify({ 
          text: '❌ 服務配置錯誤：POE_TOKEN 未設定' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: false,
      };

      try {
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
          throw new Error(`Poe API 錯誤 (${apiResponse.status}): ${errorText.substring(0, 200)}`);
        }

        const data = await apiResponse.json();
        const responseText = data.choices?.[0]?.message?.content || '❌ AI 未提供有效回應';
        
        return new Response(JSON.stringify({ 
          text: responseText 
        }), {
          status: 200,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });

      } catch (apiError) {
        console.error('Poe API 錯誤:', apiError);
        return new Response(JSON.stringify({ 
          text: `❌ AI 服務暫時不可用: ${apiError.message}` 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // 不支持的 HTTP 方法
    return new Response(JSON.stringify({
      text: '❌ 不支持的請求方法'
    }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (globalError) {
    // 🔧 全域錯誤處理，確保始終有 CORS headers
    console.error('全域錯誤:', globalError);
    return new Response(JSON.stringify({
      text: `❌ 服務器內部錯誤: ${globalError.message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
