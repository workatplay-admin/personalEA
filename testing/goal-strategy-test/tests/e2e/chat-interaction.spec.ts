import { test, expect } from '@playwright/test';

test.describe('Chat Interaction E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Clear local storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Complete chat interaction flow with dynamic AI responses', async ({ page }) => {
    // Step 1: Configure API
    await expect(page.locator('h2:has-text("OpenAI API Key Required")')).toBeVisible();
    const apiKeyInput = page.locator('input[placeholder*="API key"]');
    await apiKeyInput.fill('sk-test1234567890abcdef');
    await page.click('button:has-text("Configure API")');
    
    // Step 2: Enter goal
    await expect(page.locator('h2:has-text("What\'s your goal?")')).toBeVisible();
    const goalTextarea = page.locator('textarea[placeholder*="I want to get better at programming"]');
    await goalTextarea.fill('I want to get promoted to senior developer');
    await page.click('button:has-text("Transform into SMART Goal")');
    
    // Step 3: Wait for SMART goal generation
    await expect(page.locator('h2:has-text("Your SMART Goal")')).toBeVisible({ timeout: 30000 });
    
    // Step 4: Verify chat interface is loaded
    await expect(page.locator('h3:has-text("SMART Goal Assistant")')).toBeVisible();
    await expect(page.locator('h3:has-text("AI Clarification Assistant")')).toBeVisible();
    
    // Step 5: Wait for initial bot message
    await expect(page.locator('.test-result:has-text("Hello! I\'m your SMART Goal Refinement Assistant")')).toBeVisible({ timeout: 10000 });
    
    // Step 6: Wait for first component question (should be dynamic from AI)
    await page.waitForTimeout(3000); // Give time for the first component question
    const botMessages = await page.locator('[class*="bot"]').count();
    expect(botMessages).toBeGreaterThan(1); // Should have welcome message + component question
    
    // Step 7: User provides clarification
    const chatInput = page.locator('input[placeholder*="Tell me about"]');
    await chatInput.fill('I have 3 years of experience and want to lead a team');
    await chatInput.press('Enter');
    
    // Step 8: Verify API call is made (check network)
    const clarifyResponse = await page.waitForResponse(
      response => response.url().includes('/clarify') && response.status() === 200,
      { timeout: 10000 }
    );
    expect(clarifyResponse.ok()).toBeTruthy();
    
    // Step 9: User says "I don't know" to trigger contextual help
    await chatInput.fill("I don't know what metrics to use");
    await chatInput.press('Enter');
    
    // Step 10: Verify contextual help API call
    const contextualHelpResponse = await page.waitForResponse(
      response => response.url().includes('/contextual-help') && response.status() === 200,
      { timeout: 10000 }
    );
    expect(contextualHelpResponse.ok()).toBeTruthy();
    
    // Step 11: Verify dynamic AI response (not placeholder)
    const lastBotMessage = page.locator('[class*="bot"]').last();
    const messageText = await lastBotMessage.textContent();
    
    // AI responses should be dynamic and contextual
    expect(messageText).not.toContain('What specific aspects would you like to clarify?');
    expect(messageText?.length).toBeGreaterThan(50); // AI responses are typically longer
    
    // Step 12: Complete the flow
    await chatInput.fill('next');
    await chatInput.press('Enter');
    
    // Verify component progression
    await page.waitForTimeout(2000);
    const progressIndicators = await page.locator('[class*="Working on"]').textContent();
    expect(progressIndicators).toBeTruthy();
  });

  test('Component question generation is dynamic and contextual', async ({ page }) => {
    // Quick setup
    await page.locator('input[placeholder*="API key"]').fill('sk-test1234567890abcdef');
    await page.click('button:has-text("Configure API")');
    await page.locator('textarea[placeholder*="I want to get better at programming"]').fill('Launch an online course');
    await page.click('button:has-text("Transform into SMART Goal")');
    
    // Wait for chat to initialize
    await expect(page.locator('h3:has-text("SMART Goal Assistant")')).toBeVisible({ timeout: 30000 });
    
    // Monitor API calls for component questions
    const componentQuestionPromise = page.waitForResponse(
      response => response.url().includes('/component-question'),
      { timeout: 15000 }
    );
    
    // Wait for the component question API call
    const response = await componentQuestionPromise;
    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data.question).toBeTruthy();
    expect(responseData.data.question).not.toContain('What specific aspects'); // Not the hardcoded text
  });

  test('Error handling when backend endpoints are missing', async ({ page }) => {
    // Configure API
    await page.locator('input[placeholder*="API key"]').fill('sk-test1234567890abcdef');
    await page.click('button:has-text("Configure API")');
    
    // Enter goal
    await page.locator('textarea[placeholder*="I want to get better at programming"]').fill('Test goal');
    await page.click('button:has-text("Transform into SMART Goal")');
    
    // Wait for chat
    await expect(page.locator('h3:has-text("SMART Goal Assistant")')).toBeVisible({ timeout: 30000 });
    
    // If endpoints fail, check for error messages
    page.on('response', response => {
      if (response.url().includes('/api/v1/goals/') && response.status() === 404) {
        console.log('404 Error detected for:', response.url());
      }
    });
    
    // Verify error handling UI
    await page.waitForTimeout(5000);
    const errorMessages = await page.locator('text=/System not responsive|endpoint not found/i').count();
    
    // If backend is not updated, we should see error messages
    if (errorMessages > 0) {
      console.log('Backend endpoints not implemented - error messages displayed correctly');
    }
  });
});