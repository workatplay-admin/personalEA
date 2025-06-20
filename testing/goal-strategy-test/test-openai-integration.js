import axios from 'axios';

// Test script to verify OpenAI integration
const API_BASE_URL = 'http://localhost:3000/api/v1';

// Test configuration - replace with your actual OpenAI API key
const TEST_CONFIG = {
  jwtToken: 'test-token-123',
  openaiApiKey: 'your-openai-api-key-here' // Replace with actual key
};

async function testGoalTranslation() {
  console.log('🧪 Testing Goal Translation...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/goals/translate`, {
      raw_goal: 'I want to get better at programming'
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.jwtToken}`,
        'X-OpenAI-API-Key': TEST_CONFIG.openaiApiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Goal Translation Success!');
    console.log('Goal ID:', response.data.data.id);
    console.log('Title:', response.data.data.title);
    console.log('Overall Confidence:', Math.round(response.data.data.confidence * 100) + '%');
    
    console.log('\nSMART Criteria Confidence Scores:');
    Object.entries(response.data.data.criteria).forEach(([key, criterion]) => {
      console.log(`  ${key}: ${Math.round(criterion.confidence * 100)}%`);
    });

    return response.data.data;
  } catch (error) {
    console.error('❌ Goal Translation Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

async function testGoalClarification(goalId) {
  console.log('\n🧪 Testing Goal Clarification...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/goals/${goalId}/clarify`, {
      clarifications: {
        specific: 'I want to become a senior TypeScript developer'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.jwtToken}`,
        'X-OpenAI-API-Key': TEST_CONFIG.openaiApiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Goal Clarification Success!');
    console.log('AI Feedback:', response.data.message || response.data.data.aiFeedback);
    console.log('Updated Specific Confidence:', Math.round(response.data.data.criteria.specific.confidence * 100) + '%');

    return response.data.data;
  } catch (error) {
    console.error('❌ Goal Clarification Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

async function testHealthCheck() {
  console.log('🧪 Testing Health Check...');
  
  try {
    const response = await axios.get(`http://localhost:3000/health`);
    console.log('✅ Health Check Success!');
    console.log('Status:', response.data.status);
    console.log('Service:', response.data.service);
    return true;
  } catch (error) {
    console.error('❌ Health Check Failed:');
    console.error('Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting OpenAI Integration Tests\n');
  
  // Check if server is running
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Server not running. Please start with: npm run openai-api');
    return;
  }

  // Check if OpenAI API key is configured
  if (TEST_CONFIG.openaiApiKey === 'your-openai-api-key-here') {
    console.log('\n⚠️  Please update TEST_CONFIG.openaiApiKey with your actual OpenAI API key');
    console.log('You can get one from: https://platform.openai.com/api-keys');
    return;
  }

  // Test goal translation
  const goal = await testGoalTranslation();
  if (!goal) return;

  // Test goal clarification
  await testGoalClarification(goal.id);

  console.log('\n🎉 All tests completed!');
  console.log('\nNext steps:');
  console.log('1. Open the frontend at http://localhost:5176/');
  console.log('2. Configure your API key in the interface');
  console.log('3. Test the chat clarification feature');
}

// Run tests
runTests().catch(console.error);