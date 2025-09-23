// 檔名: api/chat.js
// 終極串流方案 (Streaming Version)

export const config = {
  runtime: 'edge',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 暫時用 * 確保連接性
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-control-allow-headers': 'Content-Type, Authorization',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      const { message, model } = await request.json();

      if (!message) {
        return new Response(JSON.stringify({ error: '請求中缺少 "message" 內容' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { throw new Error('後端 POE_TOKEN 未設定'); }

      // 串流模式唔需要我哋手動加「接力賽」指令
      // 因為數據係一路返，自然解決咗單次超時問題
      const payloadForPoe = {
        model: model || 'Claude-3-Haiku', // 尊重前端選擇
        messages: [{ role: 'user', content: message }],
        // --- 【核心改動】---
        stream: true, // 開啟串流模式！
        // --------------------
      };

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream', // 告訴 Poe 我哋要接收串流
        },
        body: JSON.stringify(payloadForPoe),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      // 直接將 Poe 返回嘅串流數據，原封不動咁傳返俾前端
      return new Response(apiResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream; charset=utf-8', // 必須設定正確嘅 Content-Type
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } catch (error) {
      console.error('[Vercel Log] Internal Handler Error:', error);
      // 喺串流模式下，錯誤處理要更小心
      return new Response(JSON.stringify({ text: `❌ 伺服器內部發生致命錯誤：${error.message}` }), {
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
