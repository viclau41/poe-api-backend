export const config = {
  runtime: 'nodejs',  // 改為 nodejs
};

// 密鑰映射系統
const keyMap = {
  '529': 'green',
  '315': 'red', 
  '412': 'blue',
  '61883889': 'phone',
};

// 🔧 完整的 CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, Origin',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

// 🔧 統一的響應函數，確保所有響應都有 CORS
function createResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders
  });
}

export default async function handler(request) {
  // 🔧 無論什麼情況都先處理 CORS
  const origin = request.headers.get('origin');
  const method = request.method;
  
  console.log(`📊 請求: ${method} from ${origin}`);

  try {
    // 處理 OPTIONS 預檢請求
    if (method === 'OPTIONS') {
      console.log('✅ OPTIONS 請求處理');
      return new Response(null, { 
        status: 204, 
        headers: corsHeaders 
      });
    }

    // 處理 GET 請求（測試用）
    if (method === 'GET') {
      console.log('✅ GET 請求處理');
      return createResponse({
        status: '✅ Victor API 運行中',
        timestamp: new Date().toISOString(),
        poeToken: process.env.POE_TOKEN ? '✅ 已設定' : '❌ 未設定',
        allowedOrigin: '*',
        method: 'GET'
      });
    }

    // 處理 POST 請求
    if (method === 'POST') {
      console.log('📝 POST 請求開始處理');
      
      // 🔧 簡化權限檢查 - 優先使用密鑰，其次檢查來源
      const apiKey = request.headers.get('x-api-key');
      const validKey = keyMap[apiKey] !== undefined;
      const validOrigin = !origin || origin.includes('victorlau.myqnapcloud.com') || origin.includes('localhost');
      
      console.log(`🔑 密鑰檢查: ${apiKey} -> ${validKey ? '有效' : '無效'}`);
      console.log(`🌐 來源檢查: ${origin} -> ${validOrigin ? '有效' : '無效'}`);
      
      // 🔧 寬鬆的權限檢查（開發期間）
      if (!validOrigin && !validKey) {
        console.log('❌ 權限檢查失敗');
        return createResponse({ 
          text: '❌ 訪問被拒絕：請使用正確的來源或API密鑰',
          origin: origin,
          hasKey: !!apiKey
        }, 403);
      }
      
      // 解析請求數據
      let requestData;
      try {
        const rawBody = await request.text();
        console.log('📄 請求內容:', rawBody.substring(0, 100));
        requestData = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('❌ JSON 解析錯誤:', parseError.message);
        return createResponse({ 
          text: '❌ 請求格式錯誤：無效的 JSON',
          error: parseError.message
        }, 400);
      }
      
      // 提取消息和模型
      let message, model;
      if (requestData.messages && Array.isArray(requestData.messages)) {
        message = requestData.messages[0]?.content;
        model = requestData.bot_name;
      } else {
        message = requestData.message;
        model = requestData.model;
      }

      console.log(`💬 消息: ${message?.substring(0, 50)}...`);
      console.log(`🤖 模型: ${model}`);

      if (!message) { 
        console.log('❌ 缺少消息參數');
        return createResponse({ 
          text: '❌ 缺少必要參數：message',
          received: Object.keys(requestData)
        }, 400);
      }

      // 檢查 POE_TOKEN
      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        console.log('❌ POE_TOKEN 未設定');
        return createResponse({ 
          text: '❌ 服務配置錯誤：POE_TOKEN 未設定'
        }, 500);
      }

      // 準備 Poe API 請求
      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: false,
      };

      console.log('🚀 調用 Poe API...');

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

        console.log(`📊 Poe API 響應狀態: ${apiResponse.status}`);

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          const errorMsg = `Poe API 錯誤 (${apiResponse.status}): ${errorText.substring(0, 200)}`;
          console.error('❌ Poe API 錯誤:', errorMsg);
          throw new Error(errorMsg);
        }

        const data = await apiResponse.json();
        const responseText = data.choices?.[0]?.message?.content || '❌ AI 未提供有效回應';
        
        console.log(`✅ AI 回應: ${responseText.substring(0, 100)}...`);
        
        return createResponse({ 
          text: responseText,
          model: model || 'Claude-3-Haiku-20240307',
          timestamp: new Date().toISOString()
        });

      } catch (apiError) {
        console.error('❌ Poe API 調用失敗:', apiError.message);
        return createResponse({ 
          text: `❌ AI 服務暫時不可用: ${apiError.message}`,
          error: 'POE_API_ERROR'
        }, 500);
      }
    }
    
    // 不支持的 HTTP 方法
    console.log(`❌ 不支持的方法: ${method}`);
    return createResponse({
      text: `❌ 不支持的請求方法: ${method}`,
      allowedMethods: ['GET', 'POST', 'OPTIONS']
    }, 405);

  } catch (globalError) {
    // 🔧 全域錯誤處理
    console.error('❌ 全域錯誤:', globalError.message);
    return createResponse({
      text: `❌ 服務器內部錯誤: ${globalError.message}`,
      error: 'GLOBAL_ERROR'
    }, 500);
  }
}
