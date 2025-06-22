#!/usr/bin/env node

/**
 * Simple test script for PersonalEA that uses your configured API key
 * Run this in your terminal where you set OPENAI_API_KEY
 */

const axios = require('axios');

async function testGoalTranslation() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No OPENAI_API_KEY found. Please run:');
    console.log('export OPENAI_API_KEY="your-key-here"');
    return;
  }
  
  console.log('🧪 Testing PersonalEA Goal Translation...');
  console.log(`🔑 Using API key: ${apiKey.substring(0, 8)}...`);
  
  try {
    const response = await axios.post('http://localhost:3000/api/v1/goals/translate', {
      raw_goal: 'I want to learn Python programming this year',
      user_id: 'test-user'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-OpenAI-API-Key': apiKey
      },
      timeout: 30000
    });
    
    if (response.data.success) {
      console.log('✅ Goal translation successful!');
      console.log('📋 SMART Goal:', response.data.data.title);
      console.log('🎯 Confidence:', response.data.data.confidence);
      console.log('📊 Criteria available:', Object.keys(response.data.data.criteria || {}).length);
      
      console.log('\n🎉 PersonalEA API is working perfectly!');
      console.log('\n📋 To test the full interface:');
      console.log('1. Open the Ports tab in Codespaces');
      console.log('2. Find port 5174 and click the globe icon 🌐');
      console.log('3. Open that URL in your browser');
      console.log('4. Enter your OpenAI API key in the interface');
      console.log('5. Test goal translation!');
      
    } else {
      console.log('❌ API returned unsuccessful response:', response.data);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testGoalTranslation();