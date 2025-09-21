export const config = {
  runtime: 'edge',
};

// --- 最終修正版 ---
// 這段程式碼修正了 CORS 預檢請求 (Preflight Request) 的問題

export default async function handler(req) {
  // 設置通用的 CORS 標頭
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // 允許任何來源的請求
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // 允許 POST 和 OPTIONS 方法
    'Access-Control-Allow-Headers': 'Content-Type, X-Client-Auth-Key', // 允許的自訂標頭
  };

  // 如果是瀏覽器發送的 OPTIONS 預檢請求，直接回覆 204 No Content 並帶上 CORS 標頭
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // --- 原有的安全檢查邏輯保持不變 ---
  const clientAuthKey = req.headers.get('x-client-auth-key');
  const allowedOrigin = 'https://victorlau.myqnapcloud.com';
  const requestOrigin = req.headers.get('origin');

  // 檢查秘密金鑰或來源網域
  if (clientAuthKey !== '6188388900' && requestOrigin !== allowedOrigin) {
    return new Response(
      JSON.stringify({ error: true, message: 'Forbidden: Invalid Authentication or Origin' }),
      { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // --- 原有的 API 請求邏輯保持不變 ---
  try {
    const { message, model = 'Claude-3-Sonnet' } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: true, message: 'Message is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const POE_API_KEY = process.env.POE_API_KEY;
    if (!POE_API_KEY) {
      // 注意：這裡我們返回一個更清晰的錯誤訊息
      return new Response(
        JSON.stringify({ error: true, message: 'Internal Server Error: POE_API_KEY is not configured on the server.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: message },
        ],
        stream: false,
      }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error('Poe API Error:', errorBody);
      return new Response(
        JSON.stringify({ error: true, message: `Poe API Error: ${apiResponse.statusText}` }),
        { 
          status: apiResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const responseData = await apiResponse.json();
    const reply = responseData.choices && responseData.choices[0] ? responseData.choices[0].message.content : 'No response from AI.';

    return new Response(
      JSON.stringify({ text: reply }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Server-side error:', error);
    return new Response(
      JSON.stringify({ error: true, message: error.message || 'An internal server error occurred.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
