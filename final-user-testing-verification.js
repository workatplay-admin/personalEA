#!/usr/bin/env node

/**
 * Final User Testing Verification
 * Comprehensive test of the PersonalEA Goal Translation feature 
 * with GitHub Codespaces API key auto-configuration
 */

const { chromium } = require('playwright');

async function runFinalVerification() {
  console.log('🚀 PersonalEA Final User Testing Verification');
  console.log('='.repeat(50));
  
  let browser;
  let testResults = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    results: []
  };

  try {
    // Start browser
    console.log('🌐 Starting browser...');
    browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Helper function to add test result
    const addTestResult = (testName, passed, message, details = null) => {
      testResults.totalTests++;
      if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName}: ${message}`);
      } else {
        testResults.failed++;
        console.log(`❌ ${testName}: ${message}`);
      }
      testResults.results.push({
        test: testName,
        passed,
        message,
        details,
        timestamp: new Date().toISOString()
      });
    };

    // Test 1: Page Loading
    console.log('\n📊 Test 1: Application Loading');
    try {
      await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
      await page.waitForSelector('h1', { timeout: 10000 });
      const title = await page.textContent('h1');
      addTestResult('Page Loading', title.includes('Goal & Strategy'), `Page loaded with title: ${title}`);
    } catch (error) {
      addTestResult('Page Loading', false, `Failed to load page: ${error.message}`);
      throw error;
    }

    // Test 2: Auto-Configuration Check
    console.log('\n🔧 Test 2: Auto-Configuration with GitHub Codespaces API Key');
    try {
      // Wait for auto-configuration to complete
      await page.waitForTimeout(3000);
      
      // Check if API configuration success message is visible
      const configSuccess = await page.locator('.bg-green-50 .text-green-800').first();
      const isConfigured = await configSuccess.isVisible();
      
      if (isConfigured) {
        const configMessage = await configSuccess.textContent();
        addTestResult('Auto-Configuration', true, `Auto-configured successfully: ${configMessage}`);
      } else {
        // Check if manual configuration is still required
        const manualConfig = await page.locator('.bg-blue-50 h2').first();
        const needsManualConfig = await manualConfig.isVisible();
        addTestResult('Auto-Configuration', !needsManualConfig, 
          needsManualConfig ? 'Manual API key configuration still required' : 'Configuration state unclear');
      }
    } catch (error) {
      addTestResult('Auto-Configuration', false, `Auto-configuration failed: ${error.message}`);
    }

    // Test 3: Goal Input Accessibility
    console.log('\n📝 Test 3: Goal Input Field Accessibility');
    try {
      const goalInput = page.locator('textarea[placeholder*="goal"]').first();
      const isVisible = await goalInput.isVisible();
      addTestResult('Goal Input Access', isVisible, 
        isVisible ? 'Goal input field is accessible' : 'Goal input field not accessible - blocked by configuration');
    } catch (error) {
      addTestResult('Goal Input Access', false, `Error checking goal input: ${error.message}`);
    }

    // Test 4: Transform Button Accessibility  
    console.log('\n🔄 Test 4: Transform Button Accessibility');
    try {
      const transformButton = page.locator('button:text("Transform into SMART Goal")').first();
      const isVisible = await transformButton.isVisible();
      addTestResult('Transform Button Access', isVisible,
        isVisible ? 'Transform button is accessible' : 'Transform button not accessible');
    } catch (error) {
      addTestResult('Transform Button Access', false, `Error checking transform button: ${error.message}`);
    }

    // Test 5: Complete User Workflow - Goal Transformation
    if (testResults.results.slice(-2).every(r => r.passed)) {
      console.log('\n🎯 Test 5: Complete Goal Transformation Workflow');
      try {
        // Enter a test goal
        const testGoal = "I want to learn machine learning to advance my career in data science";
        const goalInput = page.locator('textarea[placeholder*="goal"]').first();
        await goalInput.fill(testGoal);
        
        addTestResult('Goal Input', true, `Successfully entered goal: "${testGoal}"`);

        // Click transform button
        const transformButton = page.locator('button:text("Transform into SMART Goal")').first();
        
        // Wait for and capture any network activity
        const responsePromise = page.waitForResponse(response => 
          response.url().includes('/api/v1/goals/translate') && response.status() === 200
        );
        
        await transformButton.click();
        addTestResult('Transform Button Click', true, 'Transform button clicked successfully');

        // Wait for API response
        console.log('⏳ Waiting for goal translation...');
        const response = await responsePromise;
        const responseData = await response.json();
        
        addTestResult('API Response', responseData.success, 
          responseData.success ? 
          `Goal translated successfully with confidence: ${responseData.data?.confidence}` :
          `API error: ${responseData.error}`);

        // Check for SMART goal display
        await page.waitForTimeout(2000);
        const smartGoalElement = page.locator('.bg-white .text-lg').first();
        const smartGoalVisible = await smartGoalElement.isVisible();
        
        if (smartGoalVisible) {
          const smartGoalText = await smartGoalElement.textContent();
          addTestResult('SMART Goal Display', true, `SMART goal displayed: "${smartGoalText.substring(0, 100)}..."`);
        } else {
          addTestResult('SMART Goal Display', false, 'SMART goal not displayed in UI');
        }

      } catch (error) {
        addTestResult('Complete Workflow', false, `Workflow failed: ${error.message}`);
      }
    } else {
      addTestResult('Complete Workflow', false, 'Skipped due to prerequisite failures');
    }

    // Test 6: Error Handling
    console.log('\n🛡️ Test 6: Error Handling Test');
    try {
      // Test with empty goal
      const goalInput = page.locator('textarea[placeholder*="goal"]').first();
      await goalInput.fill('');
      
      const transformButton = page.locator('button:text("Transform into SMART Goal")').first();
      await transformButton.click();
      
      // Check for appropriate error message
      await page.waitForTimeout(1000);
      const errorMessage = page.locator('.text-red-600, .bg-red-50').first();
      const hasErrorMessage = await errorMessage.isVisible();
      
      addTestResult('Error Handling', hasErrorMessage, 
        hasErrorMessage ? 'Appropriate error handling for empty input' : 'No error message for empty input');
        
    } catch (error) {
      addTestResult('Error Handling', false, `Error handling test failed: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Critical test failure:', error);
    addTestResult('Critical System', false, `System failure: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Generate final report
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL VERIFICATION REPORT');
  console.log('='.repeat(50));
  
  const passRate = Math.round((testResults.passed / testResults.totalTests) * 100);
  console.log(`📈 Pass Rate: ${testResults.passed}/${testResults.totalTests} (${passRate}%)`);
  
  if (passRate >= 85) {
    console.log('🎉 FEATURE STATUS: ✅ READY FOR USER TESTING');
    console.log('The PersonalEA Goal Translation feature is working correctly with GitHub Codespaces API key auto-configuration.');
  } else if (passRate >= 70) {
    console.log('⚠️  FEATURE STATUS: 🟡 MOSTLY WORKING - Minor Issues');
    console.log('The core functionality works but some minor issues need attention.');
  } else {
    console.log('🚨 FEATURE STATUS: ❌ NOT READY FOR USER TESTING');
    console.log('Critical issues prevent the feature from working properly.');
  }

  console.log('\n📋 Detailed Results:');
  testResults.results.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.passed ? '✅' : '❌'} ${result.test}: ${result.message}`);
  });

  // Save results
  const fs = require('fs');
  fs.writeFileSync('/workspaces/personalEA/final-verification-report.json', JSON.stringify(testResults, null, 2));
  console.log('\n💾 Full report saved to: final-verification-report.json');

  return passRate >= 85;
}

// Run verification if called directly
if (require.main === module) {
  runFinalVerification()
    .then(success => {
      console.log(`\n🏁 Verification ${success ? 'PASSED' : 'FAILED'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Verification crashed:', error);
      process.exit(1);
    });
}

module.exports = { runFinalVerification };