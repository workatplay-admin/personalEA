const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:3000/api/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-OpenAI-API-Key': OPENAI_API_KEY
  }
});

async function testMetricEvaluation() {
  console.log('🧪 Testing Intelligent Metric Evaluation');
  console.log('==========================================\n');

  try {
    // Test the specific scenario mentioned by the user
    const goalId = 'test-goal-123';
    const clarifications = {
      measurable: '200 lines of code per week'
    };
    const goalContext = {
      title: 'I want to be a senior TypeScript programmer for AWS',
      description: 'Career goal to become a senior-level TypeScript developer working at AWS',
      originalGoal: 'I want to be a senior TypeScript programmer for AWS'
    };

    console.log('📋 Test Scenario:');
    console.log(`Goal: "${goalContext.title}"`);
    console.log(`Proposed Metric: "${clarifications.measurable}"`);
    console.log('Expected: AI should reject this metric and suggest better alternatives\n');

    console.log('🚀 Making API call...');
    const response = await api.post(`/goals/${goalId}/clarify`, {
      clarifications,
      goalContext
    });

    console.log('✅ API Response received\n');
    console.log('📊 Response Analysis:');
    console.log('====================');

    const data = response.data.data;
    const needsFollowUp = data?.needsFollowUp;
    const feedback = data?.feedback || response.data.message;
    const suggestions = data?.suggestions;
    const evaluation = data?.evaluation;

    console.log(`Needs Follow-up: ${needsFollowUp ? '✅ YES' : '❌ NO'}`);
    
    if (needsFollowUp) {
      console.log('🎯 SUCCESS: AI correctly identified inadequate metric!\n');
      
      console.log('💬 AI Feedback:');
      console.log('---------------');
      console.log(feedback);
      console.log('');
      
      if (suggestions && suggestions.length > 0) {
        console.log('💡 AI Suggestions:');
        console.log('------------------');
        suggestions.forEach((suggestion, index) => {
          console.log(`${index + 1}. ${suggestion}`);
        });
        console.log('');
      }
      
      if (evaluation) {
        console.log('🔍 Detailed Evaluation:');
        console.log('-----------------------');
        console.log(`Goal Alignment: ${evaluation.goalAlignment}`);
        console.log(`Completeness: ${evaluation.completeness}`);
        console.log(`Effectiveness: ${evaluation.effectiveness}`);
        console.log(`Specificity: ${evaluation.specificity}`);
        console.log('');
      }
      
      // Check if suggestions address the key issues
      const suggestionsText = suggestions ? suggestions.join(' ').toLowerCase() : '';
      const feedbackText = feedback.toLowerCase();
      
      const addressesAWS = suggestionsText.includes('aws') || feedbackText.includes('aws');
      const addressesSeniority = suggestionsText.includes('senior') || suggestionsText.includes('certification') || suggestionsText.includes('leadership');
      const addressesQuality = suggestionsText.includes('quality') || feedbackText.includes('quality') || feedbackText.includes('lines of code');
      
      console.log('🎯 Key Issue Coverage:');
      console.log('----------------------');
      console.log(`AWS-specific aspects: ${addressesAWS ? '✅' : '❌'}`);
      console.log(`Seniority/Leadership: ${addressesSeniority ? '✅' : '❌'}`);
      console.log(`Quality over Quantity: ${addressesQuality ? '✅' : '❌'}`);
      
      if (addressesAWS && addressesSeniority && addressesQuality) {
        console.log('\n🏆 EXCELLENT: AI addressed all key aspects of the goal!');
      } else {
        console.log('\n⚠️  PARTIAL: AI missed some key aspects of the goal.');
      }
      
    } else {
      console.log('❌ FAILURE: AI incorrectly accepted inadequate metric');
      console.log('The AI should have detected that "200 lines of code per week" is not adequate for measuring progress toward becoming a senior TypeScript programmer at AWS.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('🔑 Authentication error - check your OpenAI API key');
    }
  }
}

// Test with a good metric for comparison
async function testGoodMetric() {
  console.log('\n\n🧪 Testing with Good Metric (Control Test)');
  console.log('===========================================\n');

  try {
    const goalId = 'test-goal-456';
    const clarifications = {
      measurable: 'Complete AWS Developer Associate certification, build 3 TypeScript projects using AWS services, and lead 2 code review sessions per month'
    };
    const goalContext = {
      title: 'I want to be a senior TypeScript programmer for AWS',
      description: 'Career goal to become a senior-level TypeScript developer working at AWS',
      originalGoal: 'I want to be a senior TypeScript programmer for AWS'
    };

    console.log('📋 Control Test Scenario:');
    console.log(`Goal: "${goalContext.title}"`);
    console.log(`Proposed Metric: "${clarifications.measurable}"`);
    console.log('Expected: AI should accept this comprehensive metric\n');

    console.log('🚀 Making API call...');
    const response = await api.post(`/goals/${goalId}/clarify`, {
      clarifications,
      goalContext
    });

    const data = response.data.data;
    const needsFollowUp = data?.needsFollowUp;
    
    console.log(`Needs Follow-up: ${needsFollowUp ? '❌ YES' : '✅ NO'}`);
    
    if (!needsFollowUp) {
      console.log('🎯 SUCCESS: AI correctly accepted comprehensive metric!');
    } else {
      console.log('⚠️  UNEXPECTED: AI requested follow-up for good metric');
      console.log('Feedback:', data?.feedback || response.data.message);
    }

  } catch (error) {
    console.error('❌ Control test failed:', error.response?.data || error.message);
  }
}

// Run the tests
async function runTests() {
  await testMetricEvaluation();
  await testGoodMetric();
  
  console.log('\n🏁 Testing Complete');
  console.log('===================');
  console.log('The intelligent metric evaluation system should now properly evaluate whether proposed metrics effectively measure progress toward specific goals.');
}

runTests();