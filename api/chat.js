export default async function handler(req, res) {
  // 🔧 設置 CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Content-Type', 'application/json');
  
  const { method } = req;
  
  // OPTIONS 預檢請求
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET 測試請求
  if (method === 'GET') {
    return res.status(200).json({
      status: '✅ Victor API 運行中',
      timestamp: new Date().toISOString(),
      poeToken: process.env.POE_TOKEN ? '✅ 已設定' : '❌ 未設定'
    });
  }
  
  // POST 請求
  if (method === 'POST') {
    try {
      const { message, model } = req.body || {};
      
      if (!message) {
        return res.status(400).json({ 
          text: '❌ 缺少必要參數：message' 
        });
      }

      // 檢查 POE_TOKEN
      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) {
        return res.status(500).json({ 
          text: '❌ POE_TOKEN 環境變數未設定，請在 Vercel 中配置' 
        });
      }

      // 準備 Poe API 請求
      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: false,
      };

      console.log('🚀 調用 Poe API...', { model: payloadForPoe.model });

      // 調用 Poe API
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
        console.error('❌ Poe API 錯誤:', apiResponse.status, errorText);
        throw new Error(`Poe API 錯誤 (${apiResponse.status}): ${errorText.substring(0, 200)}`);
      }

      const data = await apiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || '❌ AI 未提供有效回應';
      
      console.log('✅ AI 回應長度:', responseText.length);
      
      return res.status(200).json({
        text: responseText,
        model: payloadForPoe.model,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ API 錯誤:', error.message);
      return res.status(500).json({
        text: `❌ AI 服務暫時不可用：${error.message}`
      });
    }
  }
  
  // 不支持的方法
  return res.status(405).json({
    text: '❌ 方法不被允許'
  });
}
