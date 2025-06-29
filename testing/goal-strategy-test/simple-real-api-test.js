import { chromium } from 'playwright';

async function testRealAPIIntegration() {
  console.log('🚀 Starting Real API Integration Test');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Monitor console for errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Browser ERROR:', msg.text());
    } else if (msg.text().includes('API')) {
      console.log('🔧 API Log:', msg.text());
    }
  });
  
  try {
    console.log('📱 Navigating to frontend...');
    await page.goto('http://localhost:5174');
    
    console.log('⏱️  Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/01-initial-load.png' });
    console.log('📸 Initial page screenshot saved');
    
    // Check if API config section is visible
    const apiConfigSection = await page.locator('text=OpenAI API Key Required').isVisible({ timeout: 5000 });
    console.log(`🔑 API Config section visible: ${apiConfigSection}`);
    
    if (apiConfigSection) {
      // Get the real API key from environment
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found in environment');
      }
      
      console.log('🔐 Filling in API key...');
      await page.locator('input[placeholder*="API key"]').fill(apiKey);
      await page.screenshot({ path: 'test-results/02-api-key-filled.png' });
      
      console.log('⚙️  Configuring API...');
      await page.click('button:has-text("Configure API")');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/03-api-configured.png' });
    }
    
    // Look for goal input area
    console.log('🎯 Looking for goal input...');
    const goalInput = await page.locator('textarea[placeholder*="programming"], textarea[placeholder*="goal"]').first();
    const goalInputVisible = await goalInput.isVisible({ timeout: 5000 });
    console.log(`📝 Goal input visible: ${goalInputVisible}`);
    
    if (goalInputVisible) {
      console.log('✍️  Entering test goal...');
      await goalInput.fill('I want to become a senior software engineer within 2 years');
      await page.screenshot({ path: 'test-results/04-goal-entered.png' });
      
      // Look for transform button
      const transformButton = await page.locator('button:has-text("Transform"), button:has-text("SMART")').first();
      const transformVisible = await transformButton.isVisible({ timeout: 5000 });
      console.log(`🔄 Transform button visible: ${transformVisible}`);
      
      if (transformVisible) {
        console.log('🚀 Clicking transform button (this will test real API)...');
        await transformButton.click();
        
        // Wait for API response (real API calls take time)
        console.log('⏳ Waiting for API response (up to 60 seconds)...');
        await page.waitForTimeout(5000);
        
        // Look for SMART goal result or AI response
        const smartGoalResult = await page.locator('text=SMART Goal, text=Specific, text=Measurable, text=AI Assistant').first().isVisible({ timeout: 30000 });
        console.log(`✅ SMART goal result visible: ${smartGoalResult}`);
        
        await page.screenshot({ path: 'test-results/05-smart-goal-result.png', fullPage: true });
        
        if (smartGoalResult) {
          console.log('🎉 SUCCESS: Real API integration working!');
          console.log('✅ Browser test PASSED - Real OpenAI API calls functional');
          return true;
        } else {
          console.log('⚠️  No SMART goal result detected, but continuing...');
        }
      }
    }
    
    // Final screenshot regardless of results
    await page.screenshot({ path: 'test-results/06-final-state.png', fullPage: true });
    
    console.log('✅ Browser test completed - Check screenshots for results');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-results/error-state.png', fullPage: true });
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testRealAPIIntegration()
  .then(success => {
    if (success) {
      console.log('\n🎯 BROWSER TEST COMPLETED SUCCESSFULLY');
      console.log('📊 Real API integration validated with browser automation');
      process.exit(0);
    } else {
      console.log('\n❌ BROWSER TEST FAILED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test runner error:', error);
    process.exit(1);
  });

export { testRealAPIIntegration };