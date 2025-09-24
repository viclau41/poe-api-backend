// 刪除咗 edge runtime，使用 Vercel 最穩定嘅標準 Node.js 環境

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export default async function handler(request, response) { // 注意：標準模式下，有 request 同 response 兩個參數
  // 處理瀏覽器嘅 OPTIONS 預檢請求
  if (request.method === 'OPTIONS') {
    // 直接使用 response 物件回傳，更標準
    response.status(204).send(null);
    return;
  }

  if (request.method === 'POST') {
    try {
      // ⭐⭐⭐ 關鍵修改！ ⭐⭐⭐
      // 喺標準 Node.js 模式，Vercel 已經幫我哋解析好 body
      // 我哋直接由 request.body 攞就得，唔需要再用 await request.json()
      const requestData = request.body;
      
      let message, model;
      if (requestData.messages) {
        message = requestData.messages[0]?.content;
        model = requestData.bot_name;
      } else {
        message = requestData.message;
        model = requestData.model;
      }

      if (!message) { 
        throw new Error('請求中缺少 "message" 內容'); 
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        throw new Error('後端錯誤：POE_TOKEN 未在 Vercel 環境變數中設定'); 
      }

      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: false,
      };

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
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      const data = await apiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || 'Poe API 未返回有效內容';
      
      // 使用 response 物件回傳成功嘅結果
      response.status(200).json({ text: responseText });

    } catch (error) {
      // 使用 response 物件回傳錯誤訊息
      response.status(500).json({ text: `❌ 伺服器內部錯誤：${error.message}` });
    }
    return; // 確保 POST 處理完就結束
  }
  
  // 如果唔係 POST 或 OPTIONS，就話唔允許
  response.status(405).json({ text: '方法不被允許' });
}
