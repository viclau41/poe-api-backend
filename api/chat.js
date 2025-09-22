
//  /api/chat.js

// 引入你用嚟連接 Poe.com 嘅 library
// 請確保你嘅 package.json 入面有 "poe-client"
import Poe from 'poe-client';

// 呢個係你原本用嚟處理 CORS 嘅 wrapper function，我哋會繼續用佢
const allowCors = (fn) => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 瀏覽器會先用 OPTIONS 方法「打個招呼」，我哋要俾佢通過
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};


// 呢個係處理請求嘅主要函數
const handler = async (req, res) => {
    // 我哋只處理 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 【關鍵修改！】
        // 我哋喺度由請求嘅 body 度，攞出個網站傳過嚟嘅 'message' 同 'model'
        const { message, model } = req.body;

        // 如果個網站冇傳 'message' 過嚟，就話佢知個請求唔啱
        if (!message) {
            return res.status(400).json({ error: "請求內容必須包含 'message' 欄位。" });
        }

        // 初始化 Poe Client
        // 重要：請確保你已經喺 Vercel 專案設定入面，加入咗 POE_TOKEN 環境變數
        if (!process.env.POE_TOKEN) {
             throw new Error("伺服器未設定 POE_TOKEN 環境變數。");
        }
        const client = new Poe({ token: process.env.POE_TOKEN });

        // 決定用邊一個 bot，如果冇指定，就用 Claude-3-Haiku
        const botName = model || 'Claude-3-Haiku';

        // 將個網站傳嚟嘅 `message` 字串，直接傳俾 Poe API
        let replyText = '';
        for await (const chunk of client.query(botName, message)) {
            if (chunk.text_new) {
                replyText += chunk.text_new;
            }
        }
        
        // 將 Poe AI 嘅完整回覆，用 JSON 格式傳返俾個網站
        res.status(200).json({ text: replyText, reply: replyText });

    } catch (error) {
        // 如果中間出錯，回傳一個 500 錯誤俾前端
        console.error("處理請求時發生錯誤:", error);
        res.status(500).json({ error: `伺服器內部錯誤: ${error.message}` });
    }
};


// 最後，將我哋嘅 handler 用 allowCors 包住再 export 出去
export default allowCors(handler);
