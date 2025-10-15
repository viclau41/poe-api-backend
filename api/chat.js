// 流量控制配置 - 精簡版
const LIMITS = {
  PER_IP_DAY: 30,
  ADMIN_IPS: ['61.244.126.23']
};

let usageStats = {
  date: new Date().toISOString().slice(0, 10),
  ipUsage: new Map()
};

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
}

function canUse(ip) {
  // 管理員無限制
  if (LIMITS.ADMIN_IPS.includes(ip)) return true;
  
  // 檢查是否新的一天
  const today = new Date().toISOString().slice(0, 10);
  if (usageStats.date !== today) {
    usageStats = { date: today, ipUsage: new Map() };
  }
  
  const count = usageStats.ipUsage.get(ip) || 0;
  return count < LIMITS.PER_IP_DAY;
}

function recordUse(ip) {
  if (LIMITS.ADMIN_IPS.includes(ip)) return;
  const count = usageStats.ipUsage.get(ip) || 0;
  usageStats.ipUsage.set(ip, count + 1);
}

export default async function handler(req, res) {
  // 🔒 原來的CORS設置
  const allowedOrigin = 'https://victorlau.myqnapcloud.com';
  const origin = req.headers.origin;
  
  const isValidOrigin = origin === allowedOrigin || 
                       origin === 'https://www.victorlau.myqnapcloud.com';
  
  if (isValidOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  const { method } = req;
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method === 'GET') {
    return res.status(200).json({
      status: '✅ Victor API 運行中',
      timestamp: new Date().toISOString(),
      poeToken: process.env.POE_TOKEN ? '✅ 已設定' : '❌ 未設定'
    });
  }
  
  if (method === 'POST') {
    const clientIP = getClientIP(req);
    
    // 🔒 簡單來源檢查
    const referer = req.headers.referer || '';
    if (!isValidOrigin && !referer.includes('victorlau.myqnapcloud.com')) {
      return res.status(403).json({ text: '❌ 訪問被拒絕' });
    }
    
    // 簡單流量檢查
    if (!canUse(clientIP)) {
      return res.status(429).json({ 
        text: '❌ 您今日的諮詢次數已達上限，請明天再來使用' 
      });
    }
    
    try {
      const { message, model } = req.body || {};
      
      if (!message) {
        return res.status(400).json({ text: '❌ 缺少 message' });
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) {
        return res.status(500).json({ text: '❌ POE_TOKEN 未設定' });
      }

      // 記錄使用
      recordUse(clientIP);

      // 🚀 直接使用原來的邏輯 - 不包裝message
      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: message }], // 直接傳原始message
        stream: false,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 保持10分鐘

      try {
        const apiResponse = await fetch('https://api.poe.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${poeToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payloadForPoe),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          throw new Error(`Poe API 錯誤 (${apiResponse.status}): ${errorText.substring(0, 200)}`);
        }

        const data = await apiResponse.json();
        const responseText = data.choices?.[0]?.message?.content || '❌ AI 未提供有效回應';
        
        return res.status(200).json({
          text: responseText,
          model: payloadForPoe.model,
          timestamp: new Date().toISOString()
        });

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          return res.status(408).json({
            text: '❌ AI 響應超時，請稍後重試'
          });
        }
        throw fetchError;
      }
      
    } catch (error) {
      return res.status(500).json({
        text: `❌ AI 服務暫時不可用：${error.message}`
      });
    }
  }
  
  return res.status(405).json({ text: '❌ 方法不允許' });
}
