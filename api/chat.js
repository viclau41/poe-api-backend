export default async function handler(req, res) {
  // 設置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Content-Type', 'application/json');
  
  const { method } = req;
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method === 'GET') {
    return res.status(200).json({
      status: '✅ API 運行中',
      timestamp: new Date().toISOString(),
      poeToken: process.env.POE_TOKEN ? '✅ 已設定' : '❌ 未設定',
      tokenLength: process.env.POE_TOKEN ? process.env.POE_TOKEN.length : 0
    });
  }
  
  if (method === 'POST') {
    try {
      console.log('📝 POST 請求開始', { body: req.body });
      
      const { message, model } = req.body || {};
      
      if (!message) {
        console.log('❌ 缺少 message');
        return res.status(400).json({ text: '❌ 缺少 message' });
      }

      const poeToken = process.env.POE_TOKEN;
      console.log('🔑 POE_TOKEN 檢查:', { 
        exists: !!poeToken, 
        length: poeToken ? poeToken.length : 0 
      });

      if (!poeToken) {
        console.log('❌ POE_TOKEN 未設定');
        return res.status(500).json({ 
          text: '❌ POE_TOKEN 環境變數未設定' 
        });
      }

      // 🔧 暫時返回調試信息，不調用真正的 Poe API
      console.log('✅ 準備調用 Poe API');
      
      return res.status(200).json({
        text: `🔧 調試模式：收到訊息「${message.substring(0, 50)}」，POE_TOKEN 已設定（長度：${poeToken.length}），準備調用模型：${model || 'gpt-5-mini'}`,
        debug: true,
        poeTokenSet: true,
        messageLength: message.length
      });
      
    } catch (error) {
      console.error('❌ 捕獲錯誤:', error);
      return res.status(500).json({
        text: `❌ 錯誤：${error.message}`,
        stack: error.stack
      });
    }
  }
  
  return res.status(405).json({ text: '❌ 方法不允許' });
}
