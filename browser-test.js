const { chromium } = require('playwright');

(async () => {
  console.log('🎭 Starting browser-based UI testing...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Browser Console Error:', msg.text());
    } else if (msg.text().includes('🔧')) {
      console.log('🔧 Browser Console:', msg.text());
    }
  });
  
  // Log network failures
  page.on('requestfailed', request => {
    console.log('❌ Request failed:', request.url(), request.failure().errorText);
  });
  
  try {
    const url = 'https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev/';
    console.log(`📱 Navigating to: ${url}\n`);
    
    await page.goto(url, { waitUntil: 'networkidle' });
    console.log('✅ Page loaded successfully\n');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-1-initial.png' });
    
    // Check if we're on the API configuration screen
    const configButton = await page.locator('button:has-text("Configure API")').first();
    const isConfigVisible = await configButton.isVisible();
    console.log(`🔍 Configure API button visible: ${isConfigVisible}\n`);
    
    if (isConfigVisible) {
      console.log('🖱️  Clicking "Configure API" button...\n');
      
      // Wait for any console messages before clicking
      await page.waitForTimeout(1000);
      
      // Click the button
      await configButton.click();
      
      // Wait for any error messages
      await page.waitForTimeout(2000);
      
      // Check for error messages
      const errorElement = await page.locator('.bg-red-50').first();
      const hasError = await errorElement.isVisible();
      
      if (hasError) {
        const errorText = await errorElement.textContent();
        console.log('❌ ERROR DETECTED:', errorText);
        await page.screenshot({ path: 'test-2-error.png' });
      } else {
        console.log('✅ No error detected after clicking Configure API');
        
        // Check if configuration worked
        const continueButton = await page.locator('button:has-text("Continue")').first();
        if (await continueButton.isVisible()) {
          console.log('✅ Configuration appears successful - Continue button visible');
        }
      }
    } else {
      // Already configured, check if we can proceed
      const continueButton = await page.locator('button:has-text("Continue")').first();
      if (await continueButton.isVisible()) {
        console.log('✅ App already configured - Continue button visible');
      }
    }
    
    // Check network requests to backend
    console.log('\n📡 Testing backend connectivity...');
    
    // Test health endpoint
    const healthResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('https://psychic-space-robot-vpw7gr9q6j39qv-8085.app.github.dev/health');
        return {
          ok: response.ok,
          status: response.status,
          text: await response.text()
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Health endpoint test:', JSON.stringify(healthResponse, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    await browser.close();
    console.log('\n✅ Browser test completed');
  }
})();