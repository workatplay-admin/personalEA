const fetch = require('node-fetch');

async function testTimeoutFix() {
  console.log('Testing timeout fix with problematic input...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

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

    // Now test the problematic input that was causing hangs
    console.log('2. Testing problematic input: "Maybe 50 lines of code per week"');
    
    const startTime = Date.now();
    const clarifyResponse = await fetch(`http://localhost:3000/api/v1/goals/${goalData.data.id}/clarify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OpenAI-API-Key': apiKey
      },
      body: JSON.stringify({
        clarifications: {
          measurable: 'Maybe 50 lines of code per week'
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
      console.log('✅ SUCCESS: AI correctly detected vague response and provided follow-up guidance');
      console.log('   - Feedback:', clarifyData.data.feedback);
      console.log('   - Suggestions:', clarifyData.data.suggestions);
    } else {
      console.log('⚠️  WARNING: AI did not detect vague response - this may indicate an issue');
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
testTimeoutFix();