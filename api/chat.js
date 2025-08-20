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

        console.log('Calling Poe API with OpenAI-compatible format...');
        console.log('Model:', model);

        // 使用 OpenAI 兼容的格式调用 Poe API
        const response = await fetch('https://api.poe.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ 
                    role: "user", 
                    content: message.trim() 
                }],
                max_tokens: 12000,
                temperature: 0.7
            })
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Poe API error:', response.status, errorText);
            
            // 如果是认证错误
            if (response.status === 401) {
                return res.status(500).json({
                    error: true,
                    message: 'API authentication failed. Please check your API key.'
                });
            }
            
            // 如果是模型不支持
            if (response.status === 400) {
                return res.status(500).json({
                    error: true,
                    message: `Model "${model}" may not be supported. Please try a different model.`
                });
            }
            
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Poe API response received successfully');

        // 提取回复内容
        let responseText = '';
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            responseText = data.choices[0].message.content;
        } else {
            console.error('Unexpected response format:', JSON.stringify(data));
            responseText = 'AI 回复格式异常，请稍后重试。';
        }

        return res.status(200).json({
            success: true,
            text: responseText,
            model: model,
            usage: data.usage || null
        });

    } catch (error) {
        console.error('Error in API handler:', error);
        return res.status(500).json({ 
            error: true, 
            message: 'Internal server error',
            details: error.message 
        });
    }
}
