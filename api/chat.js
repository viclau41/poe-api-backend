export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Client-Auth-Key',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const clientAuthKey = req.headers.get('x-client-auth-key');
  const allowedOrigin = 'https://victorlau.myqnapcloud.com';
  const requestOrigin = req.headers.get('origin');

  if (clientAuthKey !== '6188388900' && requestOrigin !== allowedOrigin) {
    return new Response(
      JSON.stringify({ error: true, message: 'Forbidden: Invalid Authentication or Origin' }),
      { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

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
      throw new Error("POE_API_KEY is not set in environment variables.");
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
