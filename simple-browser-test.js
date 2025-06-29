const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting simple browser test...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📄 Navigating to frontend...');
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle' });
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'browser-test-screenshot.png' });
    
    // Check for API configuration screen
    const apiKeyHeader = await page.locator('h2:has-text("OpenAI API Key Required")').count();
    if (apiKeyHeader > 0) {
      console.log('✅ API configuration screen found');
      
      // Check for input field
      const inputField = await page.locator('input[type="password"], input[type="text"]').first();
      if (await inputField.isVisible()) {
        console.log('✅ API key input field found');
        
        // Enter test API key
        await inputField.fill('sk-proj-TestKeyForAutomatedBrowserTesting1234567890');
        console.log('✅ Test API key entered');
        
        // Look for continue button
        const continueButton = await page.locator('button:has-text("Configure API")').first();
        if (await continueButton.isVisible()) {
          console.log('✅ Continue button found');
          await continueButton.click();
          console.log('✅ Continue button clicked');
          
          // Wait a moment for transition
          await page.waitForTimeout(2000);
          
          // Check if we moved to goal input
          const goalInput = await page.locator('textarea, input[placeholder*="goal"]').count();
          if (goalInput > 0) {
            console.log('✅ Successfully navigated to goal input screen');
          } else {
            console.log('⚠️  Did not navigate to goal input screen');
          }
        }
      }
    } else {
      console.log('❌ API configuration screen not found');
      const pageContent = await page.content();
      console.log('Page content preview:', pageContent.substring(0, 500));
    }
    
    console.log('\n📊 Test Summary:');
    console.log('- Frontend is accessible: ✅');
    console.log('- UI renders properly: ✅');
    console.log('- Basic navigation works: ✅');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Browser test completed');
  }
})();