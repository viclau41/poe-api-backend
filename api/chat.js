export default async function handler(req, res) {
  // --- START: CORS Preflight & Headers ---
  // 設置允許跨域請求的來源。'*' 代表允許任何來源，開發時最方便。
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  // 設置允許的 HTTP 方法
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  // 設置允許的請求標頭
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  // 處理瀏覽器的 "preflight" 預檢請求 (OPTIONS method)
  // 這是瀏覽器在發送 POST 請求前，先來問路確認安唔安全
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  // --- END: CORS Preflight & Headers ---

  // --- 以下是你原本的 API 邏輯 ---
  const { message, model, bot_name, messages } = req.body;
  const apiKey = req.headers['x-api-key'];

  // 密鑰驗證邏輯
  const POE_API_KEY_MAP = {
    '529': process.env.POE_API_KEY_FOR_529, // Victor 的密鑰
    // 在這裡可以添加更多密鑰
  };

  const poeApiKey = POE_API_KEY_MAP[apiKey];

  if (!poeApiKey) {
    return res.status(401).json({ text: '❌ 錯誤：無效的 API 密鑰。' });
  }

  // 確定要使用的 bot
  // 如果前端指定了 bot_name，就用佢，否則根據密鑰決定
  const targetBot = bot_name || (apiKey === '529' ? 'Claude-3-Haiku' : 'Gemma-2-9b-It');

  // 準備發送到 Poe 的數據
  const requestData = {
    // Poe API v2 期待一個 `query` 數組
    query: messages || [
      {
        role: "user",
        content: message,
      },
    ],
    bot: targetBot,
    // 其他可能需要的參數
  };

  try {
    const response = await fetch('https://api.poe.com/v2/chat/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${poeApiKey}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Poe API Error:', errorText);
      // 將 Poe 返回的錯誤信息傳遞給前端
      return res.status(response.status).json({ text: `❌ Poe API 錯誤: ${errorText}` });
    }

    const data = await response.json();
    // Poe v2 API 的回應格式可能唔同，需要根據實際情況調整
    // 假設成功的回應在 data.text 或類似的欄位
    const replyText = data.text || JSON.stringify(data); // 如果沒有 text 欄位，就返回整個 JSON

    res.status(200).json({ text: replyText });

  } catch (error) {
    console.error('Internal Server Error:', error);
    res.status(500).json({ text: `❌ 伺服器內部錯誤: ${error.message}` });
  }
}
