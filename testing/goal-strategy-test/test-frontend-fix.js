import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', error => console.log('Browser error:', error.message));
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:5174');
    await page.waitForSelector('.bg-blue-50', { timeout: 10000 });
    
    console.log('Page loaded, checking for environment configuration...');
    
    // Check if environment is configured
    const envConfigured = await page.evaluate(() => {
      return localStorage.getItem('goal-strategy-openai-key') === null;
    });
    
    if (\!envConfigured) {
      console.log('Environment not configured, clicking Continue button...');
      
      // Look for the Continue button in the green box
      const continueButton = await page.$('button:has-text("Continue")');
      if (continueButton) {
        await continueButton.click();
        console.log('Clicked Continue button');
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('Environment already configured');
    }
    
    // Now test the goal transformation
    console.log('Testing goal transformation...');
    
    // Enter a goal
    await page.type('textarea[placeholder*="Enter your goal"]', 'I want to lose weight');
    
    // Click Transform button
    const transformButton = await page.$('button:has-text("Transform into SMART Goal")');
    await transformButton.click();
    
    console.log('Clicked Transform button, waiting for response...');
    
    // Wait for either success or error
    await page.waitForFunction(
      () => {
        const hasSmartGoal = document.querySelector('[class*="bg-white"][class*="rounded-lg"]') \!== null;
        const hasError = document.querySelector('[class*="bg-red-50"]') \!== null;
        return hasSmartGoal || hasError;
      },
      { timeout: 30000 }
    );
    
    // Check result
    const hasSmartGoal = await page.$('[class*="bg-white"][class*="rounded-lg"]');
    const hasError = await page.$('[class*="bg-red-50"]');
    
    if (hasSmartGoal) {
      console.log('SUCCESS: SMART goal generated\!');
      const goalTitle = await page.$eval('h2', el => el.textContent);
      console.log('Goal title:', goalTitle);
      
      // Take screenshot of success
      await page.screenshot({ path: 'test-success.png' });
    } else if (hasError) {
      console.log('ERROR: Failed to generate SMART goal');
      const errorText = await page.$eval('[class*="bg-red-50"]', el => el.textContent);
      console.log('Error message:', errorText);
      
      // Take screenshot of error
      await page.screenshot({ path: 'test-error.png' });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'test-failure.png' });
  } finally {
    await browser.close();
  }
})();
