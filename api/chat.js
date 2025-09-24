// 🛑 我哋將第一行關於 runtime: 'edge' 的設定成句刪除咗
// 咁樣 Vercel 就會自動用返最穩定嘅標準 Node.js 環境

// 顏色代碼對照表（暫時唔用）
const keyMap = {
  '529': 'green',
  '315': 'red',
  '61883889': 'phone',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 確保呢句永遠存在，解決 CORS 問題
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export default async function handler(request) {
  // OPTIONS 請求係瀏覽器喺正式 POST 之前嘅「詢問」，我哋要俾佢通過
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      // 安全驗證已暫時停用
      
      const requestData = await request.json();
      
      let message, model;
      if (requestData.messages) {
        message = requestData.messages[0]?.content;
        model = requestData.bot_name;
      } else {
        message = requestData.message;
        model = requestData.model;
      }

      if (!message) { 
        throw new Error('請求中缺少 "message"'); 
      }

      // 喺標準模式下，呢句可以正常運作！
      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        // 如果 TOKEN 真係冇設定，我哋會回傳一個清晰嘅錯誤，而唔係超時
        throw new Error('後端 POE_TOKEN 未在 Vercel 環境變數中設定'); 
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
      const responseText = data.choices?.[0]?.message?.content || '無回應內容';
      
      // 成功時，回傳答案同埋 CORS 通行證
      return new Response(JSON.stringify({ 
        text: responseText 
      }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      });

    } catch (error) {
      // 任何錯誤發生時，都回傳一個清晰嘅錯誤訊息同埋 CORS 通行證
      return new Response(JSON.stringify({ text: `❌ 伺服器內部錯誤：${error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  // 如果唔係 POST 或 OPTIONS，就話唔允許
  return new Response('方法不被允許', { status: 405, headers: corsHeaders });
}
