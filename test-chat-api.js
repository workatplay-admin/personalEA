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

async function testChatEndpoints() {
    console.log('=== Testing Chat Endpoints ===\n');
    
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
    console.log('✓ Got JWT token:', jwtToken.substring(0, 50) + '...\n');
    
    // Step 2: Test component-question endpoint
    console.log('2. Testing component-question endpoint...');
    const componentResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: '/api/v1/goals/component-question',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        }
    }, {
        goalTitle: "become a Senior Developer",
        componentKey: "specific",
        currentValue: "Achieve a promotion to senior developer",
        confidence: 0.7,
        isHighConfidence: false,
        goalContext: { title: "become a Senior Developer" }
    });
    
    console.log('Response status:', componentResponse.status);
    console.log('Response body:', JSON.stringify(componentResponse.body, null, 2));
    
    if (componentResponse.status === 200) {
        console.log('✓ Component question generated successfully!\n');
        console.log('Generated question:', componentResponse.body.data.question);
    } else {
        console.log('✗ Failed to generate component question\n');
    }
    
    // Step 3: Test contextual-help endpoint
    console.log('\n3. Testing contextual-help endpoint...');
    const contextualResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: '/api/v1/goals/contextual-help',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        }
    }, {
        goalTitle: "become a Senior Developer",
        componentKey: "measurable",
        conversationHistory: [
            {
                role: "assistant",
                content: "Let's make your goal measurable. What metrics will you use?"
            },
            {
                role: "user",
                content: "I don't know what metrics to use"
            }
        ],
        goalContext: {
            title: "become a Senior Developer",
            confidence: 0.7
        }
    });
    
    console.log('Response status:', contextualResponse.status);
    console.log('Response body:', JSON.stringify(contextualResponse.body, null, 2));
    
    if (contextualResponse.status === 200) {
        console.log('✓ Contextual help generated successfully!\n');
        console.log('Help message:', contextualResponse.body.data.helpMessage);
    } else {
        console.log('✗ Failed to generate contextual help\n');
    }
    
    // Step 4: Test through Vite proxy (simulating frontend)
    console.log('\n4. Testing through Vite proxy (port 5174)...');
    const proxyResponse = await makeRequest({
        hostname: 'localhost',
        port: 5174,
        path: '/api/v1/goals/component-question',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        }
    }, {
        goalTitle: "learn machine learning",
        componentKey: "measurable",
        currentValue: "Learn ML basics",
        confidence: 0.5,
        isHighConfidence: false,
        goalContext: { title: "learn machine learning" }
    });
    
    console.log('Proxy response status:', proxyResponse.status);
    console.log('Proxy response body:', JSON.stringify(proxyResponse.body, null, 2));
    
    if (proxyResponse.status === 200) {
        console.log('✓ API works through Vite proxy!\n');
    } else {
        console.log('✗ API failed through Vite proxy\n');
    }
}

testChatEndpoints().catch(console.error);