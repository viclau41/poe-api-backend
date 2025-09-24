export default async function handler(request) {
  // 最簡單的 CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  };

  // 處理預檢請求
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers 
    });
  }

  // 處理所有請求
  try {
    return new Response(JSON.stringify({
      text: '✅ API 連接成功！CORS 問題已解決。'
    }), { 
      status: 200, 
      headers 
    });
  } catch (error) {
    return new Response(JSON.stringify({
      text: `❌ 錯誤：${error.message}`
    }), { 
      status: 500, 
      headers 
    });
  }
}
