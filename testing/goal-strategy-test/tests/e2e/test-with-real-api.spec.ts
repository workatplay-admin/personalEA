import { test, expect } from '@playwright/test';

test.describe('Test with Real API Key', () => {
  test('test chat with real OpenAI API key', async ({ page }) => {
    // Get real API key from environment
    const realApiKey = process.env.OPENAI_API_KEY || '';
    
    if (!realApiKey || !realApiKey.startsWith('sk-')) {
      console.log('Skipping test - no valid OpenAI API key in environment');
      test.skip();
      return;
    }

    // Monitor console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser ERROR:', msg.text());
      }
    });

    // Navigate to app
    await page.goto('/');
    
    // Configure with real API key
    await page.locator('input[placeholder*="API key"]').fill(realApiKey);
    await page.click('button:has-text("Configure API")');
    
    // Enter goal
    await page.waitForSelector('textarea[placeholder*="I want to get better at programming"]');
    await page.locator('textarea[placeholder*="I want to get better at programming"]').fill('become a Senior Developer');
    await page.click('button:has-text("Transform into SMART Goal")');
    
    // Wait for SMART goal
    await expect(page.locator('h2:has-text("Your SMART Goal")')).toBeVisible({ timeout: 30000 });
    
    // Check for AI Assistant
    await expect(page.locator('h3:has-text("AI Clarification Assistant")')).toBeVisible();
    
    // Wait for chat to initialize
    await page.waitForTimeout(5000);
    
    // Look for bot messages
    const botMessages = await page.locator('.flex.justify-start').all();
    console.log('\n=== Bot Messages Found ===');
    console.log('Number of bot messages:', botMessages.length);
    
    for (let i = 0; i < botMessages.length; i++) {
      const msgText = await botMessages[i].textContent();
      console.log(`\nBot Message ${i + 1}:`);
      console.log(msgText);
      
      // Check if it contains the hardcoded text the user mentioned
      if (msgText?.includes('skill enhancement and project leadership')) {
        console.log('⚠️ FOUND HARDCODED TEXT!');
      }
      
      // Check if it's an error message
      if (msgText?.includes('System error') || msgText?.includes('System not responsive')) {
        console.log('⚠️ FOUND ERROR MESSAGE!');
      }
    }
    
    // Check chat input placeholder
    const chatInput = page.locator('input[placeholder*="Tell me about"]');
    const placeholder = await chatInput.getAttribute('placeholder');
    console.log('\nChat input placeholder:', placeholder);
    
    // Try to interact
    await chatInput.fill('I need help with metrics');
    await chatInput.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check for new messages
    const newBotMessages = await page.locator('.flex.justify-start').all();
    console.log('\nAfter interaction - Number of bot messages:', newBotMessages.length);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/real-api-chat-test.png', fullPage: true });
  });
});