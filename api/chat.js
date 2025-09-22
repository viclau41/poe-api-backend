// 檔名: api/chat.js
// 請將以下所有內容完整複製並取代你 GitHub 上的舊檔案內容

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // --- CORS 歡迎通告 ---
  // 我哋喺度明確話俾瀏覽器知，只允許你嘅風水網站嚟攞資料
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://victorlau.myqnapcloud.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 處理瀏覽器嘅「先行請求」(Preflight Request)，直接話俾佢知「無問題，你可以繼續」
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  // --- CORS 設定結束 ---


  // --- 原有嘅 API 邏輯 ---
  if (request.method === 'POST') {
    try {
      const { messages, bot_name } = await request.json();
      const poeToken = process.env.POE_TOKEN;

      if (!poeToken) {
        return new Response(JSON.stringify({ error: '後端 POE_TOKEN 未設定' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload = {
        model: bot_name || 'Claude-3-Haiku',
        messages: messages,
        stream: false,
      };

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!apiResponse.ok) {
         const errorText = await apiResponse.text();
         return new Response(JSON.stringify({ error: 'Poe API 請求失敗', details: errorText }), {
          status: apiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const responseData = await apiResponse.json();
      const replyContent = responseData.choices[0].message.content;

      // 喺成功回覆時，都附上「歡迎通告」
      return new Response(JSON.stringify({ reply: replyContent }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: '後端內部伺服器錯誤' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // 如果唔係 POST 或 OPTIONS 請求，就回覆唔允許
  return new Response('方法不被允許', {
    status: 405,
    headers: { ...corsHeaders, 'Allow': 'POST, OPTIONS' },
  });
}
