// api/chat.js

// 呢個函數專門用嚟設定 CORS 授權書 (headers)
const allowCors = (fn) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  // --- 我哋嘅修改喺呢度 ---
  // 我哋暫時將指定嘅網站註解咗 (前面加 //)
  // res.setHeader('Access-Control-Allow-Origin', 'https://victorlau.myqnapcloud.com');
  // 然後換成 '*'，代表允許來自任何網站嘅請求
  res.setHeader('Access-Control-Allow-Origin', '*');
  // --- 修改完畢 ---
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 瀏覽器會先用 OPTIONS 方法嚟「打個招呼」問下規矩，我哋要俾佢通過
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// 呢個係你原本處理 Poe API 請求嘅主要邏輯
const handler = async (req, res) => {
  // 我哋只處理 POST 請求
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { messages, bot_name } = req.body;
    const poeToken = process.env.POE_TOKEN;

    if (!poeToken) {
      return res.status(500).json({ error: 'POE_TOKEN is not configured.' });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format.' });
    }

    const response = await fetch('https://api.poe.com/v1/chat_completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${poeToken}`,
      },
      body: JSON.stringify({
        model: bot_name || 'Claude-3-Haiku', // 預設用 Haiku
        messages: messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: `Poe API error: ${errorData}` });
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    res.status(200).json({ reply: reply });

  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

// 最後，我哋將主要邏輯用 CORS 授權函數包起嚟，然後匯出
export default allowCors(handler);
