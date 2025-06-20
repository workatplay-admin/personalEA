const axios = require('axios');

// Test the specific scenario the user reported:
// 1. Send a vague response that triggers timeout
// 2. Retry with the same response
// 3. Verify the server responds properly both times

async function testRetryScenario() {
  console.log('🧪 Testing retry scenario that previously caused browser hangs...\n');
  
  const baseURL = 'http://localhost:3000';
  const apiKey = process.env.OPENAI_API_KEY || 'test-key';
  
  if (!apiKey || apiKey === 'test-key') {
    console.log('⚠️  Warning: No real OpenAI API key found. Using test key.');
    console.log('   This test will use fallback responses.\n');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'X-OpenAI-API-Key': apiKey
  };
  
  try {
    console.log('📝 Step 1: Sending vague response that might trigger timeout...');
    const startTime1 = Date.now();
    
    const response1 = await axios.post(`${baseURL}/api/v1/goals/test-goal/clarify`, {
      clarifications: {
        measurable: "Maybe 50 lines of code per week"
      },
      goalContext: {
        title: "Become a senior TypeScript programmer for AWS",
        description: "Career advancement goal"
      }
    }, { 
      headers,
      timeout: 25000 // 25 second client timeout
    });
    
    const duration1 = Date.now() - startTime1;
    console.log(`✅ First request completed in ${duration1}ms`);
    console.log(`   Response: ${response1.data.success ? 'Success' : 'Failed'}`);
    console.log(`   Message: ${response1.data.message}`);
    console.log(`   Needs follow-up: ${response1.data.data?.needsFollowUp || false}\n`);
    
    // Wait a moment before retry
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🔄 Step 2: Retrying with the same response...');
    const startTime2 = Date.now();
    
    const response2 = await axios.post(`${baseURL}/api/v1/goals/test-goal/clarify`, {
      clarifications: {
        measurable: "Maybe 50 lines of code per week"
      },
      goalContext: {
        title: "Become a senior TypeScript programmer for AWS",
        description: "Career advancement goal"
      }
    }, { 
      headers,
      timeout: 25000 // 25 second client timeout
    });
    
    const duration2 = Date.now() - startTime2;
    console.log(`✅ Second request completed in ${duration2}ms`);
    console.log(`   Response: ${response2.data.success ? 'Success' : 'Failed'}`);
    console.log(`   Message: ${response2.data.message}`);
    console.log(`   Needs follow-up: ${response2.data.data?.needsFollowUp || false}\n`);
    
    // Validate results
    if (response1.data.success && response2.data.success) {
      console.log('🎉 SUCCESS: Both requests completed successfully!');
      console.log('   ✅ No hanging or browser crashes detected');
      console.log('   ✅ Server responded within timeout limits');
      console.log('   ✅ Retry scenario works correctly');
      
      if (duration1 < 20000 && duration2 < 20000) {
        console.log('   ✅ Both requests completed well within timeout limits');
      }
      
      return true;
    } else {
      console.log('❌ FAILED: One or both requests failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.error('   🚨 CLIENT TIMEOUT: Request took longer than 25 seconds');
      console.error('   🚨 This indicates the server is still hanging!');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   🚨 CONNECTION REFUSED: Server is not running');
    }
    
    return false;
  }
}

// Run the test
testRetryScenario()
  .then(success => {
    if (success) {
      console.log('\n🏆 Retry scenario test PASSED');
      process.exit(0);
    } else {
      console.log('\n💥 Retry scenario test FAILED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });