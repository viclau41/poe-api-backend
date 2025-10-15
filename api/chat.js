// 流量控制配置
const LIMITS = {
  PER_IP_DAY: 30,        // 每IP每天30次
  GLOBAL_DAY: 500,       // 全站每天500次
  MAX_DURATION: 300000,  // 每次最多5分鐘
  MAX_MESSAGE_LENGTH: 5000, // 問題最大長度
  
  // 管理員IP白名單
  ADMIN_IPS: ['61.244.126.23']
};

// 內存存儲（每日重置）
let usageStats = {
  date: getCurrentDateString(),
  ipUsage: new Map(),    // IP使用記錄
  globalCount: 0         // 全站使用次數
};

// 獲取當前日期字符串（香港時間）
function getCurrentDateString() {
  const now = new Date();
  const hkTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // UTC+8
  return hkTime.toISOString().slice(0, 10); // YYYY-MM-DD
}

// 獲取客戶端IP
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

// 檢查並重置每日統計
function checkAndResetDaily() {
  const today = getCurrentDateString();
  if (usageStats.date !== today) {
    usageStats = {
      date: today,
      ipUsage: new Map(),
      globalCount: 0
    };
    console.log('🔄 已重置每日統計:', today);
  }
}

// 檢查是否可以使用
function checkUsageLimit(ip) {
  // 🎯 管理員IP無限制
  if (LIMITS.ADMIN_IPS.includes(ip)) {
    return {
      canUse: true,
      ipUsed: 0,
      ipRemaining: 999,
      globalUsed: usageStats.globalCount,
      globalRemaining: Math.max(0, LIMITS.GLOBAL_DAY - usageStats.globalCount),
      isAdmin: true
    };
  }
  
  checkAndResetDaily();
  
  const ipCount = usageStats.ipUsage.get(ip) || 0;
  const globalCount = usageStats.globalCount;
  
  return {
    canUse: ipCount < LIMITS.PER_IP_DAY && globalCount < LIMITS.GLOBAL_DAY,
    ipUsed: ipCount,
    ipRemaining: Math.max(0, LIMITS.PER_IP_DAY - ipCount),
    globalUsed: globalCount,
    globalRemaining: Math.max(0, LIMITS.GLOBAL_DAY - globalCount),
    isAdmin: false
  };
}

// 記錄使用
function recordUsage(ip) {
  // 管理員IP不記錄使用
  if (LIMITS.ADMIN_IPS.includes(ip)) {
    return;
  }
  
  checkAndResetDaily();
  
  const currentCount = usageStats.ipUsage.get(ip) || 0;
  usageStats.ipUsage.set(ip, currentCount + 1);
  usageStats.globalCount += 1;
  
  console.log(`📊 使用記錄 IP: ${ip.substring(0, 8)}***, 第${currentCount + 1}次, 全站: ${usageStats.globalCount}`);
}

export default async function handler(req, res) {
  // 🔒 只檢查域名來源
  const allowedOrigin = 'https://victorlau.myqnapcloud.com';
  const origin = req.headers.origin;
  
  // 檢查是否來自您的網站 - 支持子路徑
  const isValidOrigin = origin === allowedOrigin || 
                       origin === 'https://www.victorlau.myqnapcloud.com';
  
  // 檢查Referer（支持客戶報告頁面）
  const referer = req.headers.referer || req.headers.referrer || '';
  const isValidReferer = referer.startsWith('https://victorlau.myqnapcloud.com/') || 
                        referer.startsWith('https://www.victorlau.myqnapcloud.com/');
  
  // 設置 CORS
  if (isValidOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  const { method } = req;
  const clientIP = getClientIP(req);
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method === 'GET') {
    const usage = checkUsageLimit(clientIP);
    return res.status(200).json({
      status: '✅ Victor AI 風水師助手運行中',
      service: 'Victor專業風水師網站專屬服務',
      limits: {
        perIPDay: LIMITS.PER_IP_DAY,
        globalDay: LIMITS.GLOBAL_DAY,
        maxDurationMinutes: LIMITS.MAX_DURATION / 60000
      },
      usage: {
        yourUsed: usage.ipUsed,
        yourRemaining: usage.ipRemaining,
        globalUsed: usage.globalUsed,
        globalRemaining: usage.globalRemaining
      },
      timestamp: new Date().toISOString(),
      poeToken: process.env.POE_TOKEN ? '✅ 已設定' : '❌ 未設定'
    });
  }
  
  if (method === 'POST') {
    // 🔒 檢查來源
    if (!isValidOrigin && !isValidReferer) {
      console.log('❌ 非法來源:', origin, 'Referer:', referer);
      return res.status(403).json({
        text: '❌ 此服務僅限於 Victor 風水師網站內使用'
      });
    }
    
    try {
      // 檢查流量限制
      const usage = checkUsageLimit(clientIP);
      
      if (!usage.canUse) {
        const reason = usage.ipUsed >= LIMITS.PER_IP_DAY ? 
          `您今日的諮詢次數已達上限（${LIMITS.PER_IP_DAY}次），請明天再來使用` :
          `今日全站諮詢次數已達上限，請明天再來使用`;
          
        return res.status(429).json({
          text: `❌ ${reason}`
        });
      }
      
      const { message, model } = req.body || {};
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ 
          text: '❌ 請輸入您的問題'
        });
      }
      
      // 檢查問題長度
      if (message.length > LIMITS.MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ 
          text: `❌ 問題內容過長，請控制在${LIMITS.MAX_MESSAGE_LENGTH}字以內`
        });
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) {
        return res.status(500).json({ text: '❌ POE_TOKEN 未設定' });
      }

      // 記錄使用（在調用API前記錄）
      recordUsage(clientIP);
      console.log(`⏰ 開始處理諮詢 - IP: ${clientIP.substring(0, 8)}***, Admin: ${usage.isAdmin}`);

          // 🚀 簡化提示詞以提升速度
const enhancedMessage = `你是Victor風水師的AI助手，專門回答風水、命理、易經問題。請提供專業且實用的建議，不要主動提及聯繫方式。

用戶問題：${message}`;

      const payloadForPoe = {
        model: model || 'Claude-3-Haiku-20240307',
        messages: [{ role: 'user', content: enhancedMessage }],
        stream: false,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), LIMITS.MAX_DURATION);

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
        
        console.log(`✅ 成功回應諮詢 - IP: ${clientIP.substring(0, 8)}***, Admin: ${usage.isAdmin}`);
        
        return res.status(200).json({
          text: responseText,
          model: payloadForPoe.model,
          timestamp: new Date().toISOString()
        });

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          return res.status(408).json({
            text: '❌ AI 思考時間超過5分鐘限制，請簡化問題後重試'
          });
        }
        throw fetchError;
      }
      
    } catch (error) {
      console.error('❌ API 錯誤:', error.message);
      return res.status(500).json({
        text: `❌ AI 服務暫時不可用：${error.message}`
      });
    }
  }
  
  return res.status(405).json({ text: '❌ 方法不允許' });
}
