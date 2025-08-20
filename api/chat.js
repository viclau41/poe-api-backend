export default async function handler(req, res) {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: true, 
            message: 'Method not allowed' 
        });
    }

    try {
        const { message, model = 'Claude-Sonnet-4' } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ 
                error: true, 
                message: 'Message is required' 
            });
        }

        const apiKey = process.env.POE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                error: true, 
                message: 'Server configuration error' 
            });
        }

        const response = await fetch('https://api.poe.com/bot', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: "1.0",
                type: "query",
                query: [{ 
                    role: "user", 
                    content: message.trim() 
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        return res.status(200).json({
            success: true,
            text: data.text || data.content || '抱歉，没有收到回复内容',
            model: model
        });

    } catch (error) {
        return res.status(500).json({ 
            error: true, 
            message: 'Internal server error',
            details: error.message 
        });
    }
}
