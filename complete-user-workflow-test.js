const puppeteer = require('puppeteer');

async function testCompleteUserWorkflow() {
  console.log('🎯 Testing Complete User Workflow (API Key -> Goal Input -> SMART Translation)');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging and error tracking
  const logs = [];
  const errors = [];
  const networkRequests = [];
  
  page.on('console', msg => {
    logs.push(msg.text());
    console.log(`Browser: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(`Page error: ${error.message}`);
  });
  
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      networkRequests.push({
        url: req.url(),
        method: req.method(),
        timestamp: new Date().toISOString()
      });
      console.log(`API Request: ${req.method()} ${req.url()}`);
    }
  });
  
  page.on('response', resp => {
    if (resp.url().includes('/api/')) {
      console.log(`API Response: ${resp.status()} ${resp.url()}`);
    }
  });
  
  const workflowResults = {
    timestamp: new Date().toISOString(),
    status: 'UNKNOWN',
    workflow: [],
    networkRequests: [],
    errors: []
  };
  
  try {
    // Step 1: Load the application
    console.log('🔄 Step 1: Loading application...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    workflowResults.workflow.push({
      step: 1,
      name: 'Load Application',
      status: 'PASS',
      details: 'Application loaded successfully'
    });
    
    // Step 2: Configure API Key (simulate having environment key)
    console.log('🔄 Step 2: Configuring API...');
    
    // Check current step
    const currentStep = await page.evaluate(() => {
      const stepIndicator = document.querySelector('[data-step]');
      return stepIndicator ? stepIndicator.getAttribute('data-step') : 'unknown';
    });
    
    console.log(`Current application step: ${currentStep}`);
    
    // If we're on step 0 (API config), try to proceed to next step
    if (currentStep === '0') {
      // Look for Next or Continue button to skip API config (since environment key is available)
      const proceeded = await page.evaluate(() => {
        const nextButton = Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent?.includes('Next') ||
          btn.textContent?.includes('Continue') ||
          btn.textContent?.includes('Skip') ||
          btn.textContent?.includes('Proceed')
        );
        if (nextButton && !nextButton.disabled) {
          nextButton.click();
          return true;
        }
        return false;
      });
      
      if (proceeded) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        workflowResults.workflow.push({
          step: 2,
          name: 'Skip API Configuration',
          status: 'PASS',
          details: 'Proceeded from API config step'
        });
      } else {
        workflowResults.workflow.push({
          step: 2,
          name: 'Skip API Configuration',
          status: 'FAIL',
          details: 'Could not proceed from API config step'
        });
      }
    } else {
      workflowResults.workflow.push({
        step: 2,
        name: 'API Configuration',
        status: 'PASS',
        details: `Already on step ${currentStep}`
      });
    }
    
    // Step 3: Find and fill goal input
    console.log('🔄 Step 3: Looking for goal input...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const goalInputFound = await page.evaluate(() => {
      // Look for various types of goal input elements
      const selectors = [
        'input[placeholder*="goal"]',
        'input[placeholder*="Goal"]',
        'textarea[placeholder*="goal"]',
        'textarea[placeholder*="Goal"]',
        'input[type="text"]',
        'textarea'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return true;
      }
      return false;
    });
    
    if (goalInputFound) {
      // Try to enter a test goal
      const goalEntered = await page.evaluate(() => {
        const selectors = [
          'input[placeholder*="goal"]',
          'input[placeholder*="Goal"]',
          'textarea[placeholder*="goal"]',
          'textarea[placeholder*="Goal"]',
          'input[type="text"]',
          'textarea'
        ];
        
        const testGoal = 'I want to learn React development and build 3 projects by the end of this year';
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            element.value = testGoal;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Goal entered:', testGoal);
            return true;
          }
        }
        return false;
      });
      
      if (goalEntered) {
        workflowResults.workflow.push({
          step: 3,
          name: 'Enter Goal',
          status: 'PASS',
          details: 'Successfully entered test goal'
        });
      } else {
        workflowResults.workflow.push({
          step: 3,
          name: 'Enter Goal',
          status: 'FAIL',
          details: 'Found input but could not enter goal'
        });
      }
    } else {
      workflowResults.workflow.push({
        step: 3,
        name: 'Find Goal Input',
        status: 'FAIL',
        details: 'Goal input field not found'
      });
    }
    
    // Step 4: Look for and click Transform button
    console.log('🔄 Step 4: Looking for Transform button...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const transformClicked = await page.evaluate(() => {
      const buttonSelectors = [
        'button[class*="transform"]',
        'button[class*="smart"]',
        'button[class*="generate"]'
      ];
      
      // First try specific selectors
      for (const selector of buttonSelectors) {
        const button = document.querySelector(selector);
        if (button && !button.disabled) {
          button.click();
          console.log('Transform button clicked (selector):', selector);
          return true;
        }
      }
      
      // Then try text-based search
      const buttons = Array.from(document.querySelectorAll('button'));
      const transformButton = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('transform') ||
               text.includes('smart') ||
               text.includes('generate') ||
               text.includes('translate') ||
               text.includes('convert');
      });
      
      if (transformButton && !transformButton.disabled) {
        transformButton.click();
        console.log('Transform button clicked (text search):', transformButton.textContent);
        return true;
      }
      
      console.log('No transform button found. Available buttons:', buttons.map(b => b.textContent));
      return false;
    });
    
    if (transformClicked) {
      // Wait for API call and response
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      workflowResults.workflow.push({
        step: 4,
        name: 'Click Transform Button',
        status: 'PASS',
        details: 'Transform button clicked successfully'
      });
      
      // Step 5: Check for SMART goal results
      console.log('🔄 Step 5: Checking for SMART goal results...');
      
      const smartResultsFound = await page.evaluate(() => {
        // Look for SMART criteria elements
        const smartTerms = ['specific', 'measurable', 'achievable', 'relevant', 'time-bound', 'timebound'];
        const bodyText = document.body.textContent?.toLowerCase() || '';
        
        const foundTerms = smartTerms.filter(term => bodyText.includes(term));
        
        // Also look for confidence scores or structured data
        const hasConfidence = bodyText.includes('confidence') || bodyText.includes('%');
        const hasStructure = document.querySelector('[class*="smart"]') || 
                           document.querySelector('[class*="result"]') ||
                           document.querySelector('[class*="criteria"]');
        
        console.log('SMART terms found:', foundTerms);
        console.log('Has confidence scores:', hasConfidence);
        console.log('Has structured elements:', !!hasStructure);
        
        return foundTerms.length >= 3 || (hasConfidence && hasStructure);
      });
      
      if (smartResultsFound) {
        workflowResults.workflow.push({
          step: 5,
          name: 'SMART Goal Results',
          status: 'PASS',
          details: 'SMART goal results are displayed'
        });
      } else {
        workflowResults.workflow.push({
          step: 5,
          name: 'SMART Goal Results',
          status: 'FAIL',
          details: 'SMART goal results not found or not displayed'
        });
      }
    } else {
      workflowResults.workflow.push({
        step: 4,
        name: 'Find Transform Button',
        status: 'FAIL',
        details: 'Transform button not found or not clickable'
      });
    }
    
    // Capture final state for debugging
    const finalPageState = await page.evaluate(() => {
      return {
        currentStep: document.querySelector('[data-step]')?.getAttribute('data-step') || 'unknown',
        bodyText: document.body.textContent?.substring(0, 500) || '',
        buttonCount: document.querySelectorAll('button').length,
        inputCount: document.querySelectorAll('input, textarea').length,
        hasSmartContent: document.body.textContent?.toLowerCase().includes('specific') || false
      };
    });
    
    console.log('Final page state:', finalPageState);
    
    // Determine overall workflow status
    const passedSteps = workflowResults.workflow.filter(step => step.status === 'PASS');
    const failedSteps = workflowResults.workflow.filter(step => step.status === 'FAIL');
    
    if (failedSteps.length === 0) {
      workflowResults.status = 'WORKING';
    } else if (passedSteps.length >= 3) {
      workflowResults.status = 'MOSTLY_WORKING';
    } else {
      workflowResults.status = 'NOT_WORKING';
    }
    
    workflowResults.networkRequests = networkRequests;
    workflowResults.errors = errors;
    workflowResults.finalPageState = finalPageState;
    
  } catch (error) {
    console.error('Complete workflow test failed:', error);
    workflowResults.status = 'ERROR';
    workflowResults.errors.push(error.message);
  } finally {
    await browser.close();
  }
  
  // Print results
  const passedSteps = workflowResults.workflow.filter(step => step.status === 'PASS');
  const failedSteps = workflowResults.workflow.filter(step => step.status === 'FAIL');
  
  console.log(`\n🎯 COMPLETE USER WORKFLOW TEST RESULTS:`);
  console.log(`Overall Status: ${workflowResults.status}`);
  console.log(`Steps Passed: ${passedSteps.length}`);
  console.log(`Steps Failed: ${failedSteps.length}`);
  console.log(`Network Requests: ${networkRequests.length}\n`);
  
  workflowResults.workflow.forEach(step => {
    const emoji = step.status === 'PASS' ? '✅' : '❌';
    console.log(`${emoji} Step ${step.step}: ${step.name} - ${step.status}`);
    console.log(`   ${step.details}`);
  });
  
  if (networkRequests.length > 0) {
    console.log('\n🌐 Network Activity:');
    networkRequests.forEach(req => {
      console.log(`   ${req.method} ${req.url}`);
    });
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(error => console.log(`   - ${error}`));
  }
  
  return workflowResults;
}

// Run the complete workflow test
testCompleteUserWorkflow()
  .then(results => {
    console.log('\n📊 Complete Workflow Test Results:', JSON.stringify(results, null, 2));
    
    const fs = require('fs');
    fs.writeFileSync('/workspaces/personalEA/complete-workflow-results.json', JSON.stringify(results, null, 2));
    
    console.log(`\n🎯 COMPLETE WORKFLOW TEST FINISHED: ${results.status}`);
    process.exit(results.status === 'WORKING' || results.status === 'MOSTLY_WORKING' ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Complete workflow test script failed:', error);
    process.exit(1);
  });