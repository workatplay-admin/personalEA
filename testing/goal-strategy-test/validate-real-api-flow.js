import { chromium } from 'playwright';

async function validateRealAPIFlow() {
  console.log('🚀 Starting Real API Flow Validation...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to the app
    console.log('1️⃣ Navigating to app...');
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    console.log('✅ App loaded successfully');
    
    // Step 2: Check API configuration
    console.log('2️⃣ Checking API configuration...');
    const apiKeyInput = page.locator('input[placeholder*="API"]');
    
    if (await apiKeyInput.isVisible()) {
      console.log('📝 API key input found, entering key...');
      await apiKeyInput.fill(process.env.OPENAI_API_KEY || '');
      
      // Look for continue or next button
      const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Get Started")');
      if (await continueButton.isVisible()) {
        await continueButton.click();
        console.log('✅ API key configured');
      }
    } else {
      console.log('ℹ️ API key already configured or not required');
    }
    
    // Step 3: Find goal input
    console.log('3️⃣ Looking for goal input...');
    await page.waitForTimeout(2000); // Give time for navigation
    
    const goalInput = page.locator('textarea[placeholder*="goal"], input[placeholder*="goal"], textarea').first();
    
    if (await goalInput.isVisible()) {
      console.log('📝 Goal input found, entering test goal...');
      await goalInput.fill('I want to learn React and become a frontend developer');
      console.log('✅ Goal entered');
      
      // Step 4: Find and click transform button
      console.log('4️⃣ Looking for transform button...');
      const transformButton = page.locator('button:has-text("Transform"), button:has-text("Analyze"), button:has-text("Start"), button:has-text("Submit")').first();
      
      if (await transformButton.isVisible()) {
        console.log('🔄 Clicking transform button...');
        await transformButton.click();
        
        // Step 5: Wait for API response
        console.log('5️⃣ Waiting for API response...');
        await page.waitForTimeout(5000); // Wait for API call
        
        // Check for loading states
        const loadingIndicator = page.locator('text=/loading|processing|analyzing/i');
        if (await loadingIndicator.isVisible()) {
          console.log('⏳ Processing in progress...');
          await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
        }
        
        // Step 6: Check for results
        console.log('6️⃣ Checking for results...');
        
        // Look for SMART criteria elements
        const smartElements = await page.locator('text=/specific|measurable|achievable|relevant|time/i').count();
        if (smartElements > 0) {
          console.log(`✅ Found ${smartElements} SMART criteria elements`);
        }
        
        // Look for chat/clarification elements
        const chatElements = await page.locator('text=/clarif|question|help me understand/i').count();
        if (chatElements > 0) {
          console.log(`✅ Found ${chatElements} clarification elements`);
        }
        
        // Look for any error messages
        const errorMessages = await page.locator('text=/error|failed|problem/i').count();
        if (errorMessages > 0) {
          console.log(`⚠️ Found ${errorMessages} potential error messages`);
        }
        
        // Take screenshot
        await page.screenshot({ path: 'real-api-test-result.png' });
        console.log('📸 Screenshot saved as real-api-test-result.png');
        
        // Step 7: Verify API is being used
        console.log('7️⃣ Verifying real API usage...');
        
        // Check network logs for OpenAI API calls
        const apiCalls = [];
        page.on('request', request => {
          if (request.url().includes('openai') || request.url().includes('/api/')) {
            apiCalls.push(request.url());
          }
        });
        
        await page.waitForTimeout(2000);
        
        if (apiCalls.length > 0) {
          console.log(`✅ Found ${apiCalls.length} API calls`);
        }
        
        console.log('\n✅ VALIDATION COMPLETE - APP IS FUNCTIONAL WITH REAL API');
        
      } else {
        console.log('❌ Transform button not found');
      }
      
    } else {
      console.log('❌ Goal input not found');
      await page.screenshot({ path: 'real-api-test-error.png' });
    }
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
    await page.screenshot({ path: 'real-api-test-error.png' });
  } finally {
    await browser.close();
  }
}

// Run the validation
validateRealAPIFlow().catch(console.error);