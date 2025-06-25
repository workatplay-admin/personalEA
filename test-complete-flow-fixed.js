const { chromium } = require('playwright');

async function testCompleteUserFlow() {
  console.log('🧪 COMPREHENSIVE USER FLOW TEST FOR GOAL STRATEGY MODULE\n');
  console.log('Testing URL: https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev/\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable detailed logging
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    logs.push({ type, text, time: new Date().toISOString() });
    
    if (type === 'error') {
      console.log(`❌ Browser Error: ${text}`);
    } else if (text.includes('API Request:') || text.includes('API Response:')) {
      console.log(`📡 ${text}`);
    } else if (text.includes('🔧') || text.includes('🚀')) {
      console.log(`🔧 ${text}`);
    }
  });
  
  // Monitor network requests
  const failedRequests = [];
  page.on('requestfailed', request => {
    if (!request.url().includes('diagnostic') && !request.url().includes('github')) {
      const failure = {
        url: request.url(),
        method: request.method(),
        error: request.failure().errorText
      };
      failedRequests.push(failure);
      console.log(`❌ Request Failed: ${request.method()} ${request.url()}`);
      console.log(`   Error: ${request.failure().errorText}`);
    }
  });
  
  // Monitor successful API responses
  page.on('response', response => {
    if (response.url().includes('/api/') && !response.url().includes('github')) {
      console.log(`✅ API Response: ${response.status()} ${response.method()} ${response.url()}`);
    }
  });
  
  try {
    // STEP 1: Navigate to the app
    console.log('\n📱 STEP 1: Navigating to app...');
    await page.goto('https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForTimeout(3000);
    console.log('✅ Page loaded');
    
    // Take initial screenshot
    await page.screenshot({ path: 'initial-state.png' });
    
    // STEP 2: Check what's actually on the page
    console.log('\n🔍 STEP 2: Analyzing page content...');
    
    // Look for our specific app elements
    const appTitle = await page.locator('h1:has-text("Goal & Strategy")').count();
    const configSection = await page.locator('text=API Configuration').count();
    const goalTextarea = await page.locator('textarea[placeholder*="goal"]').count();
    
    console.log(`   App title found: ${appTitle > 0 ? '✅' : '❌'}`);
    console.log(`   API Config section: ${configSection > 0 ? '✅' : '❌'}`);
    console.log(`   Goal textarea: ${goalTextarea > 0 ? '✅' : '❌'}`);
    
    // Check if we're already on goal input
    if (goalTextarea > 0) {
      console.log('\n✅ Already on goal input screen, skipping configuration steps');
    } else if (configSection > 0) {
      console.log('\n🔍 API Configuration section found');
      
      // Check if there's a Continue button in our app (not WebAuthn)
      const continueButton = await page.locator('.space-y-4 button:has-text("Continue")').count();
      if (continueButton > 0) {
        console.log('✅ App is auto-configured, Continue button available');
        await page.locator('.space-y-4 button:has-text("Continue")').click();
        await page.waitForTimeout(1000);
      } else {
        console.log('❌ No Continue button found - configuration may have failed');
        const errorMessage = await page.locator('.bg-red-50').textContent().catch(() => null);
        if (errorMessage) {
          console.log(`❌ Error message: ${errorMessage}`);
        }
        throw new Error('App failed to auto-configure');
      }
    }
    
    // STEP 3: Verify we're on the goal input screen
    console.log('\n🔍 STEP 3: Verifying goal input screen...');
    const goalTextareaElement = page.locator('textarea[placeholder*="goal"]');
    await goalTextareaElement.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Goal input textarea is visible');
    
    // STEP 4: Enter a goal
    console.log('\n✍️ STEP 4: Entering goal text...');
    const testGoal = 'I want to learn Spanish and become conversational within 6 months';
    await goalTextareaElement.fill(testGoal);
    console.log(`✅ Entered goal: "${testGoal}"`);
    await page.waitForTimeout(500);
    
    // STEP 5: Find and click Transform button
    console.log('\n🚀 STEP 5: Looking for Transform button...');
    
    // Look for different possible button texts
    const transformButton = await page.locator('button:has-text("Transform into SMART Goal")').or(
      page.locator('button:has-text("Transform")')
    );
    
    const buttonCount = await transformButton.count();
    console.log(`   Transform buttons found: ${buttonCount}`);
    
    if (buttonCount === 0) {
      console.log('❌ No Transform button found');
      await page.screenshot({ path: 'no-transform-button.png' });
      throw new Error('Transform button not found on page');
    }
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'before-transform.png' });
    
    // Click and wait for response
    console.log('🖱️ Clicking Transform button...');
    
    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/goals/translate') || response.url().includes('/api/'),
      { timeout: 30000 }
    ).catch(error => {
      console.log('❌ No API response received within 30 seconds');
      return null;
    });
    
    await transformButton.first().click();
    console.log('⏳ Waiting for API response...');
    
    const response = await responsePromise;
    
    if (!response) {
      console.log('❌ No API response received - checking for errors');
      
      // Check for error messages
      const errorElement = await page.locator('.bg-red-50, .text-red-600, [role="alert"]').first();
      if (await errorElement.count() > 0) {
        const errorText = await errorElement.textContent();
        console.log(`❌ ERROR DISPLAYED: ${errorText}`);
        await page.screenshot({ path: 'error-message.png' });
        throw new Error(`UI shows error: ${errorText}`);
      }
      
      throw new Error('No API response and no error message displayed');
    }
    
    console.log(`\n📡 API Response received: ${response.status()} ${response.url()}`);
    
    if (response.status() !== 200) {
      const responseBody = await response.text();
      console.log(`❌ API Error Response: ${responseBody}`);
      await page.screenshot({ path: 'api-error.png' });
      throw new Error(`API returned status ${response.status()}`);
    }
    
    console.log('✅ Goal translation API call successful');
    
    // STEP 6: Wait for results to appear
    console.log('\n⏳ STEP 6: Waiting for results to render...');
    await page.waitForTimeout(3000);
    
    // Check for SMART goal display
    const smartGoalVisible = await page.locator('text=SMART Goal').count() > 0;
    const hasResults = await page.locator('.space-y-6').count() > 0;
    const hasError = await page.locator('.bg-red-50').count() > 0;
    
    if (hasError) {
      const errorText = await page.locator('.bg-red-50').textContent();
      console.log(`❌ ERROR DISPLAYED: ${errorText}`);
      await page.screenshot({ path: 'error-after-transform.png' });
      throw new Error(`UI shows error after transformation: ${errorText}`);
    }
    
    if (smartGoalVisible || hasResults) {
      console.log('✅ SMART Goal results displayed successfully!');
      await page.screenshot({ path: 'success-smart-goal.png' });
      
      // Verify other components
      const hasMilestones = await page.locator('text=Milestones').count() > 0;
      const hasWBS = await page.locator('text=Work Breakdown').count() > 0;
      const hasEstimation = await page.locator('text=Estimation').count() > 0;
      
      console.log(`   SMART Goal visible: ${smartGoalVisible ? '✅' : '❌'}`);
      console.log(`   Milestones visible: ${hasMilestones ? '✅' : '❌'}`);
      console.log(`   Work Breakdown visible: ${hasWBS ? '✅' : '❌'}`);
      console.log(`   Estimation visible: ${hasEstimation ? '✅' : '❌'}`);
    } else {
      console.log('❌ SMART Goal results not displayed');
      await page.screenshot({ path: 'no-results.png' });
      
      // Log page content for debugging
      const pageText = await page.textContent('body');
      console.log('Page content:', pageText.substring(0, 500) + '...');
      
      throw new Error('SMART Goal transformation did not display results');
    }
    
    console.log('\n✅ COMPLETE USER FLOW TEST PASSED!');
    console.log('The entire goal strategy module flow is working correctly.');
    
  } catch (error) {
    console.log('\n❌ TEST FAILED:', error.message);
    
    // Save detailed logs
    const errorLogs = logs.filter(log => log.type === 'error');
    if (errorLogs.length > 0) {
      console.log('\n📋 Console Errors:');
      errorLogs.forEach(log => console.log(`   ${log.text}`));
    }
    
    // Log failed requests
    if (failedRequests.length > 0) {
      console.log('\n❌ Failed Network Requests:');
      failedRequests.forEach(req => {
        console.log(`   ${req.method} ${req.url}`);
        console.log(`   Error: ${req.error}`);
      });
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testCompleteUserFlow().catch(error => {
  console.error('\n💥 Test execution failed:', error);
  process.exit(1);
});