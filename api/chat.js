// 引入你需要嘅 poe-client 套件
import { Client } from 'poe-client';

// 呢個係 Vercel Serverless Function 嘅主函數
export default async function handler(request, response) {
    
    // --- CORS 授權設定 (新加嘅部分) ---
    // 設定邊個網域可以存取我哋嘅 API
    response.setHeader('Access-Control-Allow-Origin', 'https://victorlau.myqnapcloud.com');
    // 你也可以用 '*' 允許所有網域，但指定網域會比較安全
    // response.setHeader('Access-Control-Allow-Origin', '*');
    
    // 設定允許嘅請求方法
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    // 設定允許嘅請求標頭
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 瀏覽器喺發送正式 POST 請求之前，會先發一個 OPTIONS "preflight" 請求嚟查詢授權
    // 如果係 OPTIONS 請求，我哋直接回傳 200 OK 就得，唔使做其他嘢
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    // --- 你原本嘅 API 邏輯 ---
    // 確保呢個係一個 POST 請求
    if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        // 從 Vercel 嘅環境變數度讀取 POE_TOKEN
        const token = process.env.POE_TOKEN;
        if (!token) {
            throw new Error('POE_TOKEN is not configured in environment variables.');
        }

        // 從請求嘅 body 度攞返 messages 同 bot_name
        const { messages, bot_name = 'Claude-3-Haiku' } = request.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            response.status(400).json({ error: 'Invalid "messages" in request body.' });
            return;
        }

        // 建立 Poe Client
        const client = new Client({ token });

        // 獲取機械人回應
        let final_text = '';
        for await (const chunk of client.getBotResponse(messages, bot_name)) {
            final_text += chunk.text;
        }

        // 將最終結果用 JSON 格式回傳
        response.status(200).json({ response: final_text });

    } catch (error) {
        console.error('API Error:', error);
        // 如果出錯，回傳 500 錯誤同埋錯誤訊息
        response.status(500).json({ error: error.message });
    }
}
