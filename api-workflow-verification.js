#!/usr/bin/env node

/**
 * API Workflow Verification
 * Tests the complete PersonalEA Goal Translation API workflow
 * with GitHub Codespaces API key auto-configuration
 */

const axios = require('axios');

async function runAPIVerification() {
  console.log('🚀 PersonalEA API Workflow Verification');
  console.log('='.repeat(50));
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    passed: 0,
    failed: 0,
    status: 'UNKNOWN'
  };

  const addTest = (name, passed, message, details = null) => {
    results.tests.push({ name, passed, message, details });
    if (passed) {
      results.passed++;
      console.log(`✅ ${name}: ${message}`);
    } else {
      results.failed++;
      console.log(`❌ ${name}: ${message}`);
    }
  };

  try {
    // Test 1: Backend Health Check
    console.log('\n🏥 Test 1: Backend Health Check');
    try {
      const response = await axios.get('http://localhost:8085/health', { timeout: 5000 });
      addTest('Backend Health', response.status === 200, 
        `Backend healthy: ${response.data.service}`);
    } catch (error) {
      addTest('Backend Health', false, `Backend not responding: ${error.message}`);
      throw new Error('Backend not available - stopping tests');
    }

    // Test 2: Environment Configuration Check
    console.log('\n🔧 Test 2: Environment Configuration');
    try {
      const response = await axios.get('http://localhost:8085/api/v1/config/environment', { timeout: 5000 });
      const data = response.data.data;
      addTest('Environment Config', data.environmentConfigured && data.openaiKeyAvailable,
        `Auto-config: ${data.environmentConfigured}, API Key: ${data.openaiKeyAvailable}`);
    } catch (error) {
      addTest('Environment Config', false, `Environment check failed: ${error.message}`);
    }

    // Test 3: Goal Translation with Environment API Key
    console.log('\n🎯 Test 3: Goal Translation (Environment API Key)');
    try {
      const testGoal = "I want to learn Python programming to advance my career";
      const response = await axios.post('http://localhost:8085/api/v1/goals/translate', {
        raw_goal: testGoal
      }, { 
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });

      const data = response.data;
      if (data.success && data.data) {
        addTest('Goal Translation', true, 
          `Goal translated with ${Math.round(data.data.confidence * 100)}% confidence: "${data.data.title}"`);
      } else {
        addTest('Goal Translation', false, `Translation failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.response) {
        addTest('Goal Translation', false, 
          `API error (${error.response.status}): ${error.response.data?.error || error.message}`);
      } else {
        addTest('Goal Translation', false, `Network error: ${error.message}`);
      }
    }

    // Test 4: Multiple Goal Types
    console.log('\n📚 Test 4: Multiple Goal Types');
    const testGoals = [
      "I want to lose 20 pounds",
      "Start a profitable online business",
      "Learn to play guitar"
    ];

    for (const goal of testGoals) {
      try {
        const response = await axios.post('http://localhost:8085/api/v1/goals/translate', {
          raw_goal: goal
        }, { timeout: 10000 });

        if (response.data.success) {
          addTest(`Goal Type: ${goal.substring(0, 20)}...`, true, 
            `Confidence: ${Math.round(response.data.data.confidence * 100)}%`);
        } else {
          addTest(`Goal Type: ${goal.substring(0, 20)}...`, false, 
            `Failed: ${response.data.error}`);
        }
      } catch (error) {
        addTest(`Goal Type: ${goal.substring(0, 20)}...`, false, 
          `Error: ${error.message}`);
      }
    }

    // Test 5: Error Handling
    console.log('\n🛡️ Test 5: Error Handling');
    try {
      const response = await axios.post('http://localhost:8085/api/v1/goals/translate', {
        raw_goal: ""  // Empty goal
      }, { timeout: 5000 });

      // Should return an error for empty goal
      if (!response.data.success) {
        addTest('Empty Goal Handling', true, `Properly rejected empty goal: ${response.data.error}`);
      } else {
        addTest('Empty Goal Handling', false, 'Empty goal was incorrectly accepted');
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        addTest('Empty Goal Handling', true, 'Properly rejected empty goal with 400 status');
      } else {
        addTest('Empty Goal Handling', false, `Unexpected error: ${error.message}`);
      }
    }

    // Test 6: Performance Check
    console.log('\n⚡ Test 6: Performance Check');
    try {
      const startTime = Date.now();
      const response = await axios.post('http://localhost:8085/api/v1/goals/translate', {
        raw_goal: "I want to improve my fitness level"
      }, { timeout: 10000 });
      const responseTime = Date.now() - startTime;

      addTest('Response Time', responseTime < 5000, 
        `Response time: ${responseTime}ms (target: <5000ms)`);
    } catch (error) {
      addTest('Response Time', false, `Performance test failed: ${error.message}`);
    }

  } catch (error) {
    console.error('\n💥 Critical error:', error.message);
    addTest('System Availability', false, `Critical failure: ${error.message}`);
  }

  // Calculate results
  const total = results.passed + results.failed;
  const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;

  console.log('\n' + '='.repeat(50));
  console.log('📊 API WORKFLOW VERIFICATION RESULTS');
  console.log('='.repeat(50));
  console.log(`📈 Pass Rate: ${results.passed}/${total} (${passRate}%)`);

  // Determine status
  if (passRate >= 90) {
    results.status = 'READY_FOR_USER_TESTING';
    console.log('🎉 STATUS: ✅ READY FOR USER TESTING');
    console.log('The PersonalEA Goal Translation feature is fully functional with GitHub Codespaces API key auto-configuration.');
  } else if (passRate >= 75) {
    results.status = 'MOSTLY_WORKING';
    console.log('⚠️  STATUS: 🟡 MOSTLY WORKING');
    console.log('Core functionality works but some issues need attention.');
  } else {
    results.status = 'NOT_READY';
    console.log('🚨 STATUS: ❌ NOT READY FOR USER TESTING');
    console.log('Critical issues prevent the feature from working properly.');
  }

  console.log('\n📋 Test Details:');
  results.tests.forEach((test, index) => {
    console.log(`  ${index + 1}. ${test.passed ? '✅' : '❌'} ${test.name}: ${test.message}`);
  });

  // Save detailed results
  const fs = require('fs');
  fs.writeFileSync('/workspaces/personalEA/api-verification-report.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Detailed report saved to: api-verification-report.json');

  return results.status === 'READY_FOR_USER_TESTING';
}

// Run if called directly
if (require.main === module) {
  runAPIVerification()
    .then(success => {
      console.log(`\n🏁 API Verification ${success ? 'PASSED' : 'FAILED'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Verification crashed:', error);
      process.exit(1);
    });
}

module.exports = { runAPIVerification };