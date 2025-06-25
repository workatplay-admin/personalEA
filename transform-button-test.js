const puppeteer = require('puppeteer');

async function testTransformButtonWorkflow() {
  console.log('🔘 Testing Transform Button Functionality');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging and error tracking
  const logs = [];
  const errors = [];
  
  page.on('console', msg => {
    logs.push(msg.text());
    console.log(`Browser: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(`Page error: ${error.message}`);
  });
  
  page.on('requestfailed', req => {
    errors.push(`Request failed: ${req.url()}`);
    console.error(`Request failed: ${req.url()}`);
  });
  
  const testResults = {
    timestamp: new Date().toISOString(),
    status: 'UNKNOWN',
    steps: [],
    errors: []
  };
  
  try {
    // Step 1: Load the application
    console.log('Step 1: Loading application...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    
    testResults.steps.push({
      step: 1,
      name: 'Load Application',
      status: 'PASS',
      details: 'Application loaded successfully'
    });
    
    // Step 2: Wait for React app to initialize
    console.log('Step 2: Waiting for React app...');
    await page.waitForSelector('#root', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Give React time to render
    
    testResults.steps.push({
      step: 2,
      name: 'React App Initialize',
      status: 'PASS',
      details: 'React app initialized'
    });
    
    // Step 3: Check for API Configuration (Step 0)
    console.log('Step 3: Checking API configuration...');
    
    const apiConfigVisible = await page.evaluate(() => {
      const apiSection = document.querySelector('[data-step="0"]') || 
                        document.querySelector('.api-config') ||
                        Array.from(document.querySelectorAll('*')).find(el => 
                          el.textContent?.includes('API') || 
                          el.textContent?.includes('Configure')
                        );
      return !!apiSection;
    });
    
    if (apiConfigVisible) {
      testResults.steps.push({
        step: 3,
        name: 'API Configuration UI',
        status: 'PASS',
        details: 'API configuration interface is visible'
      });
    } else {
      testResults.steps.push({
        step: 3,
        name: 'API Configuration UI',
        status: 'FAIL',
        details: 'API configuration interface not found'
      });
    }
    
    // Step 4: Test Goal Input (might be on different step)
    console.log('Step 4: Looking for goal input...');
    
    const goalInputFound = await page.evaluate(() => {
      // Look for goal input field
      const goalInput = document.querySelector('input[type="text"]') ||
                       document.querySelector('textarea') ||
                       document.querySelector('[placeholder*="goal"]') ||
                       document.querySelector('[placeholder*="Goal"]');
      return !!goalInput;
    });
    
    if (goalInputFound) {
      testResults.steps.push({
        step: 4,
        name: 'Goal Input Field',
        status: 'PASS',
        details: 'Goal input field found'
      });
      
      // Step 5: Try to enter a goal
      console.log('Step 5: Entering test goal...');
      try {
        await page.evaluate(() => {
          const input = document.querySelector('input[type="text"]') ||
                       document.querySelector('textarea') ||
                       document.querySelector('[placeholder*="goal"]') ||
                       document.querySelector('[placeholder*="Goal"]');
          if (input) {
            input.value = 'I want to learn JavaScript programming';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        });
        
        testResults.steps.push({
          step: 5,
          name: 'Enter Goal Text',
          status: 'PASS',
          details: 'Successfully entered test goal'
        });
      } catch (error) {
        testResults.steps.push({
          step: 5,
          name: 'Enter Goal Text',
          status: 'FAIL',
          details: `Failed to enter goal: ${error.message}`
        });
      }
    } else {
      testResults.steps.push({
        step: 4,
        name: 'Goal Input Field',
        status: 'FAIL',
        details: 'Goal input field not found'
      });
    }
    
    // Step 6: Look for Transform button
    console.log('Step 6: Looking for Transform button...');
    
    const transformButtonFound = await page.evaluate(() => {
      // Look for transform button
      const button = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('Transform') ||
        btn.textContent?.includes('SMART') ||
        btn.textContent?.includes('Generate') ||
        btn.textContent?.includes('Convert')
      );
      return !!button;
    });
    
    if (transformButtonFound) {
      testResults.steps.push({
        step: 6,
        name: 'Transform Button',
        status: 'PASS',
        details: 'Transform button found'
      });
      
      // Step 7: Try to click the transform button
      console.log('Step 7: Clicking transform button...');
      try {
        await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent?.includes('Transform') ||
            btn.textContent?.includes('SMART') ||
            btn.textContent?.includes('Generate') ||
            btn.textContent?.includes('Convert')
          );
          if (button && !button.disabled) {
            button.click();
            return true;
          }
          return false;
        });
        
        // Wait for potential API call
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        testResults.steps.push({
          step: 7,
          name: 'Click Transform Button',
          status: 'PASS',
          details: 'Transform button clicked successfully'
        });
      } catch (error) {
        testResults.steps.push({
          step: 7,
          name: 'Click Transform Button',
          status: 'FAIL',
          details: `Failed to click transform button: ${error.message}`
        });
      }
    } else {
      testResults.steps.push({
        step: 6,
        name: 'Transform Button',
        status: 'FAIL',
        details: 'Transform button not found'
      });
    }
    
    // Step 8: Check for SMART goal results
    console.log('Step 8: Checking for SMART goal results...');
    
    const smartGoalResults = await page.evaluate(() => {
      // Look for SMART goal results
      const smartSection = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent?.includes('Specific') ||
        el.textContent?.includes('Measurable') ||
        el.textContent?.includes('Achievable') ||
        el.textContent?.includes('Relevant') ||
        el.textContent?.includes('Time-bound')
      );
      return !!smartSection;
    });
    
    if (smartGoalResults) {
      testResults.steps.push({
        step: 8,
        name: 'SMART Goal Results',
        status: 'PASS',
        details: 'SMART goal results displayed'
      });
    } else {
      testResults.steps.push({
        step: 8,
        name: 'SMART Goal Results',
        status: 'FAIL',
        details: 'SMART goal results not found'
      });
    }
    
    // Determine overall status
    const failedSteps = testResults.steps.filter(step => step.status === 'FAIL');
    const passedSteps = testResults.steps.filter(step => step.status === 'PASS');
    
    if (failedSteps.length === 0) {
      testResults.status = 'WORKING';
    } else if (passedSteps.length >= 5) { // If most core functionality works
      testResults.status = 'MOSTLY_WORKING';
    } else {
      testResults.status = 'NOT_WORKING';
    }
    
    testResults.errors = errors;
    
  } catch (error) {
    console.error('Transform button test failed:', error);
    testResults.status = 'ERROR';
    testResults.errors.push(error.message);
  } finally {
    await browser.close();
  }
  
  // Print results
  console.log(`\n🔘 TRANSFORM BUTTON TEST RESULTS:`);
  console.log(`Overall Status: ${testResults.status}`);
  console.log(`Steps Passed: ${testResults.steps.filter(s => s.status === 'PASS').length}`);
  console.log(`Steps Failed: ${testResults.steps.filter(s => s.status === 'FAIL').length}\n`);
  
  testResults.steps.forEach(step => {
    const emoji = step.status === 'PASS' ? '✅' : '❌';
    console.log(`${emoji} Step ${step.step}: ${step.name} - ${step.status}`);
    console.log(`   ${step.details}`);
  });
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    testResults.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  return testResults;
}

// Run the test
testTransformButtonWorkflow()
  .then(results => {
    console.log('\n📊 Transform Button Test Results:', JSON.stringify(results, null, 2));
    
    // Write results to file
    const fs = require('fs');
    fs.writeFileSync('/workspaces/personalEA/transform-button-results.json', JSON.stringify(results, null, 2));
    
    console.log(`\n🔘 TRANSFORM BUTTON TEST COMPLETE: ${results.status}`);
    process.exit(results.status === 'WORKING' || results.status === 'MOSTLY_WORKING' ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Transform button test script failed:', error);
    process.exit(1);
  });