// 標準 Node.js 環境

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export default async function handler(request, response) {
  // 處理 OPTIONS 請求
  if (request.method === 'OPTIONS') {
    response.status(204).send(null);
    return;
  }

  // 處理 POST 請求
  if (request.method === 'POST') {
    // --- 診斷點 1：檢查函數有冇被觸發 ---
    console.log('--- 收到 POST 請求，函數開始執行 ---');

    try {
      // --- 診斷點 2：檢查傳入嘅 request.body 係咩 ---
      console.log('Request Body 內容:', JSON.stringify(request.body, null, 2));
      const requestData = request.body;
      
      let message, model;
      if (requestData.messages) {
        message = requestData.messages[0]?.content;
        model = requestData.bot_name;
      } else {
        message = requestData.message;
        model = requestData.model;
      }

      // --- 診斷點 3：檢查 message 變數有冇成功攞到值 ---
      console.log('解析到嘅 Message:', message);

      if (!message) { 
        console.error('錯誤：Message 為空，準備拋出錯誤。');
        throw new Error('請求中缺少 "message" 內容'); 
      }

      // --- 診斷點 4：檢查 POE_TOKEN 能否被讀取 ---
      console.log('準備讀取 POE_TOKEN...');
      const poeToken = process.env.POE_TOKEN;
      console.log('讀取到嘅 POE_TOKEN:', poeToken ? '成功讀取到！(長度: ' + poeToken.length + ')' : '失敗！係空值！');

      if (!poeToken) { 
        console.error('錯誤：POE_TOKEN 為空，準備拋出錯誤。');
        throw new Error('後端錯誤：POE_TOKEN 未在 Vercel 環境變數中設定'); 
      }

      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: false,
      };

      // --- 診斷點 5：檢查準備發送去 Poe 嘅資料 ---
      console.log('準備向 Poe API 發送請求，Payload:', JSON.stringify(payloadForPoe, null, 2));

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payloadForPoe),
      });

      console.log('已收到 Poe API 嘅回應，狀態:', apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('Poe API 返回錯誤:', errorText);
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText}`);
      }

      const data = await apiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || 'Poe API 未返回有效內容';
      
      console.log('--- 請求成功，準備返回結果 ---');
      response.status(200).json({ text: responseText });

    } catch (error) {
      // --- 診斷點 6：如果中間任何一步出錯，就會嚟到呢度 ---
      console.error('--- 捕獲到嚴重錯誤 (catch block) ---', error);
      response.status(500).json({ text: `❌ 伺服器內部錯誤：${error.message}` });
    }
    return;
  }
  
  response.status(405).json({ text: '方法不被允許' });
}
