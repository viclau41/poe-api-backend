// 檔名: api/chat.js
// 支援自定義模型版本

export const config = {
  runtime: 'edge',
};

const allowedOrigin = 'https://victorlau.myqnapcloud.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(request) {
  // 處理 OPTIONS 請求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      // 檢查來源
      const origin = request.headers.get('origin');
      if (origin !== allowedOrigin) {
        return new Response('Forbidden', { status: 403 });
      }

      const { message, model } = await request.json();
      if (!message) { 
        throw new Error('請求中缺少 "message"'); 
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        throw new Error('後端 POE_TOKEN 未設定'); 
      }

      // 🎯 完全使用前端指定的模型，沒有默認值
      if (!model) {
        throw new Error('請求中缺少 "model" 參數');
      }

      console.log(`使用模型: ${model}`); // 調試用

      const payloadForPoe = {
        model: model,  // 👈 直接使用傳入的模型
        messages: [{ role: 'user', content: message }],
        stream: false,
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
        throw new Error(`Poe API 請求失敗 (${apiResponse.status}): ${errorText} [Model: ${model}]`);
      }

      const poeData = await apiResponse.json();
      const text = poeData.choices?.[0]?.message?.content || '無法獲取回應';

      // 返回時也顯示使用的模型
      return new Response(JSON.stringify({ 
        text,
        model_used: model  // 👈 額外返回使用的模型名稱
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        text: `❌ 伺服器內部錯誤：${error.message}`,
        model_used: model || 'unknown'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method Not Allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
}
