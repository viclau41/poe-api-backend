export default async function handler(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const message = body.messages && body.messages[0] 
        ? body.messages[0].content 
        : (body.message || 'Hello');

      const poeApiKey = process.env.POE_API_KEY;
      if (!poeApiKey) {
        return new Response(JSON.stringify({
          text: '⚠️ POE_API_KEY not configured'
        }), { status: 500, headers });
      }

      // 添加超時控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25秒超時

      try {
        const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${poeApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'Claude-3-Haiku',
            messages: [{ role: 'user', content: message }]
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          throw new Error(`Poe API error (${apiResponse.status}): ${errorText}`);
        }

        const data = await apiResponse.json();
        const responseText = data.choices?.[0]?.message?.content || 'No response from AI';

        return new Response(JSON.stringify({
          text: responseText
        }), { status: 200, headers });

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('POE API timeout after 25 seconds');
        }
        throw fetchError;
      }

    } catch (error) {
      // 詳細錯誤記錄
      console.error('API Error:', error.message);
      
      return new Response(JSON.stringify({
        text: `❌ AI 服務暫時不可用: ${error.message}`
      }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({
    text: '✅ Victor AI API ready'
  }), { status: 200, headers });
}
