import { test, expect } from '@playwright/test';
import { ApiConfigPage } from './page-objects/ApiConfigPage';
import { GoalInputPage } from './page-objects/GoalInputPage';
import { SmartGoalPage } from './page-objects/SmartGoalPage';
import { TestUtils } from './fixtures/test-utils';

test.describe('ChatClarification Component', () => {
  let apiConfigPage: ApiConfigPage;
  let goalInputPage: GoalInputPage;
  let smartGoalPage: SmartGoalPage;
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    apiConfigPage = new ApiConfigPage(page);
    goalInputPage = new GoalInputPage(page);
    smartGoalPage = new SmartGoalPage(page);
    testUtils = new TestUtils(page);

    await testUtils.setupMockAPI();
    await page.goto('/');
    await testUtils.setupApiConfig();
  });

  test.describe('Component Initialization', () => {
    test('should auto-start conversation after displaying welcome message', async ({ page }) => {
      await goalInputPage.submitGoal('Become healthier');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Verify chat interface is visible
      const chatInterface = page.locator('[data-testid="chat-clarification"]');
      await expect(chatInterface).toBeVisible();
      
      // Verify welcome message appears
      await page.waitForSelector('[data-testid="chat-message-bot"]', { timeout: 5000 });
      const welcomeMessage = page.locator('[data-testid="chat-message-bot"]').first();
      await expect(welcomeMessage).toContainText('SMART Goal Refinement Assistant');
      
      // Verify auto-start happens (second bot message with first component)
      await page.waitForSelector('[data-testid="chat-message-bot"]:nth-child(2)', { timeout: 5000 });
      const firstComponentMessage = page.locator('[data-testid="chat-message-bot"]').nth(1);
      await expect(firstComponentMessage).toBeVisible();
    });

    test('should display current component in header', async ({ page }) => {
      await goalInputPage.submitGoal('Learn programming');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      // Check header shows current component
      const componentIndicator = page.locator('[data-testid="current-component"]');
      await expect(componentIndicator).toContainText('Specific');
      
      // Move to next component
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Learn Python for web development');
      await page.locator('[data-testid="chat-send"]').click();
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      
      // Component should update after processing
      await page.waitForTimeout(1000);
      await expect(componentIndicator).not.toContainText('Specific');
    });
  });

  test.describe('SMART Component Navigation', () => {
    test('should iterate through all SMART components in order', async ({ page }) => {
      await goalInputPage.submitGoal('Start a blog');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      const expectedComponents = ['Specific', 'Measurable', 'Achievable', 'Relevant', 'Time-bound'];
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      for (let i = 0; i < expectedComponents.length; i++) {
        // Verify current component
        const currentComponent = await page.locator('[data-testid="current-component"]').textContent();
        expect(currentComponent).toContain(expectedComponents[i]);
        
        // Provide input and move to next
        await chatInput.fill(`Test input for ${expectedComponents[i]}`);
        await page.locator('[data-testid="chat-send"]').click();
        await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
        await page.waitForTimeout(1000);
      }
      
      // After all components, should show completion message
      const completionMessage = await page.locator('[data-testid="chat-message-bot"]')
        .filter({ hasText: /excellent work|completed/i })
        .first();
      await expect(completionMessage).toBeVisible();
    });

    test('should handle component questions for high-confidence criteria differently', async ({ page }) => {
      // Create a goal with high confidence in some criteria
      await page.route('**/goals/translate', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal-123',
              title: 'Lose 10 pounds in 3 months',
              description: 'Weight loss goal with specific target',
              criteria: {
                specific: { value: 'Lose 10 pounds of body weight', confidence: 0.9 },
                measurable: { value: '10 pounds weight loss', confidence: 0.85, metrics: ['pounds'] },
                achievable: { value: 'Realistic with diet and exercise', confidence: 0.8 },
                relevant: { value: 'For health improvement', confidence: 0.6 },
                timeBound: { value: '3 months timeframe', confidence: 0.9 }
              },
              confidence: 0.8,
              status: 'active'
            }
          })
        });
      });
      
      await goalInputPage.submitGoal('Lose 10 pounds in 3 months');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      // Mock the component question API to verify it's called with high confidence flag
      let highConfidenceQuestions = 0;
      await page.route('**/goals/component-question', async route => {
        const request = route.request();
        const data = await request.postDataJSON();
        
        if (data.isHighConfidence) {
          highConfidenceQuestions++;
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              question: data.isHighConfidence 
                ? `Your ${data.componentKey} criterion looks good. Would you like to refine it further?`
                : `Tell me more about the ${data.componentKey} aspect of your goal.`
            }
          })
        });
      });
      
      // Go through components
      const chatInput = page.locator('[data-testid="chat-input"]');
      for (let i = 0; i < 3; i++) {
        await chatInput.fill('next');
        await page.locator('[data-testid="chat-send"]').click();
        await page.waitForTimeout(1000);
      }
      
      // Verify high confidence components received appropriate questions
      expect(highConfidenceQuestions).toBeGreaterThan(0);
    });
  });

  test.describe('User Input Handling', () => {
    test('should process "I don\'t know" with contextual help', async ({ page }) => {
      await goalInputPage.submitGoal('Get fit');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      // Mock contextual help endpoint
      await page.route('**/goals/contextual-help', async route => {
        const request = route.request();
        const data = await request.postDataJSON();
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              helpMessage: `For the ${data.componentKey} aspect, consider: What specific fitness activities interest you? Examples: running, weightlifting, yoga, swimming.`
            }
          })
        });
      });
      
      // Send "I don't know"
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill("I don't know");
      await page.locator('[data-testid="chat-send"]').click();
      
      // Wait for help response
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      
      // Verify contextual help is displayed
      const helpMessage = await page.locator('[data-testid="chat-message-bot"]').last().textContent();
      expect(helpMessage).toContain('consider');
      expect(helpMessage).toContain('Examples');
    });

    test('should handle empty input gracefully', async ({ page }) => {
      await goalInputPage.submitGoal('Study more');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      // Try to send empty message
      const sendButton = page.locator('[data-testid="chat-send"]');
      await sendButton.click();
      
      // Verify button is disabled for empty input
      const chatInput = page.locator('[data-testid="chat-input"]');
      const inputValue = await chatInput.inputValue();
      expect(inputValue).toBe('');
      
      // Send button should be disabled
      await expect(sendButton).toBeDisabled();
    });

    test('should handle "next" and "done" navigation commands', async ({ page }) => {
      await goalInputPage.submitGoal('Write more');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Test "next" command
      await chatInput.fill('next');
      await page.locator('[data-testid="chat-send"]').click();
      await page.waitForTimeout(1000);
      
      // Should move to Measurable
      let currentComponent = await page.locator('[data-testid="current-component"]').textContent();
      expect(currentComponent).toContain('Measurable');
      
      // Test "done" command
      await chatInput.fill('done');
      await page.locator('[data-testid="chat-send"]').click();
      await page.waitForTimeout(1000);
      
      // Should show completion message
      const completionMessage = await page.locator('[data-testid="chat-message-bot"]')
        .filter({ hasText: /excellent work|completed/i })
        .first();
      await expect(completionMessage).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update goal criteria immediately after user input', async ({ page }) => {
      await goalInputPage.submitGoal('Build muscle');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      // Mock clarify endpoint to return updated goal
      await page.route('**/goals/*/clarify', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal-123',
              title: 'Build muscle',
              criteria: {
                specific: { value: 'Gain 10 pounds of lean muscle mass', confidence: 0.9 },
                measurable: { value: '10 pounds muscle gain', confidence: 0.85, metrics: ['pounds'] },
                achievable: { value: 'With proper training and nutrition', confidence: 0.7 },
                relevant: { value: 'For strength and health', confidence: 0.6 },
                timeBound: { value: 'Within timeframe', confidence: 0.4 }
              },
              confidence: 0.7
            },
            message: 'Great! I\'ve updated your goal to be more specific about muscle gain.'
          })
        });
      });
      
      // Provide specific input
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Gain 10 pounds of lean muscle mass');
      await page.locator('[data-testid="chat-send"]').click();
      
      // Wait for update
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      await page.waitForTimeout(1000);
      
      // Verify goal was updated
      const specificValue = await page.locator('[data-testid="criterion-specific-value"]').textContent();
      expect(specificValue).toContain('10 pounds');
      expect(specificValue).toContain('muscle');
    });

    test('should maintain clarifications across component transitions', async ({ page }) => {
      await goalInputPage.submitGoal('Travel more');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Provide input for multiple components
      const inputs = [
        'Visit 5 new countries in Europe',
        '5 countries, spending at least 1 week in each',
        'Yes, I have savings and can work remotely'
      ];
      
      for (const input of inputs) {
        await chatInput.fill(input);
        await page.locator('[data-testid="chat-send"]').click();
        await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
        await page.waitForTimeout(1000);
      }
      
      // Verify all clarifications are reflected in the goal
      const goalText = await page.locator('[data-testid="smart-goal-display"]').textContent();
      expect(goalText).toContain('5');
      expect(goalText).toContain('Europe');
      expect(goalText).toContain('countries');
    });
  });

  test.describe('Error Handling', () => {
    test('should show error message when API fails', async ({ page }) => {
      await goalInputPage.submitGoal('Start investing');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      // Mock API failure
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
      
      // Try to send input
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Invest in index funds');
      await page.locator('[data-testid="chat-send"]').click();
      
      // Wait for error message
      await page.waitForTimeout(1000);
      const errorMessage = await page.locator('[data-testid="chat-message-bot"]')
        .filter({ hasText: /error|unavailable/i })
        .first();
      await expect(errorMessage).toBeVisible();
    });

    test('should handle timeout errors gracefully', async ({ page }) => {
      await goalInputPage.submitGoal('Learn cooking');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      // Mock timeout
      await page.route('**/goals/*/clarify', async route => {
        await new Promise(resolve => setTimeout(resolve, 35000)); // Exceed timeout
      });
      
      // Try to send input
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Master Italian cuisine');
      await page.locator('[data-testid="chat-send"]').click();
      
      // Should show timeout error
      const errorMessage = await page.waitForSelector('[data-testid="chat-message-bot"]:has-text("timeout")', {
        timeout: 40000
      });
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('UI/UX Features', () => {
    test('should show typing indicator while processing', async ({ page }) => {
      await goalInputPage.submitGoal('Organize life');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      // Send message
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Implement GTD system');
      await page.locator('[data-testid="chat-send"]').click();
      
      // Verify typing indicator
      const typingIndicator = page.locator('.animate-bounce').first();
      await expect(typingIndicator).toBeVisible();
      
      // Should disappear after response
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      await expect(typingIndicator).not.toBeVisible();
    });

    test('should disable input while processing', async ({ page }) => {
      await goalInputPage.submitGoal('Reduce stress');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      // Send message
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Practice meditation daily');
      await page.locator('[data-testid="chat-send"]').click();
      
      // Input should be disabled during processing
      await expect(chatInput).toBeDisabled();
      
      // Should be enabled after processing
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      await expect(chatInput).toBeEnabled();
    });

    test('should show Complete Chat button after all components', async ({ page }) => {
      await goalInputPage.submitGoal('Sleep better');
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Wait for auto-start
      await page.waitForTimeout(2500);
      
      // Quickly complete all components
      const chatInput = page.locator('[data-testid="chat-input"]');
      for (let i = 0; i < 5; i++) {
        await chatInput.fill('done');
        await page.locator('[data-testid="chat-send"]').click();
        await page.waitForTimeout(500);
      }
      
      // Complete button should appear
      const completeButton = page.locator('button:has-text("Complete Chat")');
      await expect(completeButton).toBeVisible();
      
      // Clicking it should trigger completion
      await completeButton.click();
      
      // Should move to next phase
      await testUtils.waitForStepTransition(2, 3);
    });
  });
});