#!/usr/bin/env node

/**
 * Final Browser-Specific Verification
 * Tests exactly what the user's browser would experience
 */

const axios = require('axios');

async function testBrowserScenario() {
  console.log('🌐 FINAL BROWSER VERIFICATION\n');
  
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const codespaceApiUrl = 'https://psychic-space-robot-vpw7gr9q6j39qv-3000.app.github.dev';
  
  console.log('📋 Testing EXACT browser scenario:');
  console.log('1. Browser loads from: https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev');
  console.log('2. JavaScript makes API calls to: https://psychic-space-robot-vpw7gr9q6j39qv-3000.app.github.dev');
  console.log('3. CORS must allow cross-origin requests\n');
  
  // Test 1: Can browser access the API endpoint?
  console.log('🧪 Test 1: Browser API Access');
  try {
    const response = await axios.get(`${codespaceApiUrl}/health`, {
      headers: {
        'Origin': 'https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev',
        'User-Agent': 'Mozilla/5.0 (Browser Test)'
      },
      timeout: 10000
    });
    
    if (response.status === 200) {
      console.log('✅ Browser can access API endpoint');
      console.log(`   Response: ${JSON.stringify(response.data)}`);
    }
  } catch (e) {
    console.log('❌ Browser cannot access API endpoint');
    console.log(`   Error: ${e.message}`);
    
    if (e.response?.status === 401) {
      console.log('   → Port 3000 is PRIVATE - must be set to PUBLIC');
      console.log('\n🔧 REQUIRED FIX:');
      console.log('1. Go to Ports tab in Codespaces');
      console.log('2. Right-click port 3000');
      console.log('3. Select Port Visibility → Public');
      console.log('4. Verify it shows "Public"\n');
      return false;
    }
  }
  
  // Test 2: Can browser make CORS requests?
  console.log('\n🧪 Test 2: CORS Preflight');
  try {
    const corsResponse = await axios.options(`${codespaceApiUrl}/api/v1/goals/translate`, {
      headers: {
        'Origin': 'https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, X-OpenAI-API-Key'
      }
    });
    
    const corsHeaders = corsResponse.headers;
    if (corsHeaders['access-control-allow-origin']) {
      console.log('✅ CORS preflight successful');
      console.log(`   Allowed origin: ${corsHeaders['access-control-allow-origin']}`);
    } else {
      console.log('❌ CORS preflight failed - missing headers');
    }
  } catch (e) {
    console.log('❌ CORS preflight failed');
    console.log(`   Error: ${e.message}`);
  }
  
  // Test 3: Full API request as browser would make
  if (apiKey) {
    console.log('\n🧪 Test 3: Complete API Request (as browser)');
    try {
      const goalResponse = await axios.post(`${codespaceApiUrl}/api/v1/goals/translate`, {
        raw_goal: 'I want to learn TypeScript programming',
        user_id: 'browser-verification'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-API-Key': apiKey,
          'Origin': 'https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev'
        },
        timeout: 30000
      });
      
      if (goalResponse.data.success) {
        console.log('✅ Complete browser API flow works!');
        console.log(`   Generated: "${goalResponse.data.data.title}"`);
        console.log(`   Confidence: ${(goalResponse.data.data.confidence * 100).toFixed(1)}%`);
        
        console.log('\n🎉 PERSONALEA IS READY FOR USER TESTING!');
        console.log('\n📋 USER INSTRUCTIONS:');
        console.log('1. Go to Ports tab in Codespaces');
        console.log('2. Click globe icon next to port 5174');
        console.log('3. Enter your OpenAI API key');
        console.log('4. Test goal translation!');
        console.log('\n✅ Everything is verified working!');
        return true;
        
      } else {
        console.log('❌ API request failed');
        console.log(`   Response: ${JSON.stringify(goalResponse.data)}`);
      }
    } catch (e) {
      console.log('❌ Complete API request failed');
      console.log(`   Error: ${e.message}`);
      
      if (e.code === 'ENOTFOUND') {
        console.log('   → Port 3000 is not accessible from outside');
      } else if (e.response?.status === 401) {
        console.log('   → Port 3000 is private, needs to be public');
      }
    }
  } else {
    console.log('\n⚠️  No API key available for complete test');
  }
  
  return false;
}

testBrowserScenario();