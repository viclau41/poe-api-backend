export const config = {
  runtime: 'edge', // 使用 Edge Runtime，通常反應更快
};

// 這是你的網站，是唯一被允許的來源
const allowedOrigin = 'https://victorlau.myqnapcloud.com';

// 這是跨域請求的「通行證」設定
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // 只允許 POST 和 OPTIONS 請求
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(request) {
  // 處理瀏覽器發出的「預檢」請求 (OPTIONS)，直接發放通行證
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 只處理真正的 POST 請求
  if (request.method === 'POST') {
    try {
      // 獲取前端發送過來的 JSON 數據
      const requestData = await request.json();
      
      // 兼容你前端可能發送的兩種數據格式 (message 或 messages)
      const message = requestData.messages?.[0]?.content || requestData.message;
      const model = requestData.bot_name || requestData.model || 'Claude-3-Haiku-20240307'; // 預設使用 Haiku

      // 如果沒有訊息內容，就報錯
      if (!message) { 
        throw new Error('請求中缺少 "message" 內容'); 
      }

      // 從 Vercel 環境變數中讀取你的 Poe Token
      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        throw new Error('伺服器未配置 POE_TOKEN，請檢查 Vercel 環境變數'); 
      }

      // 準備發送給 Poe API 的數據包
      const payloadForPoe = {
        model: model,
        messages: [{ role: 'user', content: message }],
        stream: false, // 正如你所說，不使用 streaming
      };

      // 正式向 Poe API 發出請求
      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadForPoe),
      });

      // 如果 Poe API 返回錯誤，就將錯誤信息拋出
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      // 解析 Poe API 返回的成功數據
      const data = await apiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || 'AI 未能提供有效回應。';
      
      // 將 AI 的回覆，包裝成 JSON 格式，成功返回給你的前端
      return new Response(JSON.stringify({ text: responseText }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      // 如果中間任何一步出錯，就將錯誤信息返回給前端
      return new Response(JSON.stringify({ text: `❌ 伺服器內部錯誤: ${error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  // 如果不是 POST 或 OPTIONS 請求，就拒絕
  return new Response('不允許的方法', { status: 405, headers: corsHeaders });
}
