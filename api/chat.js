// 最終 Edge Function 版本：基於你穩定的 v1 代碼，已修復編碼並加入日誌
export const config = {
  runtime: 'edge',
};

// 設定只允許你的網站來源訪問，增強安全性
const allowedOrigin = 'https://victorlau.myqnapcloud.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization', // 注意：Poe v1 可能不需要 Authorization，但保留無妨
};

export default async function handler(request) {
  // 處理瀏覽器的 OPTIONS 預檢請求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 只處理 POST 請求
  if (request.method === 'POST') {
    try {
      // --- 黑盒記錄：第一站，記錄函數被觸發 ---
      console.log('--- [START] Edge Function Triggered ---');
      
      // 驗證請求來源是否為你的網站
      const origin = request.headers.get('origin');
      if (origin !== allowedOrigin) {
        console.error(`[FORBIDDEN] Request from invalid origin: ${origin}`);
        return new Response('Forbidden: Invalid origin', { status: 403 });
      }
      
      const requestData = await request.json();
      
      // --- 黑盒記錄：檢查收到的資料 ---
      console.log('[INFO] Incoming request body:', JSON.stringify(requestData, null, 2));

      // 兼容兩種不同的前端請求格式
      let message, model;
      if (requestData.messages) {
        message = requestData.messages[0]?.content;
        model = requestData.bot_name;
      } else {
        message = requestData.message;
        model = requestData.model;
      }

      if (!message) { 
        console.error('[ERROR] "message" is missing from the request body.');
        throw new Error('請求中缺少 "message" 內容'); 
      }

      // 從 Vercel 環境變數中讀取 POE_TOKEN
      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        console.error('[ERROR] POE_TOKEN is not set in Vercel environment variables.');
        throw new Error('伺服器未配置 POE_TOKEN'); 
      }
      console.log('[INFO] POE_TOKEN found. Preparing to call Poe API.');

      // 準備發送給 Poe v1 API 的資料
      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307', // 使用你原本指定的模型
        messages: [{ role: 'user', content: message }],
        stream: false,
      };

      // --- 黑盒記錄：發送請求到 Poe API 之前 ---
      console.log('[INFO] Sending request to Poe v1 API (chat/completions).');

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payloadForPoe),
      });

      // --- 黑盒記錄：收到 Poe API 回應後 ---
      console.log(`[INFO] Received response from Poe. Status: ${apiResponse.status}`);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('[ERROR] Poe API returned an error:', errorText);
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      const data = await apiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || 'AI 未能提供有效回應。';
      
      // --- 黑盒記錄：成功結束前 ---
      console.log('[SUCCESS] Successfully processed request. Sending reply back to client.');
      
      // 以正確的 Edge Function 格式回傳 JSON
      return new Response(JSON.stringify({ text: responseText }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      });

    } catch (error) {
      // --- 黑盒記錄：捕捉到任何意外的程式錯誤 ---
      console.error('[FATAL] An unexpected error occurred:', error.message);
      return new Response(JSON.stringify({ text: `❌ 伺服器內部錯誤: ${error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  // 對於 GET 或其他方法，返回不允許
  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}
