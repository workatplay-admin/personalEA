const { chromium } = require('playwright');

async function testCompleteUserFlow() {
  console.log('🧪 COMPREHENSIVE USER FLOW TEST - LOCAL VERSION\n');
  console.log('Testing URL: http://localhost:5174/\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable detailed logging
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    
    if (type === 'error') {
      console.log(`❌ Browser Error: ${text}`);
    } else if (text.includes('API Request:') || text.includes('API Response:')) {
      console.log(`📡 ${text}`);
    } else if (text.includes('🔧') || text.includes('🚀') || text.includes('🔑')) {
      console.log(`🔧 ${text}`);
    }
  });
  
  // Monitor network failures
  const failedRequests = [];
  page.on('requestfailed', request => {
    const url = request.url();
    if (!url.includes('diagnostic') && !url.includes('github')) {
      failedRequests.push({
        url: url,
        method: request.method(),
        error: request.failure().errorText
      });
      console.log(`❌ Request Failed: ${request.method()} ${url}`);
      console.log(`   Error: ${request.failure().errorText}`);
    }
  });
  
  // Monitor API responses
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/')) {
      console.log(`✅ API Response: ${response.status()} ${response.request().method()} ${url}`);
    }
  });
  
  try {
    // STEP 1: Navigate to local app
    console.log('📱 STEP 1: Navigating to local app...');
    await page.goto('http://localhost:5174/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded');
    
    // STEP 2: Check page content
    console.log('\n🔍 STEP 2: Checking page content...');
    const title = await page.title();
    console.log(`   Page title: "${title}"`);
    
    // Look for app elements
    const hasAppTitle = await page.locator('h1:has-text("Goal & Strategy")').count() > 0;
    const hasApiConfig = await page.locator('text=API Configuration').count() > 0;
    const hasContinueButton = await page.locator('button:has-text("Continue")').count() > 0;
    const hasGoalTextarea = await page.locator('textarea[placeholder*="goal"]').count() > 0;
    
    console.log(`   App title: ${hasAppTitle ? '✅' : '❌'}`);
    console.log(`   API config section: ${hasApiConfig ? '✅' : '❌'}`);
    console.log(`   Continue button: ${hasContinueButton ? '✅' : '❌'}`);
    console.log(`   Goal textarea: ${hasGoalTextarea ? '✅' : '❌'}`);
    
    await page.screenshot({ path: 'local-initial-state.png' });
    
    // STEP 3: Handle Continue button if present
    if (hasContinueButton && hasApiConfig) {
      console.log('\n🖱️ STEP 3: Clicking Continue button...');
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(1000);
      console.log('✅ Clicked Continue');
    } else if (hasGoalTextarea) {
      console.log('\n✅ STEP 3: Already on goal input screen');
    } else {
      throw new Error('Unexpected page state - no Continue button or goal textarea');
    }
    
    // STEP 4: Enter goal
    console.log('\n✍️ STEP 4: Entering goal...');
    const goalTextarea = page.locator('textarea[placeholder*="goal"]');
    await goalTextarea.waitFor({ state: 'visible', timeout: 5000 });
    
    const testGoal = 'I want to learn Spanish and become conversational within 6 months';
    await goalTextarea.fill(testGoal);
    console.log(`✅ Entered: "${testGoal}"`);
    
    // STEP 5: Click Transform button
    console.log('\n🚀 STEP 5: Clicking Transform button...');
    const transformButton = page.locator('button:has-text("Transform")');
    const buttonExists = await transformButton.count() > 0;
    
    if (!buttonExists) {
      await page.screenshot({ path: 'local-no-transform-button.png' });
      throw new Error('Transform button not found');
    }
    
    // Monitor the API call
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/goals/translate'),
      { timeout: 30000 }
    );
    
    await transformButton.click();
    console.log('⏳ Waiting for API response...');
    
    try {
      const response = await responsePromise;
      console.log(`\n📡 Goal translation response: ${response.status()}`);
      
      if (response.status() !== 200) {
        const body = await response.text();
        console.log(`❌ API Error: ${body}`);
        throw new Error(`API returned ${response.status()}`);
      }
      
      // Wait for UI to update
      await page.waitForTimeout(2000);
      
      // STEP 6: Verify results
      console.log('\n🔍 STEP 6: Checking for results...');
      
      // Check for error messages first
      const hasError = await page.locator('.bg-red-50, .text-red-600').count() > 0;
      if (hasError) {
        const errorText = await page.locator('.bg-red-50, .text-red-600').first().textContent();
        console.log(`❌ ERROR DISPLAYED: ${errorText}`);
        await page.screenshot({ path: 'local-error-after-transform.png' });
        throw new Error(`UI error: ${errorText}`);
      }
      
      // Check for success
      const hasSmartGoal = await page.locator('text=SMART Goal').count() > 0;
      const hasMilestones = await page.locator('text=Milestones').count() > 0;
      const hasWorkBreakdown = await page.locator('text=Work Breakdown').count() > 0;
      
      console.log(`   SMART Goal section: ${hasSmartGoal ? '✅' : '❌'}`);
      console.log(`   Milestones section: ${hasMilestones ? '✅' : '❌'}`);
      console.log(`   Work Breakdown section: ${hasWorkBreakdown ? '✅' : '❌'}`);
      
      if (hasSmartGoal || hasMilestones || hasWorkBreakdown) {
        console.log('\n✅ SUCCESS! Goal transformation completed successfully');
        await page.screenshot({ path: 'local-success.png' });
      } else {
        console.log('\n❌ No results displayed after transformation');
        await page.screenshot({ path: 'local-no-results.png' });
        
        // Debug: log page content
        const pageText = await page.textContent('body');
        console.log('Page content preview:', pageText.substring(0, 300) + '...');
        
        throw new Error('Goal transformation did not display results');
      }
      
    } catch (error) {
      if (error.message.includes('Timeout')) {
        console.log('❌ API call timed out - no response received');
        
        // Check for network errors in UI
        const networkError = await page.locator('text=Network Error').count() > 0;
        const fetchError = await page.locator('text=Failed to fetch').count() > 0;
        
        if (networkError || fetchError) {
          console.log('❌ Network error displayed in UI');
          await page.screenshot({ path: 'local-network-error.png' });
        }
      }
      throw error;
    }
    
    console.log('\n✅ COMPLETE USER FLOW TEST PASSED!');
    
  } catch (error) {
    console.log('\n❌ TEST FAILED:', error.message);
    
    if (failedRequests.length > 0) {
      console.log('\n📋 Failed requests:');
      failedRequests.forEach(req => {
        console.log(`   ${req.method} ${req.url}`);
        console.log(`   Error: ${req.error}`);
      });
    }
    
    await page.screenshot({ path: 'local-test-failed.png' });
    throw error;
    
  } finally {
    await browser.close();
  }
}

// Run the test
testCompleteUserFlow().catch(error => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});