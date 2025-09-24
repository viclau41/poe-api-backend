export const config = {
  runtime: 'edge',
};

// Color code mapping
const keyMap = {
  '529': 'green',
  '315': 'red', 
  '412': 'blue',
  '61883889': 'phone',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      const origin = request.headers.get('origin');
      const apiKey = request.headers.get('x-api-key');
      
      // Double verification: domain OR valid key
      const validOrigin = origin?.includes('victorlau.myqnapcloud.com');
      const validKey = keyMap[apiKey] !== undefined;
      
      if (!validOrigin && !validKey) {
        return new Response('Forbidden', { status: 403 });
      }
      
      // Optional: log the used color for debugging
      if (validKey) {
        console.log(`Access granted with color: ${keyMap[apiKey]}`);
      }
      
      const requestData = await request.json();
      
      let message, model;
      if (requestData.messages) {
        message = requestData.messages[0]?.content;
        model = requestData.bot_name;
      } else {
        message = requestData.message;
        model = requestData.model;
      }

      if (!message) { 
        throw new Error('Missing message in request'); 
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        throw new Error('POE_TOKEN not configured'); 
      }

      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }],
        stream: false,
      };

      // Debug logging
      console.log('Request payload:', JSON.stringify(payloadForPoe, null, 2));
      console.log('POE_TOKEN status:', poeToken ? 'exists' : 'missing');

      const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${poeToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payloadForPoe),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.log('Poe API Error:', errorText);
        throw new Error(`Poe API request failed (${apiResponse.status}): ${errorText}`);
      }

      const data = await apiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || 'No response content';
      
      return new Response(JSON.stringify({ 
        text: responseText 
      }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      });

    } catch (error) {
      console.log('Server error:', error.message);
      return new Response(JSON.stringify({ 
        text: `Server internal error: ${error.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  return new Response('Method not allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
}
