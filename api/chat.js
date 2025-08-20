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
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: true, message: 'Message is required' });
        }

        const apiKey = process.env.POE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: true, message: 'API key not configured' });
        }

        // 测试回复 - 确认系统连接正常
        return res.status(200).json({
            success: true,
            text: `✅ 系统测试成功！

您发送的消息："${message}"

系统状态：
- ✅ 前后端通信正常
- ✅ API Key 已配置（${apiKey.substring(0, 3)}***）
- ✅ 服务器运行正常
- 🕐 服务器时间：${new Date().toLocaleString('zh-TW')}

这是测试模式回复，确认所有连接都正常工作！`,
            model: 'Test-Mode'
        });

    } catch (error) {
        return res.status(500).json({ 
            error: true, 
            message: 'Error: ' + error.message 
        });
    }
}
