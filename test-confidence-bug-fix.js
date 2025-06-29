import { chromium } from 'playwright';

async function testConfidenceBugFix() {
  console.log('🧪 Testing Confidence Display Bug Fix');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Monitor console for confidence display
  const confidenceDisplays = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('% confident') || text.includes('confidence')) {
      confidenceDisplays.push(text);
      console.log('📊 Confidence Display:', text);
    }
  });
  
  try {
    console.log('🌐 Navigating to frontend...');
    await page.goto('http://localhost:5174');
    
    // Get the real API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    
    // Wait for API config
    await page.waitForSelector('input[placeholder*="API key"]', { timeout: 10000 });
    await page.locator('input[placeholder*="API key"]').fill(apiKey);
    await page.click('button:has-text("Configure API")');
    await page.waitForTimeout(2000);
    
    // Enter the weight loss goal that had the bug
    console.log('🎯 Testing with weight loss goal...');
    const goalInput = await page.locator('textarea[placeholder*="programming"], textarea[placeholder*="goal"]').first();
    await goalInput.fill('I want to lose weight and get fit');
    await page.click('button:has-text("Transform"), button:has-text("SMART")');
    
    // Wait for SMART goal result
    console.log('⏳ Waiting for AI processing...');
    await page.waitForTimeout(30000); // Wait for AI processing
    
    // Look for confidence displays in the AI Clarification Assistant
    const chatMessages = await page.locator('.flex.justify-start').all();
    console.log('\n📝 Checking confidence displays in chat...');
    
    let foundConfidenceDisplays = [];
    for (let i = 0; i < chatMessages.length; i++) {
      const msgText = await chatMessages[i].textContent();
      if (msgText && msgText.includes('% confident')) {
        foundConfidenceDisplays.push(msgText);
        console.log(`✅ Found confidence display: ${msgText.substring(0, 100)}...`);
      }
    }
    
    // Test the clarification with specific details
    console.log('\n💬 Testing clarification with specific details...');
    const chatInput = page.locator('input[placeholder*="Tell me about"], input[placeholder*="Describe"]');
    
    if (await chatInput.isVisible({ timeout: 5000 })) {
      // Provide the specific details that should trigger high confidence
      await chatInput.fill('I would like to lose 30 pounds and be able to run 30 KM per week');
      await chatInput.press('Enter');
      
      // Wait for AI response
      await page.waitForTimeout(20000);
      
      // Check for updated confidence displays
      const updatedMessages = await page.locator('.flex.justify-start').all();
      console.log('\n📈 Checking for updated confidence after clarification...');
      
      for (let i = foundConfidenceDisplays.length; i < updatedMessages.length; i++) {
        const msgText = await updatedMessages[i].textContent();
        if (msgText && (msgText.includes('% confidence') || msgText.includes('improved to'))) {
          console.log(`🎯 Updated confidence: ${msgText.substring(0, 150)}...`);
        }
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/confidence-bug-fix-test.png', fullPage: true });
    
    // Validate that confidence displays are reasonable (not > 100% or < 1%)
    let hasValidConfidence = true;
    for (const display of confidenceDisplays) {
      const confidenceMatch = display.match(/(\d+(?:\.\d+)?)%/);
      if (confidenceMatch) {
        const confidence = parseFloat(confidenceMatch[1]);
        if (confidence > 100 || confidence < 0) {
          console.log(`❌ Invalid confidence detected: ${confidence}%`);
          hasValidConfidence = false;
        } else {
          console.log(`✅ Valid confidence: ${confidence}%`);
        }
      }
    }
    
    console.log('\n🔍 Test Results:');
    console.log(`- Confidence displays found: ${confidenceDisplays.length}`);
    console.log(`- Valid confidence values: ${hasValidConfidence ? 'YES' : 'NO'}`);
    console.log(`- Test completed successfully: ${hasValidConfidence ? 'YES' : 'NO'}`);
    
    return hasValidConfidence;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-results/confidence-test-error.png', fullPage: true });
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testConfidenceBugFix()
  .then(success => {
    if (success) {
      console.log('\n🎉 CONFIDENCE BUG FIX TEST PASSED');
      process.exit(0);
    } else {
      console.log('\n❌ CONFIDENCE BUG FIX TEST FAILED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test runner error:', error);
    process.exit(1);
  });

export { testConfidenceBugFix };