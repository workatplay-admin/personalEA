import { test, expect } from '@playwright/test';

test.describe('Debug Live Chat Issues', () => {
  test('inspect chat behavior and API calls', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`Browser console [${msg.type()}]:`, msg.text());
    });

    // Monitor all API requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`\nAPI Request: ${request.method()} ${request.url()}`);
        console.log('Headers:', request.headers());
        if (request.method() === 'POST') {
          console.log('Body:', request.postData());
        }
      }
    });

    // Monitor all API responses
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`\nAPI Response: ${response.status()} ${response.url()}`);
        response.text().then(body => {
          console.log('Response body:', body);
        }).catch(() => {});
      }
    });

    // Navigate to the app
    await page.goto('/');
    
    // Configure API
    console.log('\n=== Configuring API ===');
    await page.locator('input[placeholder*="API key"]').fill('sk-test1234567890abcdef');
    await page.click('button:has-text("Configure API")');
    
    // Enter goal
    console.log('\n=== Entering Goal ===');
    await page.waitForSelector('textarea[placeholder*="I want to get better at programming"]');
    await page.locator('textarea[placeholder*="I want to get better at programming"]').fill('become a Senior Developer');
    await page.click('button:has-text("Transform into SMART Goal")');
    
    // Wait for SMART goal or error
    console.log('\n=== Waiting for SMART Goal ===');
    await page.waitForTimeout(5000); // Give time for processing
    
    // Check what's on the page
    const pageContent = await page.content();
    
    // Look for key elements
    const hasSmartGoal = await page.locator('h2:has-text("Your SMART Goal")').isVisible().catch(() => false);
    const hasError = await page.locator('text=Translation Failed').isVisible().catch(() => false);
    const hasAIAssistant = await page.locator('h3:has-text("AI Clarification Assistant")').isVisible().catch(() => false);
    
    console.log('\n=== Page Status ===');
    console.log('Has SMART Goal:', hasSmartGoal);
    console.log('Has Error:', hasError);
    console.log('Has AI Assistant:', hasAIAssistant);
    
    if (hasSmartGoal && hasAIAssistant) {
      console.log('\n=== Checking Chat Interface ===');
      
      // Wait for chat to initialize
      await page.waitForTimeout(3000);
      
      // Check for bot messages
      const botMessages = await page.locator('[class*="bot"]').all();
      console.log('Number of bot messages:', botMessages.length);
      
      for (let i = 0; i < botMessages.length; i++) {
        const text = await botMessages[i].textContent();
        console.log(`Bot message ${i + 1}:`, text);
      }
      
      // Check for error messages
      const errorMessages = await page.locator('text=/System error|System not responsive/').all();
      console.log('Number of error messages:', errorMessages.length);
      
      if (errorMessages.length > 0) {
        console.log('\n=== Error Messages Found ===');
        for (let msg of errorMessages) {
          console.log('Error:', await msg.textContent());
        }
      }
      
      // Try to interact with chat
      console.log('\n=== Attempting Chat Interaction ===');
      const chatInput = await page.locator('input[placeholder*="Tell me about"]').isVisible().catch(() => false);
      
      if (chatInput) {
        await page.locator('input[placeholder*="Tell me about"]').fill('I need help with metrics');
        await page.locator('input[placeholder*="Tell me about"]').press('Enter');
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check for new messages
        const newBotMessages = await page.locator('[class*="bot"]').all();
        console.log('Number of bot messages after interaction:', newBotMessages.length);
      }
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/debug-chat-live.png', fullPage: true });
    
    // Keep page open for a bit to see any delayed errors
    await page.waitForTimeout(5000);
  });
});