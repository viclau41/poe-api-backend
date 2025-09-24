// v4 - 修正語法錯誤並簡化日誌，使用純英文避免任何編碼問題

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
    // --- Log Point 1: Check if function is triggered ---
    console.log('--- Received POST request, function started ---');

    try {
      // --- Log Point 2: Check the incoming request body ---
      console.log('Request Body Content:', JSON.stringify(request.body, null, 2));
      const requestData = request.body;
      
      let message, model;
      if (requestData.messages) {
        message = requestData.messages[0]?.content;
        model = requestData.bot_name;
      } else {
        message = requestData.message;
        model = requestData.model;
      }

      // --- Log Point 3: Check if the message variable was parsed correctly ---
      console.log('Parsed Message:', message);

      if (!message) { 
        console.error('ERROR: Message is empty, preparing to throw error.');
        throw new Error('Request is missing "message" content'); 
      }

      // --- Log Point 4: Check if POE_TOKEN can be read ---
      console.log('Preparing to read POE_TOKEN...');
      const poeToken = process.env.POE_TOKEN;
      // ⭐⭐⭐ 呢度係之前出錯嘅地方，我哋已經將佢簡化 ⭐⭐⭐
      console.log('POE_TOKEN status:', poeToken ? 'Found! Length: ' + poeToken.length : 'NOT FOUND! It is null or undefined!');

      if (!poeToken) { 
        console.error('ERROR: POE_TOKEN is empty, preparing to throw error.');
        throw new Error('Backend Error: POE_TOKEN is not set in Vercel environment variables'); 
      }

      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: false,
      };

      // --- Log Point 5: Check the data being sent to Poe ---
      console.log('Payload to be sent to Poe API:', JSON.stringify(payloadForPoe, null, 2));

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payloadForPoe),
      });

      console.log('Received response from Poe API, Status:', apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('Poe API returned an error:', errorText);
        throw new Error(`Poe API request failed (${apiResponse.status}): ${errorText}`);
      }

      const data = await apiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || 'Poe API did not return valid content';
      
      console.log('--- Request successful, preparing to send response ---');
      response.status(200).json({ text: responseText });

    } catch (error) {
      // --- Log Point 6: If any step above fails, it will be caught here ---
      console.error('--- CRITICAL ERROR CAUGHT IN CATCH BLOCK ---', error);
      response.status(500).json({ text: `❌ Server Internal Error: ${error.message}` });
    }
    return;
  }
  
  response.status(405).json({ text: 'Method Not Allowed' });
}
