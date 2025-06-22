#!/usr/bin/env node

/**
 * PersonalEA Setup Verification Script
 * Run this to verify everything is configured correctly
 */

const axios = require('axios');

async function verifySetup() {
  console.log('🔍 PERSONALEA SETUP VERIFICATION\n');
  
  let allPassed = true;
  
  // Test 1: Local API Health
  console.log('1️⃣ Testing API server...');
  try {
    const health = await axios.get('http://localhost:3000/health', { timeout: 5000 });
    if (health.data.status === 'OK') {
      console.log('   ✅ API server running correctly');
    } else {
      console.log('   ❌ API server responding but unhealthy');
      allPassed = false;
    }
  } catch (e) {
    console.log('   ❌ API server not accessible');
    console.log('   🔧 Fix: Run "npm run test-env-openai" in testing directory');
    allPassed = false;
  }
  
  // Test 2: Frontend
  console.log('\n2️⃣ Testing frontend...');
  try {
    const frontend = await axios.get('http://localhost:5174', { timeout: 5000 });
    if (frontend.data.includes('Goal & Strategy Service Testing')) {
      console.log('   ✅ Frontend serving correctly');
    } else {
      console.log('   ❌ Frontend not serving expected content');
      allPassed = false;
    }
  } catch (e) {
    console.log('   ❌ Frontend not accessible');
    allPassed = false;
  }
  
  // Test 3: Port 3000 Public Access
  console.log('\n3️⃣ Testing port 3000 public access...');
  try {
    const codespaceUrl = 'https://psychic-space-robot-vpw7gr9q6j39qv-3000.app.github.dev';
    const publicTest = await axios.get(`${codespaceUrl}/health`, { 
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status
    });
    
    if (publicTest.status === 200 && publicTest.data.status === 'OK') {
      console.log('   ✅ Port 3000 is PUBLIC and accessible');
    } else if (publicTest.status === 401) {
      console.log('   ❌ Port 3000 is PRIVATE - must be set to PUBLIC');
      console.log('   🔧 Fix: Ports tab → Right-click port 3000 → Port Visibility → Public');
      allPassed = false;
    } else {
      console.log(`   ❌ Unexpected response from port 3000: ${publicTest.status}`);
      allPassed = false;
    }
  } catch (e) {
    console.log('   ❌ Cannot access port 3000 publicly');
    console.log('   🔧 Fix: Set port 3000 to PUBLIC in Codespaces Ports tab');
    allPassed = false;
  }
  
  // Test 4: CORS Configuration
  console.log('\n4️⃣ Testing CORS configuration...');
  try {
    const codespaceUrl = 'https://psychic-space-robot-vpw7gr9q6j39qv-3000.app.github.dev';
    const corsTest = await axios.options(`${codespaceUrl}/api/v1/goals/translate`, {
      headers: {
        'Origin': codespaceUrl.replace('-3000', '-5174'),
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, X-OpenAI-API-Key, Cache-Control'
      },
      timeout: 10000
    });
    
    const corsHeaders = corsTest.headers;
    if (corsHeaders['access-control-allow-headers']?.includes('Cache-Control')) {
      console.log('   ✅ CORS configured correctly (includes Cache-Control)');
    } else {
      console.log('   ❌ CORS missing Cache-Control header');
      console.log('   🔧 Fix: Add Cache-Control to allowedHeaders in openai-api-server.js');
      allPassed = false;
    }
  } catch (e) {
    console.log('   ❌ CORS preflight failed');
    console.log(`   Error: ${e.message}`);
    allPassed = false;
  }
  
  // Test 5: API Key and Goal Translation
  console.log('\n5️⃣ Testing goal translation...');
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  
  if (!apiKey) {
    console.log('   ⚠️  No OPENAI_API_KEY found in environment');
    console.log('   🔧 Set with: export OPENAI_API_KEY="sk-your-key"');
  } else {
    console.log(`   🔑 API key found: ${apiKey.substring(0, 8)}...`);
    
    try {
      const goalTest = await axios.post('https://psychic-space-robot-vpw7gr9q6j39qv-3000.app.github.dev/api/v1/goals/translate', {
        raw_goal: 'Learn Python programming for data science',
        user_id: 'setup-verification'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-API-Key': apiKey
        },
        timeout: 30000
      });
      
      if (goalTest.data.success && goalTest.data.data) {
        console.log('   ✅ Goal translation working perfectly');
        console.log(`   📋 Generated: "${goalTest.data.data.title}"`);
        console.log(`   🎯 Confidence: ${(goalTest.data.data.confidence * 100).toFixed(1)}%`);
      } else {
        console.log('   ❌ Goal translation returned unsuccessful response');
        allPassed = false;
      }
    } catch (e) {
      if (e.response?.status === 401) {
        console.log('   ❌ API key unauthorized or invalid');
      } else {
        console.log('   ❌ Goal translation failed');
        console.log(`   Error: ${e.message}`);
      }
      allPassed = false;
    }
  }
  
  // Final Report
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ PersonalEA is ready for user testing!');
    console.log('\n📋 User Testing Instructions:');
    console.log('1. Go to Ports tab in Codespaces');
    console.log('2. Click globe icon next to port 5174');
    console.log('3. Enter OpenAI API key in the interface');
    console.log('4. Test goal translation');
    console.log('\n🚀 Everything is verified working!');
  } else {
    console.log('❌ SETUP INCOMPLETE');
    console.log('⚠️  Fix the issues above before user testing');
    console.log('\n📖 See RELIABLE_TESTING_SETUP.md for detailed fixes');
  }
  
  return allPassed;
}

verifySetup().catch(error => {
  console.error('❌ Verification script failed:', error.message);
  process.exit(1);
});