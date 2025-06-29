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

async function testChatFlowWithRealAPI() {
    console.log('=== Testing Chat Flow with Real OpenAI API Key ===\n');
    
    const realApiKey = process.env.OPENAI_API_KEY?.trim();
    if (!realApiKey || !realApiKey.startsWith('sk-')) {
        console.error('❌ No valid OPENAI_API_KEY found in environment');
        return;
    }
    
    console.log('✓ Using real OpenAI API key:', realApiKey.substring(0, 10) + '...\n');
    
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
    
    // Step 2: Translate goal with REAL API key (this should save to database)
    console.log('2. Translating goal to SMART format with real API key...');
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
        raw_goal: "become a Senior Developer"
    });
    
    console.log('Translate response status:', translateResponse.status);
    
    if (translateResponse.status !== 200) {
        console.error('Failed to translate goal:', translateResponse.body);
        return;
    }
    
    const goalData = translateResponse.body.data;
    const goalId = goalData.id;
    console.log('✓ Goal translated successfully!');
    console.log('  Goal ID:', goalId);
    console.log('  Title:', goalData.title);
    console.log('  Confidence:', goalData.confidence);
    console.log('  Has clarification questions:', goalData.clarificationQuestions?.length > 0);
    console.log('\n');
    
    // Step 3: Test clarify endpoint (simulating chat interaction)
    console.log('3. Testing chat clarification (simulating user reply)...');
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
                question: "What specific aspects would you like to clarify?",
                answer: "I want to focus on React and TypeScript skills, and lead a frontend team",
                smartCriterion: "specific"
            }
        ],
        goalContext: {
            title: goalData.title,
            description: goalData.description,
            originalGoal: "become a Senior Developer"
        },
        conversationHistory: [
            {
                role: "assistant",
                content: "Let's make your goal more specific. What aspects would you like to clarify?"
            },
            {
                role: "user",
                content: "I want to focus on React and TypeScript skills, and lead a frontend team"
            }
        ]
    });
    
    console.log('Clarify response status:', clarifyResponse.status);
    
    if (clarifyResponse.status === 200) {
        console.log('✓ Chat clarification works successfully!');
        const updatedGoal = clarifyResponse.body.data;
        console.log('  Updated title:', updatedGoal.title);
        console.log('  Response includes:', {
            hasUpdatedCriteria: !!updatedGoal.smart_criteria || !!updatedGoal.smartCriteria,
            hasRemainingQuestions: !!updatedGoal.remaining_questions
        });
    } else if (clarifyResponse.status === 404) {
        console.error('❌ Goal not found - database save failed!');
        console.error('This is the bug the user reported!');
    } else {
        console.error('❌ Clarify endpoint failed:', clarifyResponse.body);
    }
    
    console.log('\n=== Test Complete ===');
    console.log('The database save fix should ensure chat replies work correctly.');
}

testChatFlowWithRealAPI().catch(console.error);