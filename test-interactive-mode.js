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

async function testInteractiveMode() {
    console.log('=== Testing Interactive Mode (No Auto-Augmentation) ===\n');
    
    const realApiKey = process.env.OPENAI_API_KEY?.trim();
    if (!realApiKey) {
        console.error('No OPENAI_API_KEY found');
        return;
    }
    
    // Get JWT Token
    const tokenResponse = await makeRequest({
        hostname: 'localhost',
        port: 8085,
        path: '/api/v1/auth/test-token',
        method: 'GET'
    });
    
    const jwtToken = tokenResponse.body.data.token;
    console.log('1. Got JWT token\n');
    
    // Test with simple goal in interactive mode
    console.log('2. Testing with simple goal: "I want to be a race car driver"');
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
        raw_goal: "I want to be a race car driver",
        mode: "interactive"
    });
    
    console.log('Response status:', translateResponse.status);
    
    if (translateResponse.status === 200) {
        const goalData = translateResponse.body.data;
        console.log('✅ Success! Here are the results:\n');
        console.log('📝 Original Goal:', "I want to be a race car driver");
        console.log('🎯 Returned Goal:', goalData.title);
        console.log('🔧 Mode:', goalData.mode || 'not specified');
        console.log('🔄 Needs Refinement:', goalData.needsRefinement || 'not specified');
        console.log('📊 Confidence:', goalData.confidence);
        
        if (goalData.title === "I want to be a race car driver") {
            console.log('\n🎉 SUCCESS: Goal was NOT auto-augmented!');
            console.log('✅ The system correctly preserved the original goal.');
        } else {
            console.log('\n❌ ISSUE: Goal was still auto-augmented');
            console.log('Expected: "I want to be a race car driver"');
            console.log('Got:', goalData.title);
        }
        
        console.log('\n📋 Clarification Questions:');
        if (goalData.clarificationQuestions && goalData.clarificationQuestions.length > 0) {
            goalData.clarificationQuestions.forEach((q, i) => {
                console.log(`  ${i + 1}. ${q}`);
            });
        } else {
            console.log('  No clarification questions found');
        }
        
        console.log('\n🧩 SMART Criteria Status:');
        if (goalData.criteria) {
            Object.keys(goalData.criteria).forEach(key => {
                const criterion = goalData.criteria[key];
                console.log(`  ${key}: ${criterion.confidence * 100}% confidence - "${criterion.value}"`);
            });
        }
        
    } else {
        console.error('❌ Translation failed:', translateResponse.body);
    }
}

testInteractiveMode().catch(console.error);