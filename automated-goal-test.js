#!/usr/bin/env node

/**
 * Automated Goal Translation Test
 * Tests the complete goal translation workflow
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';
const TEST_API_KEY = process.env.OPENAI_API_KEY || 'demo-key';

async function testGoalTranslation() {
    console.log('🎯 Testing Goal Translation Workflow...\n');
    
    const testGoals = [
        {
            name: 'Programming Goal',
            goal: 'I want to learn Python programming this year',
            expectedElements: ['specific', 'measurable', 'timeline', 'programming', 'python']
        },
        {
            name: 'Business Goal',
            goal: 'Launch a new product feature by Q2',
            expectedElements: ['launch', 'product', 'Q2', 'deadline', 'measurable']
        },
        {
            name: 'Fitness Goal',
            goal: 'I want to get in shape',
            expectedElements: ['fitness', 'specific', 'measurable', 'timeline']
        }
    ];
    
    let successCount = 0;
    let totalTests = testGoals.length;
    
    for (const testCase of testGoals) {
        console.log(`🧪 Testing: ${testCase.name}`);
        console.log(`📝 Input: "${testCase.goal}"`);
        
        try {
            const response = await axios.post(`${API_BASE}/goals/translate`, {
                raw_goal: testCase.goal,
                user_id: 'automated-test-user'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-OpenAI-API-Key': TEST_API_KEY
                },
                timeout: 30000
            });
            
            if (response.status === 200 && response.data.smart_goal) {
                console.log('   ✅ Translation successful');
                console.log(`   📋 SMART Goal: ${response.data.smart_goal.substring(0, 150)}...`);
                
                if (response.data.milestones && response.data.milestones.length > 0) {
                    console.log(`   🎯 Generated ${response.data.milestones.length} milestones`);
                }
                
                if (response.data.tasks && response.data.tasks.length > 0) {
                    console.log(`   ✅ Generated ${response.data.tasks.length} tasks`);
                }
                
                successCount++;
            } else {
                console.log('   ❌ Translation failed - invalid response format');
                console.log('   📄 Response:', JSON.stringify(response.data, null, 2));
            }
            
        } catch (error) {
            if (error.response) {
                console.log(`   ❌ Translation failed - HTTP ${error.response.status}`);
                console.log('   📄 Error:', error.response.data);
            } else {
                console.log('   ❌ Translation failed - Network error');
                console.log('   🔍 Error:', error.message);
            }
        }
        
        console.log('');
    }
    
    console.log('📊 Test Summary:');
    console.log(`   ✅ Successful: ${successCount}/${totalTests}`);
    console.log(`   📈 Success Rate: ${Math.round((successCount/totalTests) * 100)}%`);
    
    if (successCount === totalTests) {
        console.log('\n🎉 All goal translation tests passed!');
        console.log('✅ PersonalEA Goal Strategy Service is fully functional');
        return true;
    } else if (successCount > 0) {
        console.log('\n⚠️  Some tests passed, some failed');
        console.log('🔍 Check OpenAI API key and service configuration');
        return false;
    } else {
        console.log('\n❌ All tests failed');
        console.log('🔍 Check if OpenAI API key is valid and services are running');
        return false;
    }
}

async function testTaskBreakdown() {
    console.log('\n🔧 Testing Task Breakdown Workflow...\n');
    
    try {
        // First translate a goal
        const goalResponse = await axios.post(`${API_BASE}/goals/translate`, {
            raw_goal: 'Learn web development in 6 months',
            user_id: 'automated-test-user'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-OpenAI-API-Key': TEST_API_KEY
            },
            timeout: 30000
        });
        
        if (goalResponse.status === 200 && goalResponse.data.goal_id) {
            console.log('✅ Goal created for task breakdown test');
            
            // Test WBS generation (if endpoint exists)
            console.log('🔍 Task breakdown testing requires WBS endpoint implementation');
            console.log('📋 Current response includes task data in goal translation');
            
            if (goalResponse.data.tasks && goalResponse.data.tasks.length > 0) {
                console.log(`✅ Generated ${goalResponse.data.tasks.length} tasks automatically`);
                goalResponse.data.tasks.slice(0, 3).forEach((task, index) => {
                    console.log(`   ${index + 1}. ${task.title || task.name || 'Task'} (${task.estimated_hours || 'N/A'} hours)`);
                });
                return true;
            }
        }
        
    } catch (error) {
        console.log('❌ Task breakdown test failed');
        console.log('🔍 Error:', error.message);
    }
    
    return false;
}

async function runFullWorkflowTest() {
    console.log('🚀 PersonalEA Goal Strategy - Complete Workflow Test\n');
    console.log('=' .repeat(60));
    
    // Check if API key is available
    if (!TEST_API_KEY || TEST_API_KEY === 'demo-key') {
        console.log('⚠️  No OpenAI API key provided');
        console.log('💡 Set OPENAI_API_KEY environment variable for full testing');
        console.log('🔍 Running connectivity tests only...\n');
        
        // Just test connectivity
        try {
            const healthResponse = await axios.get('http://localhost:3000/health');
            console.log('✅ API Server: Connected');
            
            const frontendResponse = await axios.get('http://localhost:5174');
            console.log('✅ Frontend: Connected');
            
            console.log('\n✅ Basic connectivity confirmed');
            console.log('🎯 To test goal translation, set OPENAI_API_KEY and re-run');
            
        } catch (error) {
            console.log('❌ Connectivity test failed:', error.message);
        }
        
        return;
    }
    
    console.log('🔑 OpenAI API Key: Available');
    console.log('🧪 Running complete functional tests...\n');
    
    const goalTranslationSuccess = await testGoalTranslation();
    const taskBreakdownSuccess = await testTaskBreakdown();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Final Test Results:');
    console.log(`   Goal Translation: ${goalTranslationSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Task Breakdown:   ${taskBreakdownSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    if (goalTranslationSuccess) {
        console.log('\n🎉 PersonalEA Goal Strategy Service is ready for user testing!');
        console.log('\n📋 User Testing Instructions:');
        console.log('   1. Open: http://localhost:5174');
        console.log('   2. Enter your OpenAI API key');
        console.log('   3. Test goal translation with various goal types');
        console.log('   4. Review generated SMART goals and task breakdowns');
        console.log('\n⚠️  Remember: This is partial PersonalEA testing');
        console.log('   - Calendar Service is missing');
        console.log('   - Data Sovereignty Framework not implemented');
    } else {
        console.log('\n❌ Issues detected with goal translation');
        console.log('🔧 Troubleshooting needed before user testing');
    }
}

// Run the complete test
runFullWorkflowTest().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
});