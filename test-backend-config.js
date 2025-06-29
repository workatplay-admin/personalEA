const http = require('http');

async function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });
        
        req.on('error', reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testBackendConfig() {
    console.log('=== Testing Backend Configuration ===\n');
    
    // Get JWT Token
    const tokenResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: '/api/v1/auth/test-token',
        method: 'GET'
    });
    
    const jwtToken = tokenResponse.body.data.token;
    console.log('1. Got JWT token\n');
    
    // Test with environment API key (no header)
    console.log('2. Testing with backend environment API key (no X-OpenAI-API-Key header)...');
    const envResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: '/api/v1/goals/translate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
            // NO X-OpenAI-API-Key header - should use backend env var
        }
    }, {
        raw_goal: "test goal"
    });
    
    console.log('Response:', envResponse.status);
    if (envResponse.status !== 200) {
        console.log('Error:', envResponse.body);
    }
    
    // Test with user API key
    console.log('\n3. Testing with user-provided API key...');
    const userResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: '/api/v1/goals/translate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
            'X-OpenAI-API-Key': process.env.OPENAI_API_KEY?.trim()
        }
    }, {
        raw_goal: "test goal with user key"
    });
    
    console.log('Response:', userResponse.status);
    if (userResponse.status === 200) {
        console.log('✅ Works with user API key');
    } else {
        console.log('Error:', userResponse.body);
    }
}

testBackendConfig().catch(console.error);