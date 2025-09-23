// 檔名: api/chat.js
// 終極加固版：開放模型自選 + 強制接力賽 + 清晰錯誤回報

export const config = {
  runtime: 'edge',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://victorlau.myqnapcloud.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      const clientData = await request.json();
      const clientMessage = clientData.message;
      const clientModel = clientData.model;

      // 【升級1：後台日誌】在 Vercel 後台記錄收到的模型名稱，方便偵錯
      console.log(`[Vercel Log] Received request with model: "${clientModel}"`);

      if (!clientMessage) {
        return new Response(JSON.stringify({ error: '請求中缺少 "message" 內容' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { throw new Error('後端 POE_TOKEN 未設定'); }

      const isContinuation = clientMessage.includes('繼續') || clientMessage.includes('continue');
      let promptForAI;
      if (isContinuation) {
        promptForAI = clientMessage + `
---
[AI 內部指令]: 請基於以上對話，繼續進行下一步的深入分析。將本次回答的長度控制在 4000 字左右。如果還有內容未完成，請在結尾再次引導用戶繼續提問。
`;
      } else {
        promptForAI = clientMessage + `
---
[AI 內部指令]: 這是一個複雜的分析請求。你的任務是將完整的分析拆分成幾個部分來回答。
1.  **本次回答**：請先提供最核心的初步分析，長度約為 4000 字。
2.  **引導繼續**：在回答的結尾，你必須明確地、主動地詢問用戶是否需要繼續，例如：「以上是初步的核心分析。你需要我繼續深入探討嗎？請回覆『繼續』。」
`;
      }

      const payloadForPoe = {
        model: clientModel || 'Claude-3-Haiku', // 尊重前端選擇，若無則預設 Haiku
        messages: [{ role: 'user', content: promptForAI }],
        stream: false,
        max_tokens: 4500,
      };

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadForPoe),
      });

      // 【升級2：清晰報錯】如果 Poe API 返回錯誤，將錯誤訊息傳回前端
      if (!apiResponse.ok) {
        let errorBody = '無法解析 Poe 的錯誤訊息';
        try {
          // 嘗試解析 Poe 返回的 JSON 錯誤訊息
          const errorJson = await apiResponse.json();
          errorBody = errorJson.error?.message || JSON.stringify(errorJson);
        } catch {
          // 如果解析 JSON 失敗，就直接讀取文字
          errorBody = await apiResponse.text();
        }
        
        console.error(`[Vercel Log] Poe API Error: Status ${apiResponse.status}, Body: ${errorBody}`);

        const userFriendlyError = `❌ 後端請求失敗：Poe API 回應錯誤。\n\n狀態碼：${apiResponse.status}\n錯誤訊息：${errorBody}\n\n➡️ 請檢查您前端所選的模型名稱是否為 Poe 官方支援的正確名稱（例如 'Gemini-1.5-Pro' 而非 'Gemini'）。`;

        return new Response(JSON.stringify({ text: userFriendlyError }), {
          // 返回 400 Bad Request，因為這很可能是客戶端傳錯模型名導致的
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const responseData = await apiResponse.json();
      const replyContent = responseData.choices[0].message.content;

      return new Response(JSON.stringify({ text: replyContent }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('[Vercel Log] Internal Handler Error:', error);
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
