// 檔名: api/chat.js
// 這是最終的伺服器端程式碼，它會遷就舊的前端程式

export const config = {
  runtime: 'edge',
};

// CORS 歡迎通告，允許你的風水網站和任何來源 (*) 進行測試
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 改成 * 增加兼容性，允許任何網站呼叫
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(request) {
  // 處理瀏覽器的「先行請求」(Preflight Request)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method === 'POST') {
    try {
      // --- 改造點 1：接收舊格式的數據 ---
      // 我們預期前端會傳來 { message: "...", model: "..." }
      const clientData = await request.json();
      const clientMessage = clientData.message; // 舊格式的 key 是 'message'
      const clientModel = clientData.model;     // 舊格式的 key 是 'model'

      if (!clientMessage) {
        return new Response(JSON.stringify({ error: '請求中缺少 "message" 內容' }), {
          status: 400, // Bad Request
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) {
        throw new Error('後端 POE_TOKEN 未設定');
      }

      // --- 改造點 2：將舊格式翻譯成 Poe API 的新格式 ---
      const payloadForPoe = {
        model: clientModel || 'Claude-3-Haiku', // 如果前端有指定模型就用，否則用預設
        messages: [
          {
            role: 'user',
            content: clientMessage, // 將前端的 message 內容放入
          },
        ],
        stream: false,
      };

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadForPoe),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      const responseData = await apiResponse.json();
      const replyContent = responseData.choices[0].message.content;

      // --- 改造點 3：將回覆包裝成舊前端想要的格式 ---
      // 舊前端期望的 key 是 'text'
      const responseForClient = {
        text: replyContent,
      };

      return new Response(JSON.stringify(responseForClient), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      // 統一處理所有錯誤
      return new Response(JSON.stringify({ text: `❌ 處理請求時發生錯誤：${error.message}` }), {
        status: 500, // Internal Server Error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // 如果不是 POST 或 OPTIONS 請求，就回覆不允許
  return new Response('方法不被允許', {
    status: 405,
    headers: { ...corsHeaders, 'Allow': 'POST, OPTIONS' },
  });
}
