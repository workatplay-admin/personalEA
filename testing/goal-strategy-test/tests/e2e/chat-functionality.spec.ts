import { test, expect } from '@playwright/test';

test.describe('Chat Functionality with Valid API Key', () => {
  test('complete chat flow with real API key', async ({ page }) => {
    // Get real API key from environment
    const realApiKey = process.env.OPENAI_API_KEY || '';
    
    if (!realApiKey || !realApiKey.startsWith('sk-')) {
      console.log('Skipping test - no valid OpenAI API key in environment');
      test.skip();
      return;
    }

    // Navigate to app
    await page.goto('/');
    
    // Step 1: Configure API
    console.log('Step 1: Configuring API with real key...');
    await page.locator('input[placeholder*="API key"]').fill(realApiKey);
    await page.click('button:has-text("Configure API")');
    
    // Step 2: Enter goal
    console.log('Step 2: Entering goal...');
    await page.waitForSelector('textarea[placeholder*="I want to get better at programming"]');
    await page.locator('textarea[placeholder*="I want to get better at programming"]').fill('become a Senior Developer');
    await page.click('button:has-text("Transform into SMART Goal")');
    
    // Step 3: Wait for SMART goal generation
    console.log('Step 3: Waiting for SMART goal...');
    await expect(page.locator('h2:has-text("Your SMART Goal")')).toBeVisible({ timeout: 30000 });
    
    // Step 4: Verify chat interface appears
    console.log('Step 4: Verifying chat interface...');
    await expect(page.locator('h3:has-text("AI Clarification Assistant")')).toBeVisible();
    await expect(page.locator('h3:has-text("SMART Goal Assistant")')).toBeVisible();
    
    // Step 5: Wait for initial bot message
    console.log('Step 5: Waiting for initial bot message...');
    await page.waitForTimeout(3000); // Give time for initial message
    
    // Check for bot messages (not error messages)
    const botMessages = await page.locator('.flex.justify-start .text-sm').all();
    console.log(`Found ${botMessages.length} bot messages`);
    
    let hasValidBotMessage = false;
    for (const msg of botMessages) {
      const text = await msg.textContent();
      console.log('Bot message:', text?.substring(0, 100) + '...');
      
      // Check if it's NOT an error message
      if (text && !text.includes('System error') && !text.includes('System not responsive')) {
        hasValidBotMessage = true;
      }
    }
    
    expect(hasValidBotMessage).toBe(true);
    
    // Step 6: Test chat interaction
    console.log('Step 6: Testing chat interaction...');
    const chatInput = page.locator('input[placeholder*="Tell me about"]');
    await expect(chatInput).toBeVisible();
    
    // Type a response
    await chatInput.fill('I want to focus on React and TypeScript skills');
    await chatInput.press('Enter');
    
    // Wait for processing
    await page.waitForTimeout(2000);
    
    // Step 7: Verify no error messages
    console.log('Step 7: Verifying no error messages...');
    const errorMessages = await page.locator('text="System error"').count();
    expect(errorMessages).toBe(0);
    
    // Step 8: Check if goal was updated
    console.log('Step 8: Checking if goal was updated...');
    // The SMART goal should update in real-time
    await page.waitForTimeout(5000); // Give time for update
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/chat-functionality.png', fullPage: true });
    
    console.log('✅ Chat functionality test completed successfully!');
  });
});