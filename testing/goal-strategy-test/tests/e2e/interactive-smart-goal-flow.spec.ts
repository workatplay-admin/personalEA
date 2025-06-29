import { test, expect } from '@playwright/test';
import { ApiConfigPage } from './page-objects/ApiConfigPage';
import { GoalInputPage } from './page-objects/GoalInputPage';
import { SmartGoalPage } from './page-objects/SmartGoalPage';
import { TestUtils } from './fixtures/test-utils';
import { TEST_GOALS } from './fixtures/test-data';

test.describe('Interactive SMART Goal Creation Flow', () => {
  let apiConfigPage: ApiConfigPage;
  let goalInputPage: GoalInputPage;
  let smartGoalPage: SmartGoalPage;
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    apiConfigPage = new ApiConfigPage(page);
    goalInputPage = new GoalInputPage(page);
    smartGoalPage = new SmartGoalPage(page);
    testUtils = new TestUtils(page);

    // Setup mock API for consistent testing
    await testUtils.setupMockAPI();
    await page.goto('/');
    await testUtils.setupApiConfig();
  });

  test.describe('Non-Automatic Goal Augmentation', () => {
    test('should NOT automatically augment goals without user input', async ({ page }) => {
      const simpleGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      
      // Submit initial goal
      await goalInputPage.submitGoal(simpleGoal.input);
      
      // Wait for SMART goal display
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Verify that initial goal is displayed without automatic augmentation
      const originalTitle = await page.locator('[data-testid="smart-goal-title"]').textContent();
      expect(originalTitle).toContain(simpleGoal.input);
      
      // Verify low confidence scores for incomplete criteria
      const confidenceScores = await page.locator('[data-testid^="confidence-"]').allTextContents();
      const lowConfidenceCount = confidenceScores.filter(score => 
        parseInt(score.replace('%', '')) < 70
      ).length;
      
      expect(lowConfidenceCount).toBeGreaterThan(0);
      
      // Verify clarification interface is present
      const chatInterface = page.locator('[data-testid="chat-clarification"]');
      await expect(chatInterface).toBeVisible();
    });

    test('should preserve original goal intent without AI modification', async ({ page }) => {
      const testGoal = 'Lose weight';
      
      await goalInputPage.submitGoal(testGoal);
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Check that the goal hasn't been automatically enhanced
      const smartCriteria = await page.locator('[data-testid="smart-criteria"]').textContent();
      
      // Should NOT contain automatically added numbers, dates, or specifics
      expect(smartCriteria).not.toContain('10 pounds');
      expect(smartCriteria).not.toContain('3 months');
      expect(smartCriteria).not.toContain('exercise plan');
      
      // Should show missing information indicators
      const missingIndicators = await page.locator('[data-testid="missing-info"]').count();
      expect(missingIndicators).toBeGreaterThan(0);
    });
  });

  test.describe('Interactive SMART Criteria Guidance', () => {
    test('should guide through each SMART criterion sequentially', async ({ page }) => {
      await goalInputPage.submitGoal('Start a business');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat interface to initialize
      await page.waitForSelector('[data-testid="chat-clarification"]');
      await page.waitForTimeout(2500); // Wait for auto-start
      
      // Verify initial welcome message
      const welcomeMessage = page.locator('[data-testid="chat-message-bot"]').first();
      await expect(welcomeMessage).toContainText('SMART Goal Refinement Assistant');
      
      // Verify it starts with the first component (Specific)
      const firstQuestion = await page.locator('[data-testid="chat-message-bot"]').nth(1).textContent();
      expect(firstQuestion?.toLowerCase()).toContain('specific');
      
      // Provide input for Specific criterion
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('I want to start an online e-commerce store selling handmade crafts');
      await page.locator('[data-testid="chat-send"]').click();
      
      // Wait for AI response
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      
      // Verify goal updates with the new information
      await page.waitForTimeout(1000);
      const specificValue = await page.locator('[data-testid="criterion-specific-value"]').textContent();
      expect(specificValue).toContain('e-commerce');
    });

    test('should handle "I don\'t know" responses with helpful suggestions', async ({ page }) => {
      await goalInputPage.submitGoal('Improve my skills');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat to auto-start
      await page.waitForTimeout(2500);
      
      // Respond with "I don't know" to first question
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill("I don't know");
      await page.locator('[data-testid="chat-send"]').click();
      
      // Wait for helpful response
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      
      // Verify AI provides contextual help
      const helpResponse = await page.locator('[data-testid="chat-message-bot"]').last().textContent();
      expect(helpResponse).toBeTruthy();
      expect(helpResponse?.toLowerCase()).toMatch(/example|consider|try|think about|for instance/);
    });

    test('should allow skipping criteria with "next" command', async ({ page }) => {
      await goalInputPage.submitGoal('Read more books');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat to auto-start
      await page.waitForTimeout(2500);
      
      // Skip the first criterion
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('next');
      await page.locator('[data-testid="chat-send"]').click();
      
      // Wait for transition
      await page.waitForTimeout(500);
      
      // Verify it moved to the next criterion (Measurable)
      const currentComponent = await page.locator('[data-testid="current-component"]').textContent();
      expect(currentComponent).toContain('Measurable');
    });

    test('should complete all criteria and show completion message', async ({ page }) => {
      await goalInputPage.submitGoal('Exercise regularly');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat to auto-start
      await page.waitForTimeout(2500);
      
      // Quickly go through all criteria
      const criteria = ['specific', 'measurable', 'achievable', 'relevant', 'time-bound'];
      const responses = [
        'Do cardio and strength training at the gym',
        '4 times per week, 45 minutes per session',
        'Yes, I have a gym membership and flexible schedule',
        'To improve my health and energy levels',
        'For the next 3 months, then reassess'
      ];
      
      for (let i = 0; i < criteria.length; i++) {
        // Wait for question about current criterion
        await page.waitForSelector('[data-testid="chat-message-bot"]:last-child', { timeout: 10000 });
        
        // Provide response
        const chatInput = page.locator('[data-testid="chat-input"]');
        await chatInput.fill(responses[i]);
        await page.locator('[data-testid="chat-send"]').click();
        
        // Wait for processing
        await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden', timeout: 10000 });
        await page.waitForTimeout(1000); // Allow time for state updates
      }
      
      // Verify completion message appears
      const completionMessage = await page.locator('[data-testid="chat-message-bot"]')
        .filter({ hasText: /excellent work|completed|finish/i })
        .first();
      await expect(completionMessage).toBeVisible({ timeout: 10000 });
      
      // Verify Complete Chat button appears
      const completeButton = page.locator('button:has-text("Complete Chat")');
      await expect(completeButton).toBeVisible();
    });
  });

  test.describe('Real-time Goal Updates', () => {
    test('should update goal criteria in real-time as user provides information', async ({ page }) => {
      await goalInputPage.submitGoal('Learn a new language');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat to auto-start
      await page.waitForTimeout(2500);
      
      // Get initial confidence for specific criterion
      const initialConfidence = await page.locator('[data-testid="confidence-specific"]').textContent();
      const initialScore = parseInt(initialConfidence?.replace('%', '') || '0');
      
      // Provide specific information
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Learn Spanish to conversational level B2');
      await page.locator('[data-testid="chat-send"]').click();
      
      // Wait for update
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      await page.waitForTimeout(1000);
      
      // Verify confidence increased
      const updatedConfidence = await page.locator('[data-testid="confidence-specific"]').textContent();
      const updatedScore = parseInt(updatedConfidence?.replace('%', '') || '0');
      
      expect(updatedScore).toBeGreaterThan(initialScore);
      
      // Verify specific criterion was updated
      const specificValue = await page.locator('[data-testid="criterion-specific-value"]').textContent();
      expect(specificValue).toContain('Spanish');
      expect(specificValue).toContain('B2');
    });

    test('should maintain conversation context across multiple refinements', async ({ page }) => {
      await goalInputPage.submitGoal('Save money');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat to auto-start
      await page.waitForTimeout(2500);
      
      // First refinement - specific
      let chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Save money for emergency fund');
      await page.locator('[data-testid="chat-send"]').click();
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      
      // Second refinement - measurable (should remember emergency fund context)
      await page.waitForTimeout(1000);
      await chatInput.fill('$10,000 total');
      await page.locator('[data-testid="chat-send"]').click();
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      
      // Verify both updates are reflected
      await page.waitForTimeout(1000);
      const goalTitle = await page.locator('[data-testid="smart-goal-title"]').textContent();
      expect(goalTitle).toContain('emergency fund');
      
      const measurableValue = await page.locator('[data-testid="criterion-measurable-value"]').textContent();
      expect(measurableValue).toContain('$10,000');
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle vague responses and request clarification', async ({ page }) => {
      await goalInputPage.submitGoal('Be better');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat to auto-start
      await page.waitForTimeout(2500);
      
      // Provide vague response
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Just better in general');
      await page.locator('[data-testid="chat-send"]').click();
      
      // Wait for AI response
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      
      // Verify AI asks for more clarification
      const followUpMessage = await page.locator('[data-testid="chat-message-bot"]').last().textContent();
      expect(followUpMessage?.toLowerCase()).toMatch(/more specific|clarify|example|what aspect/);
    });

    test('should handle API errors gracefully during chat', async ({ page }) => {
      await goalInputPage.submitGoal('Write a book');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat to auto-start
      await page.waitForTimeout(2500);
      
      // Mock API error for clarification endpoint
      await page.route('**/goals/*/clarify', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });
      
      // Try to provide input
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('A science fiction novel');
      await page.locator('[data-testid="chat-send"]').click();
      
      // Verify error message is shown
      await page.waitForTimeout(1000);
      const errorMessage = await page.locator('[data-testid="chat-message-bot"]')
        .filter({ hasText: /error|unavailable|try again/i })
        .first();
      await expect(errorMessage).toBeVisible();
    });

    test('should not lose progress if user navigates away and returns', async ({ page }) => {
      await goalInputPage.submitGoal('Start exercising');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat to auto-start and provide some input
      await page.waitForTimeout(2500);
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Join a gym and workout 3 times a week');
      await page.locator('[data-testid="chat-send"]').click();
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      
      // Store current state
      const goalData = await page.evaluate(() => localStorage.getItem('currentGoal'));
      expect(goalData).toBeTruthy();
      
      // Navigate away and return
      await page.goto('/about'); // Assuming there's an about page
      await page.goBack();
      
      // Verify state is preserved
      const restoredData = await page.evaluate(() => localStorage.getItem('currentGoal'));
      expect(restoredData).toEqual(goalData);
    });
  });

  test.describe('Accessibility and UX', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await goalInputPage.submitGoal('Improve typing speed');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat to auto-start
      await page.waitForTimeout(2500);
      
      // Tab to chat input
      await page.keyboard.press('Tab');
      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeFocused();
      
      // Type and submit with Enter
      await page.keyboard.type('Reach 80 words per minute');
      await page.keyboard.press('Enter');
      
      // Verify message was sent
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      const userMessage = await page.locator('[data-testid="chat-message-user"]').last().textContent();
      expect(userMessage).toContain('80 words per minute');
    });

    test('should show typing indicators when AI is processing', async ({ page }) => {
      await goalInputPage.submitGoal('Learn photography');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat to auto-start
      await page.waitForTimeout(2500);
      
      // Send a message
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Master portrait photography techniques');
      await page.locator('[data-testid="chat-send"]').click();
      
      // Verify typing indicator appears
      const typingIndicator = page.locator('[data-testid="chat-processing"]');
      await expect(typingIndicator).toBeVisible();
      
      // Verify it disappears after response
      await expect(typingIndicator).toBeHidden({ timeout: 10000 });
    });

    test('should auto-scroll to latest messages', async ({ page }) => {
      await goalInputPage.submitGoal('Read more');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for chat to auto-start
      await page.waitForTimeout(2500);
      
      // Send multiple messages to fill the chat
      const chatInput = page.locator('[data-testid="chat-input"]');
      const messages = [
        'Read 52 books this year',
        'next',
        'One book per week',
        'next',
        'Yes, I have time in the evenings'
      ];
      
      for (const message of messages) {
        await chatInput.fill(message);
        await page.locator('[data-testid="chat-send"]').click();
        await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
        await page.waitForTimeout(500);
      }
      
      // Verify last message is visible (auto-scrolled)
      const lastMessage = page.locator('[data-testid="chat-message-user"]').last();
      await expect(lastMessage).toBeInViewport();
    });
  });
});