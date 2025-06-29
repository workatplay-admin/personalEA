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

async function testComprehensiveParsing() {
    console.log('=== Testing Comprehensive Answer Parsing ===\n');
    
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
    console.log('✅ Goal created\n');
    
    // Step 2: Give comprehensive answer with timeframes, metrics, and specifics
    console.log('3. User gives comprehensive answer:');
    console.log('   "I want to compete in 3 local races within 6 months, tracking my lap times to improve by 5 seconds"');
    console.log('   (Should update Specific, Measurable, AND Time-bound components)\n');
    
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
                question: "What specifically do you want to accomplish with racing?",
                answer: "I want to compete in 3 local races within 6 months, tracking my lap times to improve by 5 seconds",
                smartCriterion: "specific"
            }
        ],
        goalContext: {
            title: "I want to be a race car driver",
            description: "I want to be a race car driver",
            originalGoal: "I want to be a race car driver"
        }
    });
    
    console.log('Clarify response status:', clarifyResponse.status);
    
    if (clarifyResponse.status === 200) {
        const updatedGoal = clarifyResponse.body.data;
        console.log('✅ Response received!\n');
        
        console.log('📊 Component Analysis (Before/After):');
        const criteria = updatedGoal.smart_criteria || updatedGoal.smartCriteria;
        
        // Check if multiple components were updated
        const componentUpdates = {
            specific: criteria.specific.confidence,
            measurable: criteria.measurable.confidence,
            timeBound: criteria.timeBound.confidence,
            achievable: criteria.achievable.confidence,
            relevant: criteria.relevant.confidence
        };
        
        console.log('Component Confidence Scores:');
        Object.entries(componentUpdates).forEach(([key, confidence]) => {
            const score = Math.round(confidence * 100);
            console.log(`  ${key}: ${score}%`);
            
            // Check for improvements
            if (key === 'specific' && score >= 70) {
                console.log('    ✅ Specific component properly updated with race details');
            }
            if (key === 'measurable' && score >= 70) {
                console.log('    ✅ Measurable component updated with "3 races, lap times, 5 seconds"');
            }
            if (key === 'timeBound' && score >= 70) {
                console.log('    ✅ Time-bound component updated with "6 months"');
            }
        });
        
        console.log('\n📝 Component Values:');
        Object.entries(criteria).forEach(([key, criterion]) => {
            console.log(`\n${key.toUpperCase()}:`);
            console.log(`  Value: "${criterion.value}"`);
            if (criterion.missing && criterion.missing.length > 0) {
                console.log(`  Still missing: ${criterion.missing.join(', ')}`);
            }
        });
        
        // Check if it's asking about things already provided
        const questions = updatedGoal.remaining_questions || updatedGoal.clarification_questions || [];
        console.log('\n❓ Follow-up Questions:');
        if (questions.length > 0) {
            questions.forEach((q, i) => {
                console.log(`  ${i + 1}. ${q}`);
                
                // Flag problematic questions
                if (q.toLowerCase().includes('timeframe') || q.toLowerCase().includes('when')) {
                    console.log('    ⚠️  WARNING: Still asking about timeframe despite "6 months" being provided!');
                }
                if (q.toLowerCase().includes('measure') || q.toLowerCase().includes('metric')) {
                    console.log('    ⚠️  WARNING: Still asking about metrics despite "3 races, lap times" being provided!');
                }
            });
        } else {
            console.log('  No follow-up questions (system recognized comprehensive answer!)');
        }
        
        // Overall assessment
        const multipleComponentsUpdated = (
            componentUpdates.specific >= 0.7 &&
            componentUpdates.measurable >= 0.7 &&
            componentUpdates.timeBound >= 0.7
        );
        
        if (multipleComponentsUpdated) {
            console.log('\n🎉 SUCCESS: Multiple SMART components updated from single answer!');
        } else {
            console.log('\n❌ ISSUE: System failed to extract all information from comprehensive answer');
        }
        
    } else {
        console.error('❌ Clarify request failed:', clarifyResponse.body);
    }
}

testComprehensiveParsing().catch(console.error);