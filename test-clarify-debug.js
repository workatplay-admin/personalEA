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

async function debugClarifyEndpoint() {
    console.log('=== Debugging Clarify Endpoint ===\n');
    
    const realApiKey = process.env.OPENAI_API_KEY?.trim();
    if (!realApiKey) {
        console.error('No OPENAI_API_KEY found');
        return;
    }
    
    // Step 1: Get JWT Token
    const tokenResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: '/api/v1/auth/test-token',
        method: 'GET'
    });
    
    const jwtToken = tokenResponse.body.data.token;
    console.log('1. Got JWT token\n');
    
    // Step 2: Create a simple goal directly in database via translate
    const translateResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: '/api/v1/goals/translate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
            'X-OpenAI-API-Key': realApiKey
        }
    }, {
        raw_goal: "learn Python programming"
    });
    
    if (translateResponse.status !== 200) {
        console.error('Translation failed:', translateResponse.body);
        return;
    }
    
    const goalId = translateResponse.body.data.id;
    console.log('2. Goal created with ID:', goalId, '\n');
    
    // Step 3: Test clarify with minimal data
    console.log('3. Testing clarify endpoint with minimal data...');
    const clarifyResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: `/api/v1/goals/${goalId}/clarify`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
            'X-OpenAI-API-Key': realApiKey
        }
    }, {
        clarifications: [
            {
                question: "What specific Python topics?",
                answer: "Web development with Django",
                smartCriterion: "specific"
            }
        ]
    });
    
    console.log('Clarify response:');
    console.log('Status:', clarifyResponse.status);
    console.log('Body:', JSON.stringify(clarifyResponse.body, null, 2));
    
    // Step 4: Check backend logs hint
    if (clarifyResponse.status === 503) {
        console.log('\n❌ Service error detected. Check backend logs with:');
        console.log('tail -50 /tmp/goal-strategy.log | grep -A 5 -B 5 "clarification\\|OpenAI"');
    }
}

debugClarifyEndpoint().catch(console.error);