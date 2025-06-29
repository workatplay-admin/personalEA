import { test, expect } from '@playwright/test';
import { ApiConfigPage } from './page-objects/ApiConfigPage';
import { GoalInputPage } from './page-objects/GoalInputPage';
import { SmartGoalPage } from './page-objects/SmartGoalPage';
import { TestUtils } from './fixtures/test-utils';

test.describe('Transform to SMART Goal Button - Complete User Flow', () => {
  let apiConfigPage: ApiConfigPage;
  let goalInputPage: GoalInputPage;
  let smartGoalPage: SmartGoalPage;
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    apiConfigPage = new ApiConfigPage(page);
    goalInputPage = new GoalInputPage(page);
    smartGoalPage = new SmartGoalPage(page);
    testUtils = new TestUtils(page);

    await page.goto('/');
  });

  test.describe('Happy Path - Successful Goal Transformation', () => {
    test('should successfully transform a goal when clicking Transform button', async ({ page }) => {
      // Step 1: Configure API
      await apiConfigPage.configureApi('sk-test-valid-key-123', 'http://localhost:8085');
      await testUtils.waitForStepTransition(0, 1);
      
      // Step 2: Enter a goal
      const testGoal = 'I want to increase my company revenue by 25% in the next 6 months';
      await goalInputPage.enterGoal(testGoal);
      
      // Verify button is enabled
      const transformButton = page.locator('button:has-text("Transform to SMART Goal")');
      await expect(transformButton).toBeEnabled();
      
      // Step 3: Click Transform button
      console.log('Clicking Transform to SMART Goal button...');
      await transformButton.click();
      
      // Verify loading state
      await expect(transformButton).toBeDisabled();
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Step 4: Verify successful transformation
      await smartGoalPage.assertSmartGoalDisplayed();
      await smartGoalPage.assertAllCriteriaPresent();
      
      // Verify the goal was transformed correctly
      await expect(page.locator('[data-testid="smart-goal-title"]')).toContainText('revenue');
      
      await testUtils.takeScreenshotWithTimestamp('successful-transformation');
    });

    test('should handle multiple transformations in sequence', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      const goals = [
        'Learn Spanish fluently',
        'Start a successful blog',
        'Run a marathon'
      ];
      
      for (const goal of goals) {
        await goalInputPage.enterGoal(goal);
        await goalInputPage.clickSubmit();
        await smartGoalPage.assertSmartGoalDisplayed();
        
        // Go back to enter another goal
        const newGoalButton = page.locator('button:has-text("Enter New Goal")');
        if (await newGoalButton.isVisible()) {
          await newGoalButton.click();
        }
      }
    });
  });

  test.describe('Network Error Scenarios', () => {
    test('should handle network timeout gracefully', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      // Mock API to timeout
      await page.route('**/api/v1/goals/translate*', async route => {
        // Never respond to simulate timeout
        await new Promise(() => {});
      });
      
      await goalInputPage.enterGoal('Test goal for timeout');
      await goalInputPage.clickSubmit();
      
      // Should show timeout error after 30 seconds
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 35000 });
      await expect(errorMessage).toContainText(/timeout|timed out/i);
      
      // Transform button should be re-enabled
      const transformButton = page.locator('button:has-text("Transform to SMART Goal")');
      await expect(transformButton).toBeEnabled();
    });

    test('should handle complete network failure', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      // Simulate network failure
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.abort('connectionrefused');
      });
      
      await goalInputPage.enterGoal('Test goal for network failure');
      await goalInputPage.clickSubmit();
      
      // Should show network error quickly
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      await expect(errorMessage).toContainText(/network|connection|connect/i);
      
      // Verify retry option is available
      const retryButton = page.locator('button:has-text("Retry")');
      await expect(retryButton).toBeVisible();
    });

    test('should handle 401 unauthorized error', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid or unauthorized API key'
          })
        });
      });
      
      await goalInputPage.enterGoal('Test goal for auth error');
      await goalInputPage.clickSubmit();
      
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/API key|unauthorized|invalid/i);
      
      // Should offer to reconfigure API
      const reconfigureButton = page.locator('button:has-text("Reconfigure")');
      await expect(reconfigureButton).toBeVisible();
    });

    test('should handle 429 rate limit error with retry after', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Retry-After': '60'
          },
          body: JSON.stringify({
            success: false,
            error: 'Rate limit exceeded',
            retryAfter: 60
          })
        });
      });
      
      await goalInputPage.enterGoal('Test goal for rate limit');
      await goalInputPage.clickSubmit();
      
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/rate limit/i);
      
      // Should show retry timer
      const retryTimer = page.locator('[data-testid="retry-timer"]');
      await expect(retryTimer).toBeVisible();
    });

    test('should handle 500 server error', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error',
            correlation_id: 'error-12345'
          })
        });
      });
      
      await goalInputPage.enterGoal('Test goal for server error');
      await goalInputPage.clickSubmit();
      
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/server error/i);
      
      // Should show correlation ID for support
      const correlationId = page.locator('[data-testid="correlation-id"]');
      await expect(correlationId).toContainText('error-12345');
    });

    test('should handle 502/503 service unavailable', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Service temporarily unavailable'
          })
        });
      });
      
      await goalInputPage.enterGoal('Test goal for service unavailable');
      await goalInputPage.clickSubmit();
      
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/service.*unavailable/i);
    });
  });

  test.describe('Transform Button State Management', () => {
    test('should disable button while processing', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      // Add delay to response to test button state
      await page.route('**/api/v1/goals/translate*', async route => {
        await page.waitForTimeout(2000);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-123',
              title: 'Test Goal',
              confidence: 0.8
            }
          })
        });
      });
      
      await goalInputPage.enterGoal('Test goal for button state');
      
      const transformButton = page.locator('button:has-text("Transform to SMART Goal")');
      await expect(transformButton).toBeEnabled();
      
      // Click and verify it becomes disabled
      await transformButton.click();
      await expect(transformButton).toBeDisabled();
      
      // Should show loading text
      await expect(transformButton).toContainText(/processing|loading|transforming/i);
    });

    test('should prevent double-clicking', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      let requestCount = 0;
      await page.route('**/api/v1/goals/translate*', async route => {
        requestCount++;
        await page.waitForTimeout(1000);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'test', title: 'Test Goal', confidence: 0.8 }
          })
        });
      });
      
      await goalInputPage.enterGoal('Test goal for double click');
      
      const transformButton = page.locator('button:has-text("Transform to SMART Goal")');
      
      // Try to click multiple times quickly
      await transformButton.click();
      await transformButton.click({ force: true });
      await transformButton.click({ force: true });
      
      // Wait for request to complete
      await page.waitForTimeout(2000);
      
      // Should only make one request
      expect(requestCount).toBe(1);
    });

    test('should reset button state after error', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Test error' })
        });
      });
      
      await goalInputPage.enterGoal('Test goal for error reset');
      
      const transformButton = page.locator('button:has-text("Transform to SMART Goal")');
      await transformButton.click();
      
      // Wait for error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Button should be re-enabled
      await expect(transformButton).toBeEnabled();
      await expect(transformButton).toContainText('Transform to SMART Goal');
    });
  });

  test.describe('Edge Cases and Validation', () => {
    test('should handle empty goal gracefully', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      // Try to submit without entering a goal
      const transformButton = page.locator('button:has-text("Transform to SMART Goal")');
      await expect(transformButton).toBeDisabled();
      
      // Enter whitespace only
      await goalInputPage.enterGoal('   ');
      await expect(transformButton).toBeDisabled();
    });

    test('should handle very long goals', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      const longGoal = 'A'.repeat(5000);
      await goalInputPage.enterGoal(longGoal);
      
      // Should show validation error or truncate
      const validationError = page.locator('[data-testid="validation-error"]');
      const isErrorVisible = await validationError.isVisible().catch(() => false);
      
      if (isErrorVisible) {
        await expect(validationError).toContainText(/too long|maximum/i);
      } else {
        // Should be able to submit if truncated
        await goalInputPage.clickSubmit();
      }
    });

    test('should handle special characters in goal', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      const specialGoals = [
        'Increase revenue by 25% & improve customer satisfaction',
        'Learn "advanced" JavaScript concepts',
        'Goal with <special> characters & symbols!',
        'Multi-line\ngoal\nwith\nbreaks'
      ];
      
      for (const goal of specialGoals) {
        await goalInputPage.enterGoal(goal);
        await goalInputPage.clickSubmit();
        
        // Should handle without errors
        await testUtils.assertNoErrors();
        
        // Clear for next test
        await goalInputPage.clickClear();
      }
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should complete transformation within acceptable time', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      const startTime = Date.now();
      
      await goalInputPage.enterGoal('Improve team productivity by 30%');
      await goalInputPage.clickSubmit();
      
      await smartGoalPage.assertSmartGoalDisplayed();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
      console.log(`Goal transformation completed in ${duration}ms`);
    });

    test('should remain responsive during API call', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      // Add delay to test responsiveness
      await page.route('**/api/v1/goals/translate*', async route => {
        await page.waitForTimeout(3000);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'test', title: 'Test Goal', confidence: 0.8 }
          })
        });
      });
      
      await goalInputPage.enterGoal('Test responsiveness');
      await goalInputPage.clickSubmit();
      
      // UI should remain interactive
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await expect(cancelButton).toBeEnabled();
      }
      
      // Should be able to interact with other elements
      const helpButton = page.locator('button[aria-label="Help"]');
      if (await helpButton.isVisible()) {
        await expect(helpButton).toBeEnabled();
      }
    });
  });

  test.describe('User Feedback and Error Recovery', () => {
    test('should provide clear feedback during processing', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      // Add delay to observe feedback
      await page.route('**/api/v1/goals/translate*', async route => {
        await page.waitForTimeout(2000);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'test', title: 'Test Goal', confidence: 0.8 }
          })
        });
      });
      
      await goalInputPage.enterGoal('Monitor user feedback');
      await goalInputPage.clickSubmit();
      
      // Should show processing indicator
      const processingIndicators = [
        page.locator('[data-testid="loading-spinner"]'),
        page.locator('text=/processing|transforming|analyzing/i'),
        page.locator('[role="status"]')
      ];
      
      let feedbackVisible = false;
      for (const indicator of processingIndicators) {
        if (await indicator.isVisible().catch(() => false)) {
          feedbackVisible = true;
          break;
        }
      }
      
      expect(feedbackVisible).toBeTruthy();
    });

    test('should allow retry after network error', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      let shouldFail = true;
      await page.route('**/api/v1/goals/translate*', async route => {
        if (shouldFail) {
          shouldFail = false;
          await route.abort('connectionrefused');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'retry-success',
                title: 'Successfully retried',
                confidence: 0.8
              }
            })
          });
        }
      });
      
      await goalInputPage.enterGoal('Test retry functionality');
      await goalInputPage.clickSubmit();
      
      // Wait for error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Click retry
      const retryButton = page.locator('button:has-text("Retry")');
      await retryButton.click();
      
      // Should succeed on retry
      await smartGoalPage.assertSmartGoalDisplayed();
      await expect(page.locator('[data-testid="smart-goal-title"]')).toContainText('Successfully retried');
    });

    test('should preserve goal text after error', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      const originalGoal = 'Preserve this goal text after error';
      
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Server error' })
        });
      });
      
      await goalInputPage.enterGoal(originalGoal);
      await goalInputPage.clickSubmit();
      
      // Wait for error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Goal text should still be in the input
      const goalInput = page.locator('[data-testid="goal-input-textarea"]');
      await expect(goalInput).toHaveValue(originalGoal);
    });
  });
});
