#!/usr/bin/env node

/**
 * API Configuration Fix Verification Test
 * Validates that the "Failed to configure API. Please try again." error is resolved
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8086/api/v1';
const FRONTEND_URL = 'http://localhost:5174';

async function testApiConfiguration() {
  console.log('🧪 API Configuration Fix Verification Test');
  console.log('=' .repeat(50));
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    overallStatus: 'PASS',
    errors: []
  };

  // Test 1: Backend Health Check
  try {
    console.log('\n1️⃣  Testing Backend Health...');
    const healthResponse = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`, {
      timeout: 5000
    });
    console.log('✅ Backend health check passed:', healthResponse.data);
    results.tests.push({
      name: 'Backend Health Check',
      status: 'PASS',
      response: healthResponse.data
    });
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    results.tests.push({
      name: 'Backend Health Check', 
      status: 'FAIL',
      error: error.message
    });
    results.overallStatus = 'FAIL';
    results.errors.push(`Backend health: ${error.message}`);
  }

  // Test 2: Environment Configuration Check
  try {
    console.log('\n2️⃣  Testing Environment Configuration...');
    const configResponse = await axios.get(`${API_BASE_URL}/config/environment`, {
      timeout: 5000
    });
    console.log('✅ Environment configuration check passed:', configResponse.data);
    results.tests.push({
      name: 'Environment Configuration Check',
      status: 'PASS',
      response: configResponse.data
    });
  } catch (error) {
    console.log('❌ Environment configuration check failed:', error.message);
    results.tests.push({
      name: 'Environment Configuration Check',
      status: 'FAIL', 
      error: error.message
    });
    results.overallStatus = 'FAIL';
    results.errors.push(`Environment config: ${error.message}`);
  }

  // Test 3: Goal Translation API Test (Core functionality)
  try {
    console.log('\n3️⃣  Testing Goal Translation API (30s timeout)...');
    const goalResponse = await axios.post(`${API_BASE_URL}/goals/translate-to-smart`, {
      goal: "Learn to code JavaScript within 3 months"
    }, {
      timeout: 30000, // 30s timeout as per the fix
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Goal translation API test passed');
    console.log('📊 Response time:', goalResponse.headers['x-response-time'] || 'N/A');
    console.log('📋 SMART Goal Generated:', goalResponse.data.smartGoal ? 'Yes' : 'No');
    
    results.tests.push({
      name: 'Goal Translation API Test',
      status: 'PASS',
      responseTime: goalResponse.headers['x-response-time'],
      hasSmartGoal: !!goalResponse.data.smartGoal
    });
  } catch (error) {
    console.log('❌ Goal translation API test failed:', error.message);
    
    // Check if it's a timeout error (the original issue)
    if (error.message.includes('timeout')) {
      console.log('⚠️  This was a TIMEOUT error - the original issue may still exist');
      results.errors.push(`TIMEOUT ERROR: ${error.message}`);
    }
    
    results.tests.push({
      name: 'Goal Translation API Test',
      status: 'FAIL',
      error: error.message,
      isTimeout: error.message.includes('timeout')
    });
    results.overallStatus = 'FAIL';
    results.errors.push(`Goal translation: ${error.message}`);
  }

  // Test 4: Port Configuration Verification
  try {
    console.log('\n4️⃣  Testing Port Configuration...');
    
    // Test that port 8085 (old incorrect port) is NOT responding
    let port8085Responding = false;
    try {
      await axios.get('http://localhost:8085/health', { timeout: 2000 });
      port8085Responding = true;
    } catch (e) {
      // Expected - port 8085 should not be responding
    }
    
    if (port8085Responding) {
      console.log('⚠️  Warning: Port 8085 is still responding - may indicate configuration issues');
      results.tests.push({
        name: 'Port Configuration Verification',
        status: 'WARNING',
        issue: 'Port 8085 still responding - potential duplicate services'
      });
    } else {
      console.log('✅ Port configuration correct - old port 8085 not responding, port 8086 working');
      results.tests.push({
        name: 'Port Configuration Verification', 
        status: 'PASS',
        details: 'Port 8085 (old) not responding, Port 8086 (correct) working'
      });
    }
  } catch (error) {
    console.log('❌ Port configuration verification failed:', error.message);
    results.tests.push({
      name: 'Port Configuration Verification',
      status: 'FAIL',
      error: error.message
    });
  }

  // Test Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Overall Status: ${results.overallStatus}`);
  console.log(`Tests Run: ${results.tests.length}`);
  console.log(`Passed: ${results.tests.filter(t => t.status === 'PASS').length}`);
  console.log(`Failed: ${results.tests.filter(t => t.status === 'FAIL').length}`);
  console.log(`Warnings: ${results.tests.filter(t => t.status === 'WARNING').length}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    results.errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
  }

  if (results.overallStatus === 'PASS') {
    console.log('\n🎉 SUCCESS: API Configuration fix verified!');
    console.log('✅ Users should no longer see "Failed to configure API. Please try again." error');
    console.log('✅ Goal processing should work within 30-second timeout');
  } else {
    console.log('\n⚠️  ISSUES FOUND: API Configuration may still have problems');
  }

  // Save results
  require('fs').writeFileSync(
    '/workspaces/personalEA/api-config-fix-verification-results.json', 
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n📁 Results saved to: api-config-fix-verification-results.json');
  
  return results;
}

// Run the test
if (require.main === module) {
  testApiConfiguration()
    .then(results => {
      process.exit(results.overallStatus === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { testApiConfiguration };