export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: true, message: 'Method not allowed' });
    }

    try {
        const { message, model = 'Claude-Sonnet-4' } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ error: true, message: 'Message is required' });
        }

        const apiKey = process.env.POE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: true, message: 'API key not configured' });
        }

        console.log('Calling Poe API with model:', model);

        // 调用真正的 Poe API
        const response = await fetch('https://api.poe.com/v1/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                query: message.trim(),
                bot: model
            })
        });

        if (!response.ok) {
            console.error(`Poe API error: ${response.status}`);
            const errorText = await response.text();
            console.error('Error details:', errorText);
            
            // 如果主 API 失败，尝试备用格式
            const fallbackResponse = await fetch('https://api.poe.com/bot', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    version: "1.0",
                    type: "query",
                    query: [{ role: "user", content: message.trim() }]
                })
            });

            if (!fallbackResponse.ok) {
                const fallbackError = await fallbackResponse.text();
                throw new Error(`Both API endpoints failed. Status: ${response.status}, ${fallbackResponse.status}`);
            }

            const fallbackData = await fallbackResponse.json();
            return res.status(200).json({
                success: true,
                text: fallbackData.text || fallbackData.content || fallbackData.response || '抱歉，AI 暂时无法回复。',
                model: model
            });
        }

        const data = await response.json();
        console.log('Poe API response received successfully');

        return res.status(200).json({
            success: true,
            text: data.text || data.content || data.response || '抱歉，AI 暂时无法回复。',
            model: model
        });

    } catch (error) {
        console.error('Error in Poe API handler:', error);
        return res.status(500).json({ 
            error: true, 
            message: 'Internal server error',
            details: error.message 
        });
    }
}
