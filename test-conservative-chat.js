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

async function testConservativeChat() {
    console.log('=== Testing Conservative Chat (No Assumptions) ===\n');
    
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
    
    // Step 1: Create initial goal
    console.log('2. Creating initial goal: "I want to be a race car driver"');
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
    
    if (translateResponse.status !== 200) {
        console.error('Failed to create goal:', translateResponse.body);
        return;
    }
    
    const goalId = translateResponse.body.data.id;
    console.log('✅ Goal created with ID:', goalId);
    console.log('📝 Goal title:', translateResponse.body.data.title);
    
    // Step 2: Simulate user saying "hobby racer at my local track"
    console.log('\n3. User says: "I want to be a hobby racer at my local track"');
    console.log('   (Should NOT add timeframes or make assumptions)\n');
    
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
                question: "What specifically do you want to accomplish?",
                answer: "I want to be a hobby racer at my local track",
                smartCriterion: "specific"
            }
        ],
        goalContext: {
            title: "I want to be a race car driver",
            description: "I want to be a race car driver",
            originalGoal: "I want to be a race car driver"
        },
        conversationHistory: [
            {
                role: "assistant",
                content: "What specifically do you want to accomplish?"
            },
            {
                role: "user", 
                content: "I want to be a hobby racer at my local track"
            }
        ]
    });
    
    console.log('Clarify response status:', clarifyResponse.status);
    
    if (clarifyResponse.status === 200) {
        const updatedGoal = clarifyResponse.body.data;
        console.log('✅ Chat response received!\n');
        
        console.log('📝 Updated Goal Title:', updatedGoal.title);
        console.log('📊 Overall Confidence:', updatedGoal.confidence);
        
        console.log('\n🧩 SMART Criteria Analysis:');
        const criteria = updatedGoal.smart_criteria || updatedGoal.smartCriteria;
        
        // Check each component for assumptions
        Object.keys(criteria).forEach(key => {
            const criterion = criteria[key];
            console.log(`\n${key.toUpperCase()}:`);
            console.log(`  Value: "${criterion.value}"`);
            console.log(`  Confidence: ${Math.round(criterion.confidence * 100)}%`);
            
            // Flag potential issues
            if (key === 'timeBound' && criterion.value.includes('year') && criterion.confidence > 0.5) {
                console.log('  ⚠️  WARNING: Added timeframe without user specifying!');
            }
            if (key === 'achievable' && criterion.confidence > 0.6) {
                console.log('  ⚠️  WARNING: High achievability without checking feasibility!');
            }
            if (key === 'relevant' && criterion.confidence > 0.6) {
                console.log('  ⚠️  WARNING: High relevance without checking broader goals!');
            }
            if (criterion.missing && criterion.missing.length > 0) {
                console.log(`  Missing: ${criterion.missing.join(', ')}`);
            }
        });
        
        console.log('\n❓ Follow-up Questions:');
        const questions = updatedGoal.remaining_questions || updatedGoal.clarification_questions || [];
        if (questions.length > 0) {
            questions.forEach((q, i) => {
                console.log(`  ${i + 1}. ${q}`);
            });
        } else {
            console.log('  No follow-up questions (this might be an issue)');
        }
        
    } else {
        console.error('❌ Chat clarification failed:', clarifyResponse.body);
    }
}

testConservativeChat().catch(console.error);