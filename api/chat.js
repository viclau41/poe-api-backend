export default async function handler(req, res) {
  // --- START: CORS Preflight & Headers ---
  // 設置允許跨域請求的來源。'*' 代表允許任何來源。
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  // 處理瀏覽器的 "preflight" 預檢請求 (OPTIONS method)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  // --- END: CORS Preflight & Headers ---

  // --- 以下是 API 的核心邏輯 ---
  try {
    const { message, model, bot_name, messages } = req.body;
    const apiKey = req.headers['x-api-key'];

    const POE_API_KEY_MAP = {
      '529': process.env.POE_API_KEY_FOR_529, // Victor 的密鑰
    };

    const poeApiKey = POE_API_KEY_MAP[apiKey];

    if (!poeApiKey) {
      return res.status(401).json({ text: '❌ 錯誤：無效的 API 密鑰。' });
    }

    const targetBot = bot_name || 'Claude-3-Haiku';

    const requestData = {
      query: messages || [{ role: "user", content: message }],
      bot: targetBot,
      // Poe v2 API 需要 stream 參數
      stream: false, // 暫時關閉串流以簡化，確保能通
    };

    const poeResponse = await fetch('https://api.poe.com/v2/chat/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${poeApiKey}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!poeResponse.ok) {
      const errorText = await poeResponse.text();
      console.error('Poe API Error:', errorText);
      return res.status(poeResponse.status).json({ text: `❌ Poe API 錯誤: ${errorText}` });
    }
    
    // 直接解析 Poe 返回的 JSON 數據
    const responseData = await poeResponse.json();
    
    // Poe v2 非串流模式下，回應通常在 responseData.text
    const replyText = responseData.text || 'AI 未能提供有效回應。';

    // 將組合好的完整文字回傳給前端
    res.status(200).json({ text: replyText });

  } catch (error) {
    console.error('Internal Server Error:', error);
    res.status(500).json({ text: `❌ 伺服器內部錯誤: ${error.message}` });
  }
}
