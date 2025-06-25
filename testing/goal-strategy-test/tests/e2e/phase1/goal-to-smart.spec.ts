import { test, expect } from '@playwright/test';
import { ApiConfigPage } from '../page-objects/ApiConfigPage';
import { GoalInputPage } from '../page-objects/GoalInputPage';
import { SmartGoalPage } from '../page-objects/SmartGoalPage';
import { TestUtils } from '../fixtures/test-utils';
import { TEST_GOALS, getGoalsByComplexity, getGoalsByCategory } from '../fixtures/test-data';

test.describe('Phase 1: Goal to SMART Goal Conversion', () => {
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
  });

  test.describe('API Configuration', () => {
    test('should display API configuration form initially', async () => {
      await apiConfigPage.assertConfigurationVisible();
      await apiConfigPage.assertApiKeyRequired();
    });

    test('should successfully configure API with valid credentials', async () => {
      await apiConfigPage.configureApi('test-api-key-123', 'http://localhost:3001');
      await testUtils.waitForStepTransition(0, 1);
      await goalInputPage.assertFormVisible();
    });

    test('should show validation error for empty API key', async ({ page }) => {
      await apiConfigPage.fillApiUrl('http://localhost:3001');
      await apiConfigPage.clickSave();
      await apiConfigPage.assertValidationError('API key is required');
    });

    test('should test connection before saving', async () => {
      await apiConfigPage.fillApiKey('test-api-key');
      await apiConfigPage.fillApiUrl('http://localhost:3001');
      await apiConfigPage.clickTestConnection();
      
      // Mock successful connection test
      await testUtils.page.route('**/api/test-connection', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Connection successful' })
        });
      });
      
      await apiConfigPage.assertConnectionStatus('success');
    });
  });

  test.describe('Goal Input', () => {
    test.beforeEach(async () => {
      await testUtils.setupApiConfig();
    });

    test('should display goal input form after API configuration', async () => {
      await goalInputPage.assertFormVisible();
      await goalInputPage.assertGoalInputEmpty();
      await goalInputPage.assertSubmitButtonDisabled();
    });

    test('should enable submit button when goal is entered', async () => {
      await goalInputPage.enterGoal('Test goal input');
      await goalInputPage.assertSubmitButtonEnabled();
    });

    test('should show character count while typing', async () => {
      const testText = 'This is a test goal for character counting';
      await goalInputPage.enterGoal(testText);
      await goalInputPage.assertCharacterCount(testText.length);
    });

    test('should clear goal input when clear button is clicked', async () => {
      await goalInputPage.enterGoal('Test goal');
      await goalInputPage.clickClear();
      await goalInputPage.assertGoalInputEmpty();
    });

    test('should display example goals', async () => {
      await goalInputPage.assertExampleGoalsVisible();
      const exampleCount = await goalInputPage.getExampleGoalsCount();
      expect(exampleCount).toBeGreaterThan(0);
    });

    test('should populate input with selected example goal', async () => {
      await goalInputPage.selectExampleGoal(0);
      const inputValue = await goalInputPage.page.locator('[data-testid="goal-input-textarea"]').inputValue();
      expect(inputValue.length).toBeGreaterThan(0);
    });

    test('should validate minimum character requirement', async () => {
      await goalInputPage.enterGoal('hi');
      await goalInputPage.clickSubmit();
      await goalInputPage.assertMinimumCharacterValidation();
    });

    test('should validate maximum character limit', async () => {
      const longGoal = 'A'.repeat(2000); // Assuming 1000 char limit
      await goalInputPage.enterGoal(longGoal);
      await goalInputPage.assertMaximumCharacterValidation();
    });
  });

  test.describe('SMART Goal Generation - Simple Goals', () => {
    test.beforeEach(async () => {
      await testUtils.setupApiConfig();
    });

    const simpleGoals = getGoalsByComplexity('simple');

    simpleGoals.forEach((testGoal) => {
      test(`should convert simple goal: ${testGoal.id}`, async () => {
        await goalInputPage.submitGoal(testGoal.input);
        
        // Verify SMART goal display
        await smartGoalPage.assertSmartGoalDisplayed();
        await smartGoalPage.assertAllCriteriaPresent();
        
        // Verify confidence score meets minimum threshold
        await smartGoalPage.assertConfidenceScore(0.5);
        
        // Check for clarification questions if criteria are missing
        if (!Object.values(testGoal.expectedSMARTCriteria).every(Boolean)) {
          await smartGoalPage.assertClarificationQuestionsPresent();
        }
        
        await testUtils.takeScreenshotWithTimestamp(`smart-goal-${testGoal.id}`);
      });
    });
  });

  test.describe('SMART Goal Generation - Complex Goals', () => {
    test.beforeEach(async () => {
      await testUtils.setupApiConfig();
    });

    const complexGoals = getGoalsByComplexity('complex');

    complexGoals.forEach((testGoal) => {
      test(`should convert complex goal: ${testGoal.id}`, async () => {
        await goalInputPage.submitGoal(testGoal.input);
        
        // Verify SMART goal display
        await smartGoalPage.assertSmartGoalDisplayed();
        await smartGoalPage.assertAllCriteriaPresent();
        
        // Complex goals should have higher confidence
        await smartGoalPage.assertConfidenceScore(0.7);
        
        // Verify all SMART criteria for well-formed goals
        if (testGoal.expectedSMARTCriteria.specific) {
          await smartGoalPage.assertCriterionValue('specific', testGoal.input.substring(0, 50));
        }
        
        await testUtils.takeScreenshotWithTimestamp(`smart-goal-complex-${testGoal.id}`);
      });
    });
  });

  test.describe('SMART Goal Refinement', () => {
    test.beforeEach(async () => {
      await testUtils.setupApiConfig();
    });

    test('should allow goal refinement through chat interface', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      await goalInputPage.submitGoal(testGoal.input);
      
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Start refinement process
      await smartGoalPage.refineGoalWithChat('Make this goal more specific with exact numbers');
      
      // Verify chat interaction
      const messageCount = await smartGoalPage.getChatMessagesCount();
      expect(messageCount).toBeGreaterThanOrEqual(2); // User message + AI response
    });

    test('should update SMART criteria after refinement', async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'business-revenue-simple')!;
      await goalInputPage.submitGoal(testGoal.input);
      
      await smartGoalPage.assertSmartGoalDisplayed();
      await smartGoalPage.refineGoalWithChat('Set the target to increase revenue by 30% within 8 months');
      
      // Verify refinement was applied
      await smartGoalPage.assertRefinedGoalUpdated();
      await smartGoalPage.assertCriterionValue('timeBound', '8 months');
    });

    test('should maintain conversation context during refinement', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await goalInputPage.submitGoal(testGoal.input);
      
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Multiple refinement steps
      await smartGoalPage.sendChatMessage('Add more specific metrics');
      await smartGoalPage.assertChatResponseReceived();
      
      await smartGoalPage.sendChatMessage('What about the timeline?');
      await smartGoalPage.assertChatResponseReceived();
      
      const finalMessageCount = await smartGoalPage.getChatMessagesCount();
      expect(finalMessageCount).toBeGreaterThanOrEqual(4); // 2 user + 2 AI messages
    });
  });

  test.describe('Phase 1 Completion', () => {
    test.beforeEach(async () => {
      await testUtils.setupApiConfig();
    });

    test('should complete Phase 1 and advance to Phase 2', async () => {
      const testGoal = TEST_GOALS.find(g => g.expectedSMARTCriteria.specific)!;
      await goalInputPage.submitGoal(testGoal.input);
      
      await smartGoalPage.completeSmartGoalPhase();
      
      // Verify advancement to Phase 2 (Milestones)
      await testUtils.waitForStepTransition(2, 3);
      
      // Verify milestones page is displayed
      const milestonesDisplay = smartGoalPage.page.locator('[data-testid="milestones-display"]');
      await expect(milestonesDisplay).toBeVisible();
    });

    test('should maintain goal data throughout Phase 1', async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'business-revenue-smart')!;
      await goalInputPage.submitGoal(testGoal.input);
      
      await smartGoalPage.assertSmartGoalDisplayed();
      await smartGoalPage.assertSmartGoalTitle('revenue');
      
      // Continue to next phase
      await smartGoalPage.clickContinue();
      
      // Verify goal data is preserved
      const goalData = await testUtils.getLocalStorageItem('currentGoal');
      expect(goalData).toBeTruthy();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test.beforeEach(async () => {
      await testUtils.setupApiConfig();
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error
      await testUtils.mockApiError('/api/smart-goal', 500, 'Service temporarily unavailable');
      
      await goalInputPage.enterGoal('Test goal for error handling');
      await goalInputPage.clickSubmit();
      
      // Verify error handling
      const errorMessage = goalInputPage.page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Service temporarily unavailable');
    });

    test('should handle network timeout', async () => {
      // Simulate slow network
      await testUtils.simulateSlowNetwork();
      
      await goalInputPage.submitGoal('Test goal for network timeout');
      
      // Should show loading state
      const loadingSpinner = goalInputPage.page.locator('[data-testid="loading-spinner"]');
      await expect(loadingSpinner).toBeVisible();
      
      // Reset network conditions
      await testUtils.resetNetworkConditions();
    });

    test('should validate against malicious input', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'SELECT * FROM users;',
        '{{constructor.constructor("alert(1)")()}}',
        '../../../etc/passwd'
      ];

      for (const maliciousInput of maliciousInputs) {
        await goalInputPage.enterGoal(maliciousInput);
        await goalInputPage.clickSubmit();
        
        // Should handle malicious input safely
        await testUtils.assertNoErrors();
        
        // Clear input for next test
        await goalInputPage.clickClear();
      }
    });
  });

  test.describe('Performance Testing', () => {
    test.beforeEach(async () => {
      await testUtils.setupApiConfig();
    });

    test('should complete Phase 1 within performance thresholds', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      
      const startTime = Date.now();
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.assertSmartGoalDisplayed();
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Measure API response time
      await testUtils.assertApiResponseTime('/api/smart-goal', 5000);
    });

    test('should maintain responsive UI during processing', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      
      await goalInputPage.enterGoal(testGoal.input);
      await goalInputPage.clickSubmit();
      
      // UI should remain responsive
      const loadingSpinner = goalInputPage.page.locator('[data-testid="loading-spinner"]');
      await expect(loadingSpinner).toBeVisible();
      
      // Should be able to interact with other elements
      const resetButton = goalInputPage.page.locator('button:has-text("Start Over")');
      await expect(resetButton).toBeVisible();
      await expect(resetButton).toBeEnabled();
    });
  });
});