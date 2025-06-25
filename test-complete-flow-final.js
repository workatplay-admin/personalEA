const { chromium } = require('playwright');

async function testCompleteUserFlow() {
  console.log('🧪 FINAL COMPREHENSIVE USER FLOW TEST\n');
  console.log('URL: http://localhost:5174/\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enhanced logging
  const apiCalls = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('API Request:')) {
      apiCalls.push({ type: 'request', text, time: new Date().toISOString() });
      console.log(`📤 ${text}`);
    } else if (text.includes('API Response:')) {
      apiCalls.push({ type: 'response', text, time: new Date().toISOString() });
      console.log(`📥 ${text}`);
    } else if (text.includes('🔧') || text.includes('🚀') || text.includes('🔑')) {
      console.log(`🔧 ${text}`);
    } else if (text.includes('App Component') || text.includes('handleApiConfigured') || text.includes('Current Step')) {
      console.log(`🎯 ${text}`);
    } else if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${text}`);
    }
  });
  
  // Track network errors
  const networkErrors = [];
  page.on('requestfailed', request => {
    if (!request.url().includes('github')) {
      networkErrors.push({
        url: request.url(),
        method: request.method(),
        error: request.failure().errorText
      });
      console.log(`\n❌ NETWORK ERROR: ${request.method()} ${request.url()}`);
      console.log(`   Error: ${request.failure().errorText}\n`);
    }
  });
  
  try {
    // STEP 1: Load the app
    console.log('📱 STEP 1: Loading app...');
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✅ App loaded\n');
    
    // STEP 2: Check initial state
    console.log('🔍 STEP 2: Checking initial state...');
    await page.screenshot({ path: 'step2-initial.png' });
    
    const apiConfigVisible = await page.locator('text=API Configuration').isVisible();
    console.log(`   API Configuration section: ${apiConfigVisible ? '✅' : '❌'}`);
    
    // Check if Continue button exists
    const continueButton = page.locator('button:has-text("Continue"):not([data-target*="webauthn"])');
    const continueExists = await continueButton.count() > 0;
    console.log(`   Continue button: ${continueExists ? '✅' : '❌'}\n`);
    
    if (!continueExists) {
      throw new Error('Continue button not found - app may not have auto-configured');
    }
    
    // STEP 3: Click Continue
    console.log('🖱️ STEP 3: Clicking Continue...');
    await continueButton.click();
    console.log('✅ Clicked Continue\n');
    
    // Wait for transition
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'step3-after-continue.png' });
    
    // STEP 4: Find goal input
    console.log('🔍 STEP 4: Looking for goal input...');
    
    // Try multiple selectors
    const goalSelectors = [
      'textarea[placeholder*="goal"]',
      'textarea[placeholder*="Goal"]',
      'textarea',
      'input[type="text"][placeholder*="goal"]'
    ];
    
    let goalInput = null;
    for (const selector of goalSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        goalInput = element.first();
        console.log(`✅ Found goal input with selector: ${selector}`);
        break;
      }
    }
    
    if (!goalInput) {
      // Debug: what's on the page?
      const bodyText = await page.textContent('body');
      console.log('❌ No goal input found. Page content:', bodyText.substring(0, 300) + '...');
      throw new Error('Goal input not found after clicking Continue');
    }
    
    // STEP 5: Enter goal
    console.log('\n✍️ STEP 5: Entering goal...');
    const testGoal = 'I want to learn Spanish and become conversational within 6 months';
    await goalInput.fill(testGoal);
    console.log(`✅ Entered: "${testGoal}"\n`);
    await page.screenshot({ path: 'step5-goal-entered.png' });
    
    // STEP 6: Find and click Transform button
    console.log('🔍 STEP 6: Finding Transform button...');
    const transformSelectors = [
      'button:has-text("Transform into SMART Goal")',
      'button:has-text("Transform")',
      'button[type="submit"]'
    ];
    
    let transformButton = null;
    for (const selector of transformSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        transformButton = element.first();
        console.log(`✅ Found transform button: ${selector}`);
        break;
      }
    }
    
    if (!transformButton) {
      throw new Error('Transform button not found');
    }
    
    // STEP 7: Click Transform and monitor response
    console.log('\n🚀 STEP 7: Clicking Transform button...');
    
    // Set up response monitoring
    let apiResponse = null;
    const responsePromise = page.waitForResponse(
      response => {
        const url = response.url();
        if (url.includes('/goals/translate') || url.includes('/api/')) {
          console.log(`\n📡 Intercepted API call: ${response.request().method()} ${url}`);
          apiResponse = response;
          return true;
        }
        return false;
      },
      { timeout: 30000 }
    ).catch(error => {
      console.log('\n❌ No API response within 30 seconds');
      return null;
    });
    
    // Click the button
    await transformButton.click();
    console.log('✅ Clicked Transform button');
    console.log('⏳ Waiting for API response...\n');
    
    // Wait for response
    const response = await responsePromise;
    
    if (!response) {
      // Check for UI errors
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'step7-no-response.png' });
      
      const errorSelectors = [
        '.bg-red-50',
        '.text-red-600',
        'text=Network Error',
        'text=Failed to fetch',
        'text=error'
      ];
      
      for (const selector of errorSelectors) {
        const errorElement = page.locator(selector);
        if (await errorElement.count() > 0) {
          const errorText = await errorElement.first().textContent();
          console.log(`\n❌ UI ERROR FOUND: ${errorText}`);
          await page.screenshot({ path: 'ui-error.png' });
          throw new Error(`UI shows error: ${errorText}`);
        }
      }
      
      console.log('\n❌ CRITICAL: No API response and no error message');
      console.log('Network errors recorded:', networkErrors.length);
      networkErrors.forEach(err => {
        console.log(`   - ${err.method} ${err.url}: ${err.error}`);
      });
      
      throw new Error('Transform button click did not trigger API call');
    }
    
    // STEP 8: Analyze API response
    console.log(`📡 API Response Status: ${response.status()}`);
    console.log(`📡 API URL: ${response.url()}\n`);
    
    if (response.status() !== 200) {
      const responseBody = await response.text();
      console.log(`❌ API Error Response Body: ${responseBody}`);
      throw new Error(`API returned status ${response.status()}`);
    }
    
    // STEP 9: Check for results
    console.log('🔍 STEP 9: Checking for results...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'step9-after-api.png' });
    
    // Check for success indicators
    const successIndicators = [
      'SMART Goal',
      'Milestones',
      'Work Breakdown',
      'Specific:',
      'Measurable:'
    ];
    
    let foundResults = false;
    for (const indicator of successIndicators) {
      const found = await page.locator(`text=${indicator}`).count() > 0;
      if (found) {
        console.log(`   ✅ Found: "${indicator}"`);
        foundResults = true;
      }
    }
    
    if (foundResults) {
      console.log('\n✅✅✅ SUCCESS! Complete user flow works correctly!');
      await page.screenshot({ path: 'success-complete-flow.png' });
    } else {
      console.log('\n❌ No results displayed after successful API call');
      
      // Debug page content
      const pageText = await page.textContent('body');
      console.log('Page content:', pageText.substring(0, 400) + '...');
      
      throw new Error('Results not displayed despite successful API call');
    }
    
  } catch (error) {
    console.log('\n❌❌❌ TEST FAILED:', error.message);
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`   API calls made: ${apiCalls.length}`);
    console.log(`   Network errors: ${networkErrors.length}`);
    
    if (networkErrors.length > 0) {
      console.log('\n📋 Network Errors Detail:');
      networkErrors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.method} ${err.url}`);
        console.log(`      Error: ${err.error}`);
      });
    }
    
    await page.screenshot({ path: 'final-error-state.png' });
    throw error;
    
  } finally {
    await browser.close();
  }
}

// Run test
testCompleteUserFlow().then(() => {
  console.log('\n✅ Test completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Test execution failed:', error.message);
  process.exit(1);
});