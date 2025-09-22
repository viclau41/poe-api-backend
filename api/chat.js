// 檔名: api/chat.js
// 最終方案：強化版「接力賽」模式，應對超時

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
      let clientMessage = clientData.message;

      if (!clientMessage) {
        return new Response(JSON.stringify({ error: '請求中缺少 "message" 內容' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { throw new Error('後端 POE_TOKEN 未設定'); }

      // --- 強化版「接力賽」指示 ---
      // 檢查用戶是否要求「繼續」，如果是，就給予不同指示
      const isContinuation = clientMessage.includes('繼續') || clientMessage.includes('continue');
      
      let promptForAI;
      if (isContinuation) {
        // 如果是接力，就叫佢繼續深入
        promptForAI = clientMessage + `
---
[AI 內部指令]: 請基於以上對話，繼續進行下一步的深入分析。同樣地，將本次回答的長度控制在 2000 字左右。如果還有內容未完成，請在結尾再次引導用戶繼續提問。
`;
      } else {
        // 如果是第一次提問，就叫佢先做初步分析
        promptForAI = clientMessage + `
---
[AI 內部指令]: 這是一個複雜的分析請求。你的任務是將完整的分析拆分成幾個部分。
1.  **本次回答**：請先提供最核心的初步分析，長度約為 2000 字。
2.  **引導繼續**：在回答的結尾，必須明確地、主動地詢問用戶是否需要繼續，例如：「以上是初步的核心分析。你需要我繼續深入探討三傳的細節和最終吉凶嗎？請回覆『繼續』。」
`;
      }
      // --- 改造結束 ---

      const payloadForPoe = {
        model: 'Claude-3-Haiku',
        messages: [{ role: 'user', content: promptForAI }],
        stream: false,
        max_tokens: 2500, // 預留足夠空間生成約 2000 漢字
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
