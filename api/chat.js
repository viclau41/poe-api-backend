// 檔名: api/chat.js
// 終極串流方案 (CORS 修正版)

export const config = {
  runtime: 'edge',
};

// 【【【 核心修正！ 】】】
// 我哋唔再用 '*' (任何人)，而係明確指定只允許你嘅網站來源。
// 呢個係最標準、最安全嘅做法。
const allowedOrigin = 'https://victorlau.myqnapcloud.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(request) {
  // 處理瀏覽器發出嘅「preflight」OPTIONS 請求
  // 呢個係解決 CORS 問題嘅關鍵一步！
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      // 檢查請求來源係唔係被允許嘅
      const origin = request.headers.get('origin');
      if (origin !== allowedOrigin) {
        // 如果唔係你嘅網站，就拒絕佢
        return new Response('Forbidden', { status: 403 });
      }

      const { message, model } = await request.json();
      if (!message) { throw new Error('請求中缺少 "message"'); }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { throw new Error('後端 POE_TOKEN 未設定'); }

      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: true,
      };

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payloadForPoe),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      // 將 Poe 嘅串流直接傳返俾你嘅網站，同時附上正確嘅 CORS 頭
      return new Response(apiResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders, // 確保喺最終回應中都包含 CORS 頭
          'Content-Type': 'text/event-stream; charset=utf-8',
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ text: `❌ 伺服器內部錯誤：${error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  return new Response('方法不被允許', { status: 405, headers: corsHeaders });
}
