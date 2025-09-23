// 檔名: api/chat.js
// 終極混合方案：開放模型自選，並強制所有模型採用「接力賽」模式

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
      // 接收前端傳來的完整數據，包括 message 和 model
      const clientData = await request.json();
      const clientMessage = clientData.message;
      const clientModel = clientData.model; // 獲取前端指定的模型

      if (!clientMessage) {
        return new Response(JSON.stringify({ error: '請求中缺少 "message" 內容' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { throw new Error('後端 POE_TOKEN 未設定'); }

      // --- 混合方案核心：植入「接力賽」指令 ---
      const isContinuation = clientMessage.includes('繼續') || clientMessage.includes('continue');
      let promptForAI;
      if (isContinuation) {
        promptForAI = clientMessage + `
---
[AI 內部指令]: 請基於以上對話，繼續進行下一步的深入分析。同樣地，將本次回答的長度控制在 2000 字左右。如果還有內容未完成，請在結尾再次引導用戶繼續提問。
`;
      } else {
        promptForAI = clientMessage + `
---
[AI 內部指令]: 這是一個複雜的分析請求。你的任務是將完整的分析拆分成幾個部分來回答。
1.  **本次回答**：請先提供最核心的初步分析，長度約為 3000 字。
2.  **引導繼續**：在回答的結尾，你必須明確地、主動地詢問用戶是否需要繼續，例如：「以上是初步的核心分析。你需要我繼續深入探討嗎？請回覆『繼續』。」
`;
      }
      // --- 改造結束 ---

      const payloadForPoe = {
        // --- 核心改動：尊重前端選擇 ---
        // 如果前端有指定模型，就用佢；如果冇，先預設用 Haiku
        model: clientModel || 'Claude-3-Haiku', 
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

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      const responseData = await apiResponse.json();
      const replyContent = responseData.choices[0].message.content;

      const responseForClient = { text: replyContent };

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
