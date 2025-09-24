// 🛑 最重要嘅一步：我哋已經將頂部嘅 export const config = { runtime: 'edge' }; 成句刪除咗。
// 咁樣 Vercel 就會自動用返最穩定、最兼容嘅標準 Node.js 環境。

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export default async function handler(request) {
  // 處理瀏覽器嘅 OPTIONS 預檢請求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      // 安全驗證已暫時停用，任何人都可以訪問
      
      const requestData = await request.json();
      
      // 兼容兩種請求格式，非常靈活
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

      // 喺標準模式下，呢句可以完美運作，正確讀取到你嘅 POE_TOKEN
      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        // 如果 TOKEN 真係冇設定，我哋會回傳一個清晰嘅錯誤，而唔係超時
        throw new Error('後端錯誤：POE_TOKEN 未在 Vercel 環境變數中設定'); 
      }

      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307', // 預設模型
        messages: [{ role: 'user', content: message }],
        stream: false,
      };

      // 向 Poe API 發送請求
      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payloadForPoe),
      });

      // 如果 Poe API 返回錯誤，將錯誤訊息傳返俾前端
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      const data = await apiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || 'Poe API 未返回有效內容';
      
      // 成功時，將答案連同 CORS Header 一齊回傳
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
      // 任何錯誤發生時，都回傳一個清晰嘅 500 錯誤訊息，而唔係超時
      return new Response(JSON.stringify({ text: `❌ 伺服器內部錯誤：${error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  // 如果唔係 POST 或 OPTIONS，就話唔允許
  return new Response('方法不被允許', { status: 405, headers: corsHeaders });
}
