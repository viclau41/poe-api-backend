// 🔧 使用 Node.js runtime 避免 Edge runtime 的 CORS 問題
export const config = {
  runtime: 'nodejs',
};

// 密鑰映射系統
const keyMap = {
  '529': 'green',
  '315': 'red', 
  '412': 'blue',
  '61883889': 'phone',
};

// 🔧 CORS 處理函數
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Origin');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json');
}

export default async function handler(req, res) {
  // 🔧 首先設置 CORS headers
  setCORSHeaders(res);
  
  const { method, headers } = req;
  const origin = headers.origin;
  
  console.log(`📊 請求: ${method} from ${origin}`);

  try {
    // 處理 OPTIONS 預檢請求
    if (method === 'OPTIONS') {
      console.log('✅ OPTIONS 請求處理');
      return res.status(204).end();
    }

    // 處理 GET 請求（測試用）
    if (method === 'GET') {
      console.log('✅ GET 請求處理');
      return res.status(200).json({
        status: '✅ Victor API 運行中',
        timestamp: new Date().toISOString(),
        poeToken: process.env.POE_TOKEN ? '✅ 已設定' : '❌ 未設定',
        allowedOrigin: '*',
        runtime: 'nodejs'
      });
    }

    // 處理 POST 請求
    if (method === 'POST') {
      console.log('📝 POST 請求開始處理');
      
      // 🔧 簡化權限檢查
      const apiKey = headers['x-api-key'];
      const validKey = keyMap[apiKey] !== undefined;
      const validOrigin = !origin || origin.includes('victorlau.myqnapcloud.com') || origin.includes('localhost');
      
      console.log(`🔑 密鑰檢查: ${apiKey} -> ${validKey ? '有效' : '無效'}`);
      console.log(`🌐 來源檢查: ${origin} -> ${validOrigin ? '有效' : '無效'}`);
      
      // 🔧 暫時放寬權限檢查
      // if (!validOrigin && !validKey) {
      //   console.log('❌ 權限檢查失敗');
      //   return res.status(403).json({ 
      //     text: '❌ 訪問被拒絕：請使用正確的來源或API密鑰',
      //     origin: origin,
      //     hasKey: !!apiKey
      //   });
      // }
      
      // 解析請求數據
      const requestData = req.body;
      console.log('📄 請求數據:', JSON.stringify(requestData).substring(0, 100));
      
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
        return res.status(400).json({ 
          text: '❌ 缺少必要參數：message',
          received: Object.keys(requestData)
        });
      }

      // 檢查 POE_TOKEN
      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        console.log('❌ POE_TOKEN 未設定');
        return res.status(500).json({ 
          text: '❌ 服務配置錯誤：POE_TOKEN 未設定'
        });
      }

      // 準備 Poe API 請求
      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: false,
      };

      console.log('🚀 調用 Poe API...');

      try {
        const fetch = (await import('node-fetch')).default;
        
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
        
        return res.status(200).json({ 
          text: responseText,
          model: model || 'Claude-3-Haiku-20240307',
          timestamp: new Date().toISOString()
        });

      } catch (apiError) {
        console.error('❌ Poe API 調用失敗:', apiError.message);
        return res.status(500).json({ 
          text: `❌ AI 服務暫時不可用: ${apiError.message}`,
          error: 'POE_API_ERROR'
        });
      }
    }
    
    // 不支持的 HTTP 方法
    console.log(`❌ 不支持的方法: ${method}`);
    return res.status(405).json({
      text: `❌ 不支持的請求方法: ${method}`,
      allowedMethods: ['GET', 'POST', 'OPTIONS']
    });

  } catch (globalError) {
    // 🔧 全域錯誤處理
    console.error('❌ 全域錯誤:', globalError.message);
    return res.status(500).json({
      text: `❌ 服務器內部錯誤: ${globalError.message}`,
      error: 'GLOBAL_ERROR'
    });
  }
}
