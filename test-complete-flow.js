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
    const failure = {
      url: request.url(),
      method: request.method(),
      error: request.failure().errorText
    };
    failedRequests.push(failure);
    console.log(`❌ Request Failed: ${request.method()} ${request.url()}`);
    console.log(`   Error: ${request.failure().errorText}`);
  });
  
  // Monitor successful API responses
  page.on('response', response => {
    if (response.url().includes('/api/')) {
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
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded');
    
    // STEP 2: Check initial state
    console.log('\n🔍 STEP 2: Checking initial UI state...');
    const hasConfigButton = await page.locator('button:has-text("Configure API")').count() > 0;
    const hasContinueButton = await page.locator('button:has-text("Continue")').count() > 0;
    
    if (hasConfigButton) {
      console.log('❌ ERROR: App shows Configure API button - auto-config failed!');
      await page.screenshot({ path: 'error-config-screen.png' });
      throw new Error('App failed to auto-configure with backend environment');
    } else if (hasContinueButton) {
      console.log('✅ App auto-configured successfully');
    } else {
      console.log('🔍 Checking if already on goal input screen...');
    }
    
    // STEP 3: Click Continue if needed
    if (hasContinueButton) {
      console.log('\n🖱️ STEP 3: Clicking Continue button...');
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(1000);
      console.log('✅ Clicked Continue');
    }
    
    // STEP 4: Verify we're on the goal input screen
    console.log('\n🔍 STEP 4: Verifying goal input screen...');
    const goalTextarea = page.locator('textarea[placeholder*="goal"]');
    await goalTextarea.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Goal input textarea is visible');
    
    // STEP 5: Enter a goal
    console.log('\n✍️ STEP 5: Entering goal text...');
    const testGoal = 'I want to learn Spanish and become conversational within 6 months';
    await goalTextarea.fill(testGoal);
    console.log(`✅ Entered goal: "${testGoal}"`);
    await page.waitForTimeout(500);
    
    // STEP 6: Click Transform button
    console.log('\n🚀 STEP 6: Clicking Transform into SMART Goal button...');
    const transformButton = page.locator('button:has-text("Transform")');
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'before-transform.png' });
    
    // Click and wait for response
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/goals/translate'),
      { timeout: 30000 }
    );
    
    await transformButton.click();
    console.log('⏳ Waiting for API response...');
    
    try {
      const response = await responsePromise;
      console.log(`\n📡 API Response received: ${response.status()}`);
      
      if (response.status() !== 200) {
        const responseBody = await response.text();
        console.log(`❌ API Error Response: ${responseBody}`);
        throw new Error(`API returned status ${response.status()}`);
      }
      
      console.log('✅ Goal translation API call successful');
      
      // STEP 7: Wait for results to appear
      console.log('\n⏳ STEP 7: Waiting for results to render...');
      await page.waitForTimeout(2000);
      
      // Check for SMART goal display
      const smartGoalVisible = await page.locator('text=SMART Goal').count() > 0;
      const hasError = await page.locator('.bg-red-50').count() > 0;
      
      if (hasError) {
        const errorText = await page.locator('.bg-red-50').textContent();
        console.log(`❌ ERROR DISPLAYED: ${errorText}`);
        await page.screenshot({ path: 'error-after-transform.png' });
        throw new Error(`UI shows error: ${errorText}`);
      }
      
      if (smartGoalVisible) {
        console.log('✅ SMART Goal results displayed successfully!');
        await page.screenshot({ path: 'success-smart-goal.png' });
        
        // Verify other components
        const hasMilestones = await page.locator('text=Milestones').count() > 0;
        const hasWBS = await page.locator('text=Work Breakdown').count() > 0;
        
        console.log(`   Milestones visible: ${hasMilestones ? '✅' : '❌'}`);
        console.log(`   Work Breakdown visible: ${hasWBS ? '✅' : '❌'}`);
      } else {
        console.log('❌ SMART Goal results not displayed');
        await page.screenshot({ path: 'no-results.png' });
        throw new Error('SMART Goal transformation did not display results');
      }
      
    } catch (error) {
      console.log(`\n❌ CRITICAL ERROR during goal transformation:`);
      console.log(`   ${error.message}`);
      
      // Log all failed requests
      if (failedRequests.length > 0) {
        console.log('\n❌ Failed Network Requests:');
        failedRequests.forEach(req => {
          console.log(`   ${req.method} ${req.url}`);
          console.log(`   Error: ${req.error}`);
        });
      }
      
      // Take error screenshot
      await page.screenshot({ path: 'critical-error.png' });
      throw error;
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