// 這是一個最簡單的 Vercel Serverless Function
export default function handler(req, res) {
  
  // 設置允許任何來源訪問，確保瀏覽器唔會阻擋
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 設置回覆的內容類型為 JSON
  res.setHeader('Content-Type', 'application/json');
  
  // 回覆一個 200 (成功) 狀態碼，同埋一個簡單嘅 JSON 物件
  res.status(200).json({ 
    status: 'success', 
    message: 'API is alive! If you see this, it means the Vercel deployment is working correctly.',
    timestamp: new Date().toISOString() 
  });
}
