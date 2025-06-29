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

async function testClarifyFlow() {
    console.log('=== Testing Complete Chat Flow with Clarify Endpoint ===\n');
    
    // Step 1: Get JWT Token
    console.log('1. Getting JWT Token...');
    const tokenResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: '/api/v1/auth/test-token',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    if (tokenResponse.status !== 200) {
        console.error('Failed to get JWT token:', tokenResponse);
        return;
    }
    
    const jwtToken = tokenResponse.body.data.token;
    console.log('✓ Got JWT token\n');
    
    // Step 2: Translate goal (this should now save to database)
    console.log('2. Translating goal to SMART format...');
    const translateResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: '/api/v1/goals/translate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
            'X-OpenAI-API-Key': 'sk-test1234567890abcdef' // Test key
        }
    }, {
        raw_goal: "become a Senior Developer"
    });
    
    console.log('Translate response status:', translateResponse.status);
    console.log('Translate response:', JSON.stringify(translateResponse.body, null, 2));
    
    if (translateResponse.status !== 200) {
        console.error('Failed to translate goal');
        return;
    }
    
    const goalId = translateResponse.body.data.id;
    console.log('✓ Goal translated and saved with ID:', goalId, '\n');
    
    // Step 3: Test clarify endpoint
    console.log('3. Testing clarify endpoint...');
    const clarifyResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: `/api/v1/goals/${goalId}/clarify`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
            'X-OpenAI-API-Key': 'sk-test1234567890abcdef' // Test key
        }
    }, {
        clarifications: [
            {
                question: "What is the specific aspect of your goal?",
                answer: "I want to learn advanced React patterns and lead a team",
                smartCriterion: "specific"
            }
        ],
        goalContext: {
            title: "become a Senior Developer",
            description: "Achieve senior developer position",
            originalGoal: "become a Senior Developer"
        },
        conversationHistory: [
            {
                role: "assistant",
                content: "Let's make your goal more specific."
            },
            {
                role: "user",
                content: "I want to learn advanced React patterns and lead a team"
            }
        ]
    });
    
    console.log('Clarify response status:', clarifyResponse.status);
    console.log('Clarify response:', JSON.stringify(clarifyResponse.body, null, 2));
    
    if (clarifyResponse.status === 200) {
        console.log('✓ Clarify endpoint works!');
    } else if (clarifyResponse.status === 404) {
        console.log('✗ Goal not found - database save may have failed');
    } else {
        console.log('✗ Clarify endpoint failed with status:', clarifyResponse.status);
    }
    
    // Step 4: Test through Vite proxy
    console.log('\n4. Testing clarify through Vite proxy...');
    const proxyResponse = await makeRequest({
        hostname: 'localhost',
        port: 5174,
        path: `/api/v1/goals/${goalId}/clarify`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
            'X-OpenAI-API-Key': 'sk-test1234567890abcdef'
        }
    }, {
        clarifications: [
            {
                question: "What metrics will you use?",
                answer: "Complete 3 advanced courses and lead 2 projects",
                smartCriterion: "measurable"
            }
        ],
        goalContext: {
            title: "become a Senior Developer"
        }
    });
    
    console.log('Proxy clarify response status:', proxyResponse.status);
    if (proxyResponse.status === 200) {
        console.log('✓ Clarify works through Vite proxy!');
    }
}

testClarifyFlow().catch(console.error);