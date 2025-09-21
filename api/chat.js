// 檔案：/api/chat.js
// 這是【最終實現版本】，使用金鑰 6188388900，並向下相容舊網站

export default async function handler(req, res) {
    // --- 步驟 1：定義驗證所需的變數 ---
    
    // !!重要!! 這裡已使用您指定的金鑰
    const SERVER_SECRET_KEY = '6188388900'; 
    
    // 允許存取的舊版網站來源
    const ALLOWED_ORIGIN = 'https://victorlau.myqnapcloud.com';

    // --- 步驟 2：從請求中獲取驗證資訊 ---

    const clientKey = req.headers['x-client-auth-key'];
    const origin = req.headers.origin;

    // --- 步驟 3：執行雙重驗證邏輯 (核心保安) ---

    const hasValidKey = (clientKey === SERVER_SECRET_KEY);
    const isAllowedOrigin = (origin === ALLOWED_ORIGIN);

    // 如果「既沒有有效金鑰」【而且】「也不是來自允許的網站」，則拒絕存取
    if (!hasValidKey && !isAllowedOrigin) {
        // 403 Forbidden 代表禁止存取
        return res.status(403).json({ error: true, message: 'Forbidden: Invalid Authentication or Origin' });
    }

    // --- 驗證通過！設定動態 CORS 標頭 ---
    // 根據請求的來源動態設定允許的 origin，這是處理本地 file:// 請求的關鍵
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    // **非常重要**：告訴瀏覽器，我們允許客戶端傳送 'X-Client-Auth-Key' 這個標頭
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Auth-Key');

    // 處理瀏覽器的 OPTIONS 預檢請求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // --- 金鑰驗證通過！以下是您原本的 AI 處理邏輯 ---

    if (req.method !== 'POST') {
        return res.status(405).json({ error: true, message: 'Method not allowed' });
    }

    try {
        // 您原本的 AI 邏輯從這裡開始，保持不變
        const { message, model = 'Claude-3-Sonnet' } = req.body; // 我將模型改回 Sonnet，因為 4 不一定可用
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ error: true, message: 'Message is required' });
        }

        const apiKey = process.env.POE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: true, message: 'API key not configured' });
        }

        const response = await fetch('https://api.poe.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ 
                    role: "user", 
                    content: message.trim() 
                }],
                max_tokens: 12000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        let responseText = data.choices[0]?.message?.content || 'AI 回复格式异常，请稍后重试。';

        return res.status(200).json({
            success: true,
            text: responseText,
            model: model,
            usage: data.usage || null
        });

    } catch (error) {
        console.error('Error in API handler:', error);
        return res.status(500).json({ 
            error: true, 
            message: 'Internal server error',
            details: error.message 
        });
    }
}
