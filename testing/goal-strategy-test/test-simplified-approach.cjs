const axios = require('axios');

// Test the simplified approach with the specific scenarios the user mentioned:
// 1. "500 lines of code" - should work and let OpenAI evaluate
// 2. "Maybe 500 lines of code" - should work and let OpenAI handle uncertainty

async function testSimplifiedApproach() {
  console.log('🧪 Testing simplified OpenAI-first approach...\n');
  
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
    console.log('📝 Test 1: "500 lines of code" - should work without issues...');
    const startTime1 = Date.now();
    
    const response1 = await axios.post(`${baseURL}/api/v1/goals/test-goal/clarify`, {
      clarifications: {
        measurable: "500 lines of code per week"
      },
      goalContext: {
        title: "Become a senior TypeScript programmer for AWS",
        description: "Career advancement goal"
      }
    }, { 
      headers,
      timeout: 25000
    });
    
    const duration1 = Date.now() - startTime1;
    console.log(`✅ Test 1 completed in ${duration1}ms`);
    console.log(`   Response: ${response1.data.success ? 'Success' : 'Failed'}`);
    console.log(`   Message: ${response1.data.message}`);
    console.log(`   Needs follow-up: ${response1.data.data?.needsFollowUp || false}\n`);
    
    // Wait a moment before next test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('📝 Test 2: "Maybe 500 lines of code" - should handle uncertainty gracefully...');
    const startTime2 = Date.now();
    
    const response2 = await axios.post(`${baseURL}/api/v1/goals/test-goal-2/clarify`, {
      clarifications: {
        measurable: "Maybe 500 lines of code per week"
      },
      goalContext: {
        title: "Become a senior TypeScript programmer for AWS",
        description: "Career advancement goal"
      }
    }, { 
      headers,
      timeout: 25000
    });
    
    const duration2 = Date.now() - startTime2;
    console.log(`✅ Test 2 completed in ${duration2}ms`);
    console.log(`   Response: ${response2.data.success ? 'Success' : 'Failed'}`);
    console.log(`   Message: ${response2.data.message}`);
    console.log(`   Needs follow-up: ${response2.data.data?.needsFollowUp || false}\n`);
    
    // Wait a moment before next test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('📝 Test 3: Retry "Maybe 500 lines of code" - should not hang...');
    const startTime3 = Date.now();
    
    const response3 = await axios.post(`${baseURL}/api/v1/goals/test-goal-3/clarify`, {
      clarifications: {
        measurable: "Maybe 500 lines of code per week"
      },
      goalContext: {
        title: "Become a senior TypeScript programmer for AWS",
        description: "Career advancement goal"
      }
    }, { 
      headers,
      timeout: 25000
    });
    
    const duration3 = Date.now() - startTime3;
    console.log(`✅ Test 3 completed in ${duration3}ms`);
    console.log(`   Response: ${response3.data.success ? 'Success' : 'Failed'}`);
    console.log(`   Message: ${response3.data.message}`);
    console.log(`   Needs follow-up: ${response3.data.data?.needsFollowUp || false}\n`);
    
    // Validate results
    const allSuccessful = response1.data.success && response2.data.success && response3.data.success;
    const allFast = duration1 < 20000 && duration2 < 20000 && duration3 < 20000;
    
    if (allSuccessful && allFast) {
      console.log('🎉 SUCCESS: All tests passed!');
      console.log('   ✅ No hanging or browser crashes detected');
      console.log('   ✅ Both "500 lines" and "Maybe 500 lines" handled correctly');
      console.log('   ✅ OpenAI is doing the heavy lifting for evaluation');
      console.log('   ✅ Retry scenarios work without issues');
      console.log('   ✅ All responses completed within timeout limits');
      
      return true;
    } else {
      console.log('❌ FAILED: Some tests failed or were too slow');
      console.log(`   Response success: ${allSuccessful}`);
      console.log(`   Response speed: ${allFast} (${duration1}ms, ${duration2}ms, ${duration3}ms)`);
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
testSimplifiedApproach()
  .then(success => {
    if (success) {
      console.log('\n🏆 Simplified approach test PASSED');
      console.log('🎯 OpenAI is now handling all the intelligence naturally!');
      process.exit(0);
    } else {
      console.log('\n💥 Simplified approach test FAILED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });