// Test OpenAI API directly to isolate the issue
const https = require('https');

async function testOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
        console.error('No OPENAI_API_KEY found');
        return;
    }
    
    console.log('Testing OpenAI API directly...');
    console.log('API Key starts with:', apiKey.substring(0, 10) + '...');
    
    const data = JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
            {
                role: 'system',
                content: 'You are a helpful assistant.'
            },
            {
                role: 'user',
                content: 'Say "Hello, the API is working!"'
            }
        ],
        temperature: 0.3,
        max_tokens: 50
    });
    
    const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log('\nResponse Status:', res.statusCode);
                console.log('Response Headers:', res.headers);
                
                try {
                    const parsed = JSON.parse(body);
                    if (res.statusCode === 200) {
                        console.log('\n✅ OpenAI API is working!');
                        console.log('Response:', parsed.choices?.[0]?.message?.content);
                        console.log('Model used:', parsed.model);
                    } else {
                        console.log('\n❌ OpenAI API error:');
                        console.log(JSON.stringify(parsed, null, 2));
                    }
                } catch (e) {
                    console.log('\nRaw response:', body);
                }
                resolve();
            });
        });
        
        req.on('error', (e) => {
            console.error('Request error:', e);
            reject(e);
        });
        
        req.write(data);
        req.end();
    });
}

console.log('Environment check:');
console.log('OPENAI_MODEL:', process.env.OPENAI_MODEL || '(not set - will use gpt-4)');

testOpenAI().catch(console.error);