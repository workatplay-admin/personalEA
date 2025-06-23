#!/usr/bin/env node

/**
 * Final verification before user testing
 */

const axios = require('axios');

async function verifyReady() {
  console.log('🚀 FINAL PERSONALEA VERIFICATION\n');
  
  const apiKey = process.env.OPENAI_API_KEY;
  let ready = true;
  
  // 1. Check services
  console.log('1️⃣ Checking services...');
  try {
    const health = await axios.get('http://localhost:3000/health');
    console.log('✅ API: Running');
    
    await axios.get('http://localhost:5174');
    console.log('✅ Frontend: Running');
  } catch (e) {
    console.log('❌ Services not running');
    ready = false;
  }
  
  // 2. Test API with user's key
  console.log('\n2️⃣ Testing API functionality...');
  if (!apiKey) {
    console.log('❌ No OPENAI_API_KEY in environment');
    ready = false;
  } else {
    try {
      console.log(`🔑 Using API key: ${apiKey.substring(0, 8)}...`);
      
      // Simple API test
      const testResponse = await axios.post('http://localhost:3000/api/v1/goals/translate', {
        raw_goal: 'I want to learn Python programming',
        user_id: 'final-test'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-API-Key': apiKey
        },
        timeout: 30000
      });
      
      if (testResponse.data.success) {
        console.log('✅ Goal translation working');
        console.log(`   Generated: "${testResponse.data.data.title}"`);
      } else {
        console.log('❌ Goal translation failed');
        ready = false;
      }
    } catch (e) {
      console.log(`❌ API test failed: ${e.message}`);
      if (e.response?.status === 401) {
        console.log('   → Invalid API key');
      }
      ready = false;
    }
  }
  
  // 3. Port forwarding reminder
  console.log('\n3️⃣ Codespaces Configuration:');
  console.log('📌 IMPORTANT: In the Ports tab, ensure:');
  console.log('   - Port 3000 is set to PUBLIC (for API)');
  console.log('   - Port 5174 is visible (for Frontend)');
  
  // Final verdict
  console.log('\n' + '='.repeat(50));
  if (ready) {
    console.log('✅ PERSONALEA IS READY FOR USER TESTING!\n');
    console.log('📋 TO START TESTING:');
    console.log('1. Go to Ports tab in Codespaces');
    console.log('2. Make sure port 3000 is PUBLIC');
    console.log('3. Click the globe icon next to port 5174');
    console.log('4. Enter your OpenAI API key in the interface');
    console.log('5. Test goal translation with any goal!\n');
    console.log('🎯 Everything is working correctly!');
  } else {
    console.log('❌ NOT READY - Fix the issues above\n');
    console.log('🔧 Most common fixes:');
    console.log('1. Set port 3000 to PUBLIC in Ports tab');
    console.log('2. Verify your API key is valid');
    console.log('3. Restart services if needed');
  }
  
  return ready;
}

verifyReady();