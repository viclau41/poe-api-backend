export default function handler(req, res) {
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
      
      // 🔧 暫時返回測試回應，確認連接正常
      return res.status(200).json({
        text: `✅ API 連接成功！收到訊息："${message.substring(0, 50)}"`,
        model: model || 'test-mode',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      return res.status(500).json({
        text: `❌ 服務器錯誤：${error.message}`
      });
    }
  }
  
  // 不支持的方法
  return res.status(405).json({
    text: '❌ 方法不被允許'
  });
}
