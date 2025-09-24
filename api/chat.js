export default async function handler(request) {
  const headers = {
    'Access-Control-Allow-Origin': 'https://victorlau.myqnapcloud.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'API Working',
      timestamp: new Date().toISOString()
    }), { status: 200, headers });
  }

  return new Response(JSON.stringify({
    error: 'Method not allowed'
  }), { status: 405, headers });
}
