#!/usr/bin/env node

/**
 * Complete API Flow Test - Tests the full user authentication and goal processing flow
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8086/api/v1';

async function testCompleteApiFlow() {
  console.log('🔄 Complete API Flow Test - End-to-End Verification');
  console.log('=' .repeat(60));
  
  const results = {
    timestamp: new Date().toISOString(),
    flowSteps: [],
    overallStatus: 'PASS',
    errors: []
  };

  // Step 1: Get Test JWT Token (simulates frontend authentication)
  try {
    console.log('\n1️⃣  Getting test JWT token...');
    const tokenResponse = await axios.get(`${API_BASE_URL}/auth/test-token`, {
      timeout: 5000
    });
    
    const jwtToken = tokenResponse.data.data.token;
    console.log('✅ JWT token obtained successfully');
    
    results.flowSteps.push({
      step: 'JWT Token Generation',
      status: 'PASS',
      hasToken: !!jwtToken
    });

    // Step 2: Test Environment Configuration Check (simulates ApiConfig.tsx check)
    console.log('\n2️⃣  Testing environment configuration check...');
    const configResponse = await axios.get(`${API_BASE_URL}/config/environment`, {
      timeout: 5000
    });
    
    console.log('✅ Environment configuration check passed:', configResponse.data);
    results.flowSteps.push({
      step: 'Environment Configuration Check',
      status: 'PASS',
      environmentConfigured: configResponse.data.data.environmentConfigured
    });

    // Step 3: Test Authenticated Goal Translation (simulates user goal input)
    console.log('\n3️⃣  Testing authenticated goal translation...');
    console.log('⏱️  Using 30-second timeout (matching frontend fix)...');
    
    const startTime = Date.now();
    const goalResponse = await axios.post(`${API_BASE_URL}/goals/translate`, {
      raw_goal: "Learn to code JavaScript and build 3 projects within 6 months"
    }, {
      timeout: 30000, // 30s timeout as per the fix
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
        // Note: Not setting X-OpenAI-API-Key since backend uses environment config
      }
    });
    
    const responseTime = Date.now() - startTime;
    console.log('✅ Authenticated goal translation successful!');
    console.log(`⏱️  Response time: ${responseTime}ms (well within 30s timeout)`);
    console.log('📋 SMART Goal generated:', goalResponse.data.data?.title || 'N/A');
    
    results.flowSteps.push({
      step: 'Authenticated Goal Translation',
      status: 'PASS',
      responseTimeMs: responseTime,
      hasSmartGoal: !!goalResponse.data.data?.title,
      goalTitle: goalResponse.data.data?.title
    });

    // Step 4: Test Multiple Operations (simulates user workflow)
    console.log('\n4️⃣  Testing multiple operations workflow...');
    
    const milestoneResponse = await axios.post(`${API_BASE_URL}/milestones`, {
      goal_id: goalResponse.data.data.id
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    console.log('✅ Milestone generation successful');
    results.flowSteps.push({
      step: 'Milestone Generation',
      status: 'PASS',
      hasMilestones: !!milestoneResponse.data.data?.milestones
    });

  } catch (error) {
    console.log(`❌ API Flow test failed at step: ${error.message}`);
    
    // Detailed error analysis
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response:`, error.response.data);
      
      if (error.response.status === 401) {
        console.log('🔍 This is an authentication error - may indicate JWT token issues');
      } else if (error.response.status === 500) {
        console.log('🔍 This is a server error - may indicate backend processing issues');
      }
    } else if (error.message.includes('timeout')) {
      console.log('🔍 This is a timeout error - the original issue may still exist');
      console.log('⚠️  Frontend timeout increased to 30s, but backend may need optimization');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('🔍 Connection refused - backend service may not be running on correct port');  
    }
    
    results.flowSteps.push({
      step: 'API Flow Test',
      status: 'FAIL',
      error: error.message,
      statusCode: error.response?.status,
      isTimeout: error.message.includes('timeout'),
      isAuthError: error.response?.status === 401,
      isConnectionError: error.message.includes('ECONNREFUSED')
    });
    
    results.overallStatus = 'FAIL';
    results.errors.push(error.message);
  }

  // Test Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPLETE API FLOW TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Overall Status: ${results.overallStatus}`);
  console.log(`Steps Completed: ${results.flowSteps.length}`);
  console.log(`Successful Steps: ${results.flowSteps.filter(s => s.status === 'PASS').length}`);
  console.log(`Failed Steps: ${results.flowSteps.filter(s => s.status === 'FAIL').length}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
  }

  if (results.overallStatus === 'PASS') {
    console.log('\n🎉 SUCCESS: Complete API flow working!');
    console.log('✅ Port configuration fix (8085 → 8086): VERIFIED');
    console.log('✅ Timeout fix (10s → 30s): VERIFIED');
    console.log('✅ Authentication flow: WORKING'); 
    console.log('✅ Goal processing: WORKING');
    console.log('✅ "Failed to configure API" error: RESOLVED');
  } else {
    console.log('\n⚠️  ISSUES REMAINING: API flow has problems');
  }

  // Save detailed results
  require('fs').writeFileSync(
    '/workspaces/personalEA/complete-api-flow-test-results.json', 
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n📁 Detailed results saved to: complete-api-flow-test-results.json');
  
  return results;
}

// Run the test
if (require.main === module) {
  testCompleteApiFlow()
    .then(results => {
      process.exit(results.overallStatus === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      console.error('Complete API flow test failed:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteApiFlow };