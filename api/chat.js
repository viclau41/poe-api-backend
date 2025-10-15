export default async function handler(req, res) {
  // 🔒 只檢查域名來源
  const allowedOrigin = 'https://victorlau.myqnapcloud.com';
  const origin = req.headers.origin;
  
  // 檢查是否來自您的網站
  const isValidOrigin = origin === allowedOrigin || 
                       origin === 'https://www.victorlau.myqnapcloud.com';
  
  // 設置 CORS
  if (isValidOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  const { method } = req;
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method === 'GET') {
    return res.status(200).json({
      status: '✅ Victor API 運行中',
      timestamp: new Date().toISOString(),
      poeToken: process.env.POE_TOKEN ? '✅ 已設定' : '❌ 未設定'
    });
  }
  
  if (method === 'POST') {
    // 🔒 簡單檢查來源
    if (!isValidOrigin) {
      console.log('❌ 非法來源:', origin);
      return res.status(403).json({
        text: '❌ 訪問被拒絕'
      });
    }
    
    try {
      const { message, model } = req.body || {};
      
      if (!message) {
        return res.status(400).json({ text: '❌ 缺少 message' });
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) {
        return res.status(500).json({ text: '❌ POE_TOKEN 未設定' });
      }

      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: false,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);

      try {
        const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${poeToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payloadForPoe),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          throw new Error(`Poe API 錯誤 (${apiResponse.status}): ${errorText.substring(0, 200)}`);
        }

        const data = await apiResponse.json();
        const responseText = data.choices?.[0]?.message?.content || '❌ AI 未提供有效回應';
        
        return res.status(200).json({
          text: responseText,
          model: payloadForPoe.model,
          timestamp: new Date().toISOString()
        });

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          return res.status(408).json({
            text: '❌ AI 響應超時，請稍後重試'
          });
        }
        throw fetchError;
      }
      
    } catch (error) {
      console.error('❌ API 錯誤:', error.message);
      return res.status(500).json({
        text: `❌ AI 服務暫時不可用：${error.message}`
      });
    }
  }
  
  return res.status(405).json({ text: '❌ 方法不允許' });
}
