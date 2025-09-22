// 檔名: api/chat.js
// 這是最終的安全版本，只允許你自己的網站呼叫

export const config = {
  runtime: 'edge',
};

// --- 安全性升級：指定唯一的允許來源 ---
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://victorlau.myqnapcloud.com', // 只允許你的網站
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
// --- 安全性升級結束 ---

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
      // 接收舊格式的數據
      const clientData = await request.json();
      const clientMessage = clientData.message;
      const clientModel = clientData.model;

      if (!clientMessage) {
        return new Response(JSON.stringify({ error: '請求中缺少 "message" 內容' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) {
        throw new Error('後端 POE_TOKEN 未設定');
      }

      // 將舊格式翻譯成 Poe API 的新格式
      const payloadForPoe = {
        model: clientModel || 'Claude-3-Haiku',
        messages: [
          {
            role: 'user',
            content: clientMessage,
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

      // 將回覆包裝成舊前端想要的格式
      const responseForClient = {
        text: replyContent,
      };

      return new Response(JSON.stringify(responseForClient), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(JSON.stringify({ text: `❌ 處理請求時發生錯誤：${error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('方法不被允許', {
    status: 405,
    headers: { ...corsHeaders, 'Allow': 'POST, OPTIONS' },
  });
}
