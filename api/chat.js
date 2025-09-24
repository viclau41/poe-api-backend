// 最終正式版本：包含完整功能和詳細日誌記錄
export default async function handler(req, res) {
  // --- 設置 CORS 和 Header，允許跨域請求 ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  // 處理瀏覽器發送的 OPTIONS 預檢請求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // --- 黑盒記錄：第一站，記錄函數被觸發 ---
  console.log('--- [START] API Function Triggered ---');
  console.log(`[INFO] Request received at: ${new Date().toISOString()}`);

  try {
    // 從請求中解構出需要的資料
    const { message, model, bot_name, messages } = req.body;
    const apiKey = req.headers['x-api-key'];

    // --- 黑盒記錄：檢查從前端收到的資料 ---
    console.log('[INFO] Incoming request body:', JSON.stringify(req.body, null, 2));
    console.log('[INFO] Incoming local API Key from header (x-api-key):', apiKey);

    // 從環境變數中讀取 Poe API Key
    const poeApiKey = process.env.POE_API_KEY_FOR_529;

    // 驗證前端傳來的本地密鑰是否正確 (呢度我哋簡化咗，直接用環境變數)
    if (apiKey !== '529' || !poeApiKey) {
      console.error('[ERROR] Invalid local API key or missing POE_API_KEY_FOR_529 in Vercel environment. Provided key:', apiKey);
      return res.status(401).json({ text: '❌ 錯誤：無效的 API 密鑰或伺服器配置不當。' });
    }
    
    // --- 黑盒記錄：確認 Poe Key 已找到 ---
    console.log('[INFO] Poe API Key found and will be used.');

    // 準備發送給 Poe API 的資料
    const targetBot = bot_name || 'Claude-3-Haiku';
    const requestData = {
      query: messages || [{ role: "user", content: message }],
      bot: targetBot,
      stream: false,
    };

    // --- 黑盒記錄：發送請求到 Poe API 之前 ---
    console.log('[INFO] Sending request to Poe API with bot:', targetBot);
    
    // 使用 fetch 向 Poe API 發送請求
    const poeResponse = await fetch('https://api.poe.com/v2/chat/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${poeApiKey}`,
      },
      body: JSON.stringify(requestData),
    });

    // --- 黑盒記錄：收到 Poe API 回應後 ---
    console.log(`[INFO] Received response from Poe. Status: ${poeResponse.status}`);

    // 檢查 Poe API 的回應是否成功
    if (!poeResponse.ok) {
      const errorText = await poeResponse.text();
      console.error('[ERROR] Poe API returned an error:', errorText);
      return res.status(poeResponse.status).json({ text: `❌ Poe API 錯誤: ${errorText}` });
    }
    
    // 解析 Poe API 的 JSON 回應
    const responseData = await poeResponse.json();
    // 提取 AI 的回覆文字，如果沒有則提供預設訊息
    const replyText = responseData.text || 'AI 未能提供有效回應。';

    // --- 黑盒記錄：成功結束前 ---
    console.log('[SUCCESS] Successfully processed request. Sending reply back to client.');
    console.log('--- [END] API Function Completed ---');
    
    // 將 AI 的回覆以 { "text": "..." } 的格式發送回前端
    res.status(200).json({ text: replyText });

  } catch (error) {
    // --- 黑盒記錄：捕捉到任何意外的程式錯誤 ---
    console.error('[FATAL] An unexpected error occurred in the catch block:', error);
    console.log('--- [END] API Function Failed ---');
    res.status(500).json({ text: `❌ 伺服器內部錯誤: ${error.message}` });
  }
}
