const puppeteer = require('puppeteer');

async function runEndToEndValidation() {
  console.log('🎯 Starting PersonalEA End-to-End Validation');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging to see errors
  page.on('console', msg => {
    console.log(`Browser console: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.error(`Page error: ${error.message}`);
  });
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    overallStatus: 'UNKNOWN'
  };
  
  try {
    // Test 1: Frontend loads correctly
    console.log('✅ Test 1: Frontend Load Test');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    
    const title = await page.title();
    console.log(`Frontend title: ${title}`);
    
    if (title.includes('Goal')) {
      results.tests.push({
        name: 'Frontend Load',
        status: 'PASS',
        details: `Title: ${title}`
      });
    } else {
      results.tests.push({
        name: 'Frontend Load',
        status: 'FAIL',
        details: `Unexpected title: ${title}`
      });
    }
    
    // Test 2: Check for critical UI elements
    console.log('✅ Test 2: UI Elements Test');
    await page.waitForSelector('#root', { timeout: 5000 });
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Page content preview:', bodyText.substring(0, 200) + '...');
    
    // Check for key UI elements
    const hasGoalInput = bodyText.includes('Goal') || bodyText.includes('input') || bodyText.includes('Enter');
    const hasTransformButton = bodyText.includes('Transform') || bodyText.includes('SMART') || bodyText.includes('button');
    
    if (hasGoalInput && hasTransformButton) {
      results.tests.push({
        name: 'UI Elements',
        status: 'PASS',
        details: 'Goal input and transform functionality detected'
      });
    } else {
      results.tests.push({
        name: 'UI Elements',
        status: 'FAIL',
        details: `Missing elements - Goal Input: ${hasGoalInput}, Transform Button: ${hasTransformButton}`
      });
    }
    
    // Test 3: API connectivity test
    console.log('✅ Test 3: API Connectivity Test');
    
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3000/health');
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    if (apiResponse.success) {
      results.tests.push({
        name: 'API Connectivity',
        status: 'PASS',
        details: `API Status: ${apiResponse.data.status}`
      });
    } else {
      results.tests.push({
        name: 'API Connectivity',
        status: 'FAIL',
        details: `API Error: ${apiResponse.error}`
      });
    }
    
    // Test 4: Goal translation test
    console.log('✅ Test 4: Goal Translation Test');
    
    const goalTranslationResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3000/api/v1/goals/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            raw_goal: 'I want to get fit and healthy this year'
          })
        });
        const data = await response.json();
        return { success: response.ok, data, status: response.status };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    if (goalTranslationResponse.success && goalTranslationResponse.data.success) {
      results.tests.push({
        name: 'Goal Translation',
        status: 'PASS',
        details: `SMART Goal Generated: ${goalTranslationResponse.data.data.title}`
      });
    } else {
      results.tests.push({
        name: 'Goal Translation',
        status: 'FAIL',
        details: `Translation failed: ${JSON.stringify(goalTranslationResponse)}`
      });
    }
    
    // Test 5: Multiple goal types test
    console.log('✅ Test 5: Multiple Goal Types Test');
    
    const testGoals = [
      'I want to learn a new language',
      'I want to start a business',
      'I want to run a marathon'
    ];
    
    let successCount = 0;
    for (const goal of testGoals) {
      const response = await page.evaluate(async (testGoal) => {
        try {
          const response = await fetch('http://localhost:3000/api/v1/goals/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              raw_goal: testGoal
            })
          });
          const data = await response.json();
          return { success: response.ok && data.success };
        } catch (error) {
          return { success: false };
        }
      }, goal);
      
      if (response.success) {
        successCount++;
      }
    }
    
    if (successCount === testGoals.length) {
      results.tests.push({
        name: 'Multiple Goal Types',
        status: 'PASS',
        details: `All ${testGoals.length} goal types processed successfully`
      });
    } else {
      results.tests.push({
        name: 'Multiple Goal Types',
        status: 'FAIL',
        details: `Only ${successCount}/${testGoals.length} goals processed successfully`
      });
    }
    
    // Determine overall status
    const failedTests = results.tests.filter(test => test.status === 'FAIL');
    const passedTests = results.tests.filter(test => test.status === 'PASS');
    
    if (failedTests.length === 0) {
      results.overallStatus = 'WORKING';
    } else if (passedTests.length > failedTests.length) {
      results.overallStatus = 'MOSTLY_WORKING';
    } else {
      results.overallStatus = 'NOT_WORKING';
    }
    
    console.log(`\n🎯 VALIDATION RESULTS:`);
    console.log(`Overall Status: ${results.overallStatus}`);
    console.log(`Tests Passed: ${passedTests.length}`);
    console.log(`Tests Failed: ${failedTests.length}\n`);
    
    results.tests.forEach(test => {
      const emoji = test.status === 'PASS' ? '✅' : '❌';
      console.log(`${emoji} ${test.name}: ${test.status}`);
      console.log(`   Details: ${test.details}`);
    });
    
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    results.overallStatus = 'ERROR';
    results.error = error.message;
  } finally {
    await browser.close();
  }
  
  return results;
}

// Run the validation
runEndToEndValidation()
  .then(results => {
    console.log('\n📊 Final Results:', JSON.stringify(results, null, 2));
    
    // Write results to file for memory storage
    const fs = require('fs');
    fs.writeFileSync('/workspaces/personalEA/validation-results.json', JSON.stringify(results, null, 2));
    
    console.log('\n🎯 VALIDATION COMPLETE');
    console.log(`Status: ${results.overallStatus}`);
    
    // Exit with appropriate code
    process.exit(results.overallStatus === 'WORKING' ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });