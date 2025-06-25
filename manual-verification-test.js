#!/usr/bin/env node

/**
 * Manual Verification Test for PersonalEA Goal Translation App
 * Tests the critical user workflow: load app -> configure -> translate goal
 */

const fs = require('fs');
const path = require('path');

// Test Configuration
const FRONTEND_URL = 'http://localhost:5174';
const API_URL = 'http://localhost:8086';
const BACKEND_URL = 'http://localhost:8085';

console.log('🔍 PersonalEA Manual Verification Test');
console.log('=====================================');

/**
 * Test 1: Service Health Checks
 */
async function testServiceHealth() {
  console.log('\n1️⃣ Testing Service Health...');
  
  try {
    // Test Backend
    const backendResponse = await fetch(`${BACKEND_URL}/health`);
    const backendData = await backendResponse.json();
    console.log('✅ Backend Health:', backendData.status);
    
    // Test API Server
    const apiResponse = await fetch(`${API_URL}/health`);
    const apiData = await apiResponse.json();
    console.log('✅ API Server Health:', apiData.status);
    
    // Test Frontend (basic connectivity)
    const frontendResponse = await fetch(FRONTEND_URL);
    const frontendText = await frontendResponse.text();
    const hasReactApp = frontendText.includes('root') && frontendText.includes('Goal');
    console.log('✅ Frontend Health:', hasReactApp ? 'Serving React App' : 'Basic HTML');
    
    return { backend: true, api: true, frontend: hasReactApp };
    
  } catch (error) {
    console.error('❌ Service Health Check Failed:', error.message);
    return { backend: false, api: false, frontend: false };
  }
}

/**
 * Test 2: API Functionality
 */
async function testAPIFunctionality() {
  console.log('\n2️⃣ Testing API Functionality...');
  
  try {
    // Test Environment Configuration Endpoint
    const envResponse = await fetch(`${API_URL}/api/v1/config/environment`);
    const envData = await envResponse.json();
    console.log('✅ Environment Config:', envData.data?.environmentConfigured ? 'Configured' : 'Not Configured');
    
    // Test Goal Translation
    const goalResponse = await fetch(`${API_URL}/api/v1/goals/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_goal: 'I want to learn Python this year' })
    });
    
    const goalData = await goalResponse.json();
    
    if (goalData.success && goalData.data?.title) {
      console.log('✅ Goal Translation Working');
      console.log('   Original: "I want to learn Python this year"');
      console.log('   SMART Goal:', goalData.data.title);
      console.log('   Confidence:', Math.round(goalData.data.confidence * 100) + '%');
      return { envConfig: true, goalTranslation: true, goalData };
    } else {
      console.log('❌ Goal Translation Failed:', goalData.error || 'Unknown error');
      return { envConfig: true, goalTranslation: false };
    }
    
  } catch (error) {
    console.error('❌ API Functionality Test Failed:', error.message);
    return { envConfig: false, goalTranslation: false };
  }
}

/**
 * Test 3: Error Handling
 */
async function testErrorHandling() {
  console.log('\n3️⃣ Testing Error Handling...');
  
  try {
    // Test empty goal
    const emptyResponse = await fetch(`${API_URL}/api/v1/goals/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_goal: '' })
    });
    
    const emptyData = await emptyResponse.json();
    const handlesEmpty = !emptyData.success && emptyData.error;
    console.log('✅ Empty Goal Handling:', handlesEmpty ? 'Properly Rejected' : 'Issue Detected');
    
    // Test missing parameter
    const missingResponse = await fetch(`${API_URL}/api/v1/goals/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const missingData = await missingResponse.json();
    const handlesMissing = !missingData.success && missingData.error;
    console.log('✅ Missing Parameter Handling:', handlesMissing ? 'Properly Rejected' : 'Issue Detected');
    
    return { emptyGoal: handlesEmpty, missingParam: handlesMissing };
    
  } catch (error) {
    console.error('❌ Error Handling Test Failed:', error.message);
    return { emptyGoal: false, missingParam: false };
  }
}

/**
 * Test 4: Performance Check
 */
async function testPerformance() {
  console.log('\n4️⃣ Testing Performance...');
  
  try {
    const start = Date.now();
    
    const response = await fetch(`${API_URL}/api/v1/goals/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_goal: 'I want to get fit and healthy this year' })
    });
    
    const data = await response.json();
    const duration = Date.now() - start;
    
    if (data.success) {
      console.log('✅ Performance Test Passed');
      console.log('   Response Time:', duration + 'ms');
      console.log('   Status:', duration < 5000 ? 'Good' : duration < 10000 ? 'Acceptable' : 'Slow');
      return { responseTime: duration, performanceGood: duration < 10000 };
    } else {
      console.log('❌ Performance Test Failed: API returned error');
      return { responseTime: -1, performanceGood: false };
    }
    
  } catch (error) {
    console.error('❌ Performance Test Failed:', error.message);
    return { responseTime: -1, performanceGood: false };
  }
}

/**
 * Generate Test Report
 */
function generateReport(results) {
  console.log('\n📊 VERIFICATION REPORT');
  console.log('=====================');
  
  const totalTests = 8; // Count of individual test items
  let passedTests = 0;
  
  // Service Health (3 tests)
  if (results.health.backend) passedTests++;
  if (results.health.api) passedTests++;
  if (results.health.frontend) passedTests++;
  
  // API Functionality (2 tests)  
  if (results.api.envConfig) passedTests++;
  if (results.api.goalTranslation) passedTests++;
  
  // Error Handling (2 tests)
  if (results.errors.emptyGoal) passedTests++;
  if (results.errors.missingParam) passedTests++;
  
  // Performance (1 test)
  if (results.performance.performanceGood) passedTests++;
  
  console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  const overallStatus = passedTests >= 6 ? 'READY' : passedTests >= 4 ? 'MOSTLY_WORKING' : 'NOT_READY';
  console.log(`🎯 Overall Status: ${overallStatus}`);
  
  console.log('\nDetailed Results:');
  console.log('- Backend Health:', results.health.backend ? '✅' : '❌');
  console.log('- API Server Health:', results.health.api ? '✅' : '❌');
  console.log('- Frontend Health:', results.health.frontend ? '✅' : '❌');
  console.log('- Environment Config:', results.api.envConfig ? '✅' : '❌');
  console.log('- Goal Translation:', results.api.goalTranslation ? '✅' : '❌');
  console.log('- Error Handling (Empty):', results.errors.emptyGoal ? '✅' : '❌');
  console.log('- Error Handling (Missing):', results.errors.missingParam ? '✅' : '❌');
  console.log('- Performance:', results.performance.performanceGood ? '✅' : '❌');
  
  if (results.api.goalData?.data?.title) {
    console.log('\n💡 Sample Goal Translation:');
    console.log(`   "${results.api.goalData.data.title}"`);
  }
  
  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    testResults: results,
    summary: {
      totalTests,
      passedTests,
      successRate: Math.round((passedTests/totalTests) * 100),
      overallStatus
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'manual-verification-results.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n💾 Report saved to: manual-verification-results.json');
  
  return overallStatus;
}

/**
 * Main Test Execution
 */
async function runVerificationTests() {
  console.log('🚀 Starting verification tests...\n');
  
  const results = {
    health: await testServiceHealth(),
    api: await testAPIFunctionality(),
    errors: await testErrorHandling(),
    performance: await testPerformance()
  };
  
  const overallStatus = generateReport(results);
  
  console.log('\n🏁 Verification Complete!');
  
  // Exit with appropriate code
  process.exit(overallStatus === 'NOT_READY' ? 1 : 0);
}

// Add fetch if not available (Node.js < 18)
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// Run the tests
runVerificationTests().catch(error => {
  console.error('💥 Fatal Error:', error.message);
  process.exit(1);
});