// 檔名: api/chat.js
// 終極串流方案 (優化版)

export const config = {
  runtime: 'edge',
};

// 只允許您的網站來源
const allowedOrigin = 'https://victorlau.myqnapcloud.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(request) {
  // 處理 CORS preflight 請求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      // 檢查請求來源
      const origin = request.headers.get('origin');
      if (origin !== allowedOrigin) {
        return new Response('Forbidden', { status: 403 });
      }

      const { message, model } = await request.json();
      if (!message) { 
        return new Response(JSON.stringify({ text: '請求中缺少 "message" 參數' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        return new Response(JSON.stringify({ text: '❌ 後端 POE_TOKEN 未設定，請聯繫管理員' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 模型名稱映射（確保使用正確的 Poe API 模型名）
      const modelMap = {
        'Claude-3-Sonnet-20241022': 'Claude-3-Sonnet',
        'Claude-3-Haiku-20240307': 'Claude-3-Haiku',
        'Claude-3-Sonnet': 'Claude-3-Sonnet',
        'Claude-3-Haiku': 'Claude-3-Haiku'
      };

      const poeModel = modelMap[model] || model || 'Claude-3-Haiku';

      const payloadForPoe = {
        model: poeModel,
        messages: [{ role: 'user', content: message }],
        stream: true,
      };

      console.log('調用 Poe API:', { model: poeModel, messageLength: message.length });

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
        console.error('Poe API 錯誤:', apiResponse.status, errorText);
        
        let userFriendlyError = '❌ AI 服務暫時不可用';
        if (apiResponse.status === 401) {
          userFriendlyError = '❌ AI 服務認證失敗，請聯繫管理員';
        } else if (apiResponse.status === 429) {
          userFriendlyError = '❌ 請求過於頻繁，請稍後重試';
        } else if (apiResponse.status >= 500) {
          userFriendlyError = '❌ AI 服務器錯誤，請稍後重試';
        }
        
        return new Response(JSON.stringify({ text: userFriendlyError }), {
          status: apiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 直接轉發 SSE 串流，並確保 CORS 頭存在
      return new Response(apiResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } catch (error) {
      console.error('API 處理錯誤:', error);
      return new Response(JSON.stringify({ 
        text: `❌ 伺服器內部錯誤：${error.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  return new Response('方法不被允許', { 
    status: 405, 
    headers: corsHeaders 
  });
}
