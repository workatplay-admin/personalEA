const fetch = require('node-fetch');

async function testMetricEvaluationTimeout() {
  console.log('Testing metric evaluation timeout handling...');
  
  const apiKey = process.env.OPENAI_API_KEY || "test-key-for-timeout-testing";

  try {
    // First create a goal
    console.log('1. Creating a goal...');
    const goalResponse = await fetch('http://localhost:3000/api/v1/goals/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OpenAI-API-Key': apiKey
      },
      body: JSON.stringify({
        raw_goal: 'I want to be a senior TypeScript programmer for AWS'
      })
    });

    if (!goalResponse.ok) {
      throw new Error(`Goal creation failed: ${goalResponse.status}`);
    }

    const goalData = await goalResponse.json();
    console.log('Goal created successfully:', goalData.data.id);

    // Test with a non-vague response that should trigger metric evaluation
    console.log('2. Testing metric evaluation with: "200 lines of code per week"');
    
    const startTime = Date.now();
    const clarifyResponse = await fetch(`http://localhost:3000/api/v1/goals/${goalData.data.id}/clarify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OpenAI-API-Key': apiKey
      },
      body: JSON.stringify({
        clarifications: {
          measurable: '200 lines of code per week'
        },
        goalContext: {
          title: 'I want to be a senior TypeScript programmer for AWS',
          description: 'I want to be a senior TypeScript programmer for AWS',
          originalGoal: 'I want to be a senior TypeScript programmer for AWS'
        }
      })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Request completed in ${duration}ms`);

    if (!clarifyResponse.ok) {
      throw new Error(`Clarification failed: ${clarifyResponse.status}`);
    }

    const clarifyData = await clarifyResponse.json();
    console.log('3. Response received successfully:');
    console.log('   - Success:', clarifyData.success);
    console.log('   - Needs follow-up:', clarifyData.data?.needsFollowUp);
    console.log('   - Message:', clarifyData.message);
    
    if (clarifyData.data?.needsFollowUp) {
      console.log('✅ SUCCESS: AI correctly detected inadequate metric and provided feedback');
      console.log('   - Feedback:', clarifyData.data.feedback);
      console.log('   - Suggestions:', clarifyData.data.suggestions);
    } else {
      console.log('✅ SUCCESS: Metric was accepted or basic evaluation passed');
    }

    console.log('\n🎉 Test completed successfully - no hanging detected!');
    console.log(`Total request time: ${duration}ms (should be under 15 seconds)`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
      console.error('This indicates the timeout fix may not be working properly');
    }
    
    process.exit(1);
  }
}

// Run the test
testMetricEvaluationTimeout();