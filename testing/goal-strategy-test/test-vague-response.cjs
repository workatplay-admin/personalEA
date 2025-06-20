const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  openaiApiKey: 'test-key-placeholder', // Will use mock responses for testing
  testGoal: {
    id: 'test-goal-1',
    title: 'Get better at programming',
    description: 'I want to improve my coding skills',
    components: {
      specific: { value: '', confidence: 0 },
      measurable: { value: '', confidence: 0 },
      achievable: { value: '', confidence: 0 },
      relevant: { value: '', confidence: 0 },
      timeBound: { value: '', confidence: 0 }
    }
  }
};

async function testVagueResponseHandling() {
  console.log('🧪 Testing Vague Response Detection and Follow-up...\n');

  try {
    // Test 1: Vague response that should trigger follow-up
    console.log('📝 Test 1: Submitting vague response for "Specific" component');
    const vagueResponse = await axios.post(`${BASE_URL}/api/v1/goals/${TEST_CONFIG.testGoal.id}/clarify`, {
      clarifications: {
        specific: "I'm not sure exactly what I want to focus on"
      }
    }, {
      headers: {
        'X-OpenAI-API-Key': TEST_CONFIG.openaiApiKey
      }
    });

    console.log('Response:', JSON.stringify(vagueResponse.data, null, 2));
    
    if (vagueResponse.data.data && vagueResponse.data.data.needsFollowUp) {
      console.log('✅ SUCCESS: Vague response correctly detected!');
      console.log('📋 Follow-up message:', vagueResponse.data.data.feedback);
    } else {
      console.log('❌ FAILED: Vague response not detected - system would advance incorrectly');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Uncertain time commitment response
    console.log('📝 Test 2: Submitting uncertain time commitment response');
    const uncertainResponse = await axios.post(`${BASE_URL}/api/v1/goals/${TEST_CONFIG.testGoal.id}/clarify`, {
      clarifications: {
        achievable: "I'm uncertain about how much time I can commit outside of work and family life"
      }
    }, {
      headers: {
        'X-OpenAI-API-Key': TEST_CONFIG.openaiApiKey
      }
    });

    console.log('Response:', JSON.stringify(uncertainResponse.data, null, 2));
    
    if (uncertainResponse.data.data && uncertainResponse.data.data.needsFollowUp) {
      console.log('✅ SUCCESS: Uncertain response correctly detected!');
      console.log('📋 Follow-up message:', uncertainResponse.data.data.feedback);
    } else {
      console.log('❌ FAILED: Uncertain response not detected - system would advance incorrectly');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: Clear, specific response that should proceed
    console.log('📝 Test 3: Submitting clear, specific response');
    const clearResponse = await axios.post(`${BASE_URL}/api/v1/goals/${TEST_CONFIG.testGoal.id}/clarify`, {
      clarifications: {
        specific: "I want to learn React and TypeScript by building 3 complete web applications, focusing on modern hooks, state management, and API integration"
      }
    }, {
      headers: {
        'X-OpenAI-API-Key': TEST_CONFIG.openaiApiKey
      }
    });

    console.log('Response:', JSON.stringify(clearResponse.data, null, 2));
    
    if (!clearResponse.data.data || !clearResponse.data.data.needsFollowUp) {
      console.log('✅ SUCCESS: Clear response correctly processed - ready to advance!');
    } else {
      console.log('❌ FAILED: Clear response incorrectly flagged for follow-up');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Vague Response Detection Tests\n');
  
  // Check if server is running
  try {
    const healthCheck = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running:', healthCheck.data.status);
    console.log('');
  } catch (error) {
    console.error('❌ Server not running. Please start with: node openai-api-server.js');
    return;
  }

  await testVagueResponseHandling();
  
  console.log('\n🎯 Test Summary:');
  console.log('- Vague responses should be detected and trigger follow-up questions');
  console.log('- Clear responses should proceed normally');
  console.log('- The system should help users work through their challenges');
  console.log('- No advancement should happen until meaningful clarification is provided');
}

runTests();