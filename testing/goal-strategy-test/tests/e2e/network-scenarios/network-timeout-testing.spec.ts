import { test, expect } from '@playwright/test';
import { ApiConfigPage } from '../page-objects/ApiConfigPage';
import { GoalInputPage } from '../page-objects/GoalInputPage';
import { SmartGoalPage } from '../page-objects/SmartGoalPage';
import { TestUtils } from '../fixtures/test-utils';
import { TEST_GOALS } from '../fixtures/test-data';

test.describe('Network Timeout and Condition Testing', () => {
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
    await testUtils.setupApiConfig();
  });

  test.describe('API Response Timeout Scenarios', () => {
    test('should handle 30-second API timeout', async () => {
      // Mock API with 30-second delay
      await testUtils.page.route('**/api/smart-goal', async route => {
        await testUtils.page.waitForTimeout(30000); // 30 seconds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'timeout-test', title: 'Delayed Response', confidence: 0.8 }
          })
        });
      });

      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      await goalInputPage.enterGoal(testGoal.input);
      await goalInputPage.clickSubmit();

      // Should show timeout message before 30 seconds
      const timeoutMessage = testUtils.page.locator('[data-testid="timeout-warning"]');
      await expect(timeoutMessage).toBeVisible({ timeout: 25000 });
      
      // Should offer cancel option
      const cancelButton = testUtils.page.locator('button:has-text("Cancel")');
      await expect(cancelButton).toBeVisible();
      
      await testUtils.takeScreenshotWithTimestamp('api-timeout-30s');
    });

    test('should handle progressive timeout warnings', async () => {
      let warningCount = 0;
      
      // Mock API with very long delay
      await testUtils.page.route('**/api/smart-goal', async route => {
        await testUtils.page.waitForTimeout(45000); // 45 seconds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'long-timeout-test', title: 'Very Delayed Response', confidence: 0.8 }
          })
        });
      });

      // Listen for timeout warnings
      testUtils.page.on('console', msg => {
        if (msg.text().includes('timeout warning')) {
          warningCount++;
        }
      });

      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await goalInputPage.enterGoal(testGoal.input);
      await goalInputPage.clickSubmit();

      // Should show first warning at 10 seconds
      await testUtils.page.waitForTimeout(10000);
      const firstWarning = testUtils.page.locator('[data-testid="timeout-warning-10s"]');
      await expect(firstWarning).toBeVisible();

      // Should show second warning at 20 seconds
      await testUtils.page.waitForTimeout(10000);
      const secondWarning = testUtils.page.locator('[data-testid="timeout-warning-20s"]');
      await expect(secondWarning).toBeVisible();

      // Cancel the request
      const cancelButton = testUtils.page.locator('button:has-text("Cancel")');
      await cancelButton.click();
      
      await testUtils.takeScreenshotWithTimestamp('progressive-timeout-warnings');
    });

    test('should handle timeout with retry mechanism', async () => {
      let attemptCount = 0;
      
      await testUtils.page.route('**/api/smart-goal', async route => {
        attemptCount++;
        
        if (attemptCount <= 2) {
          // Timeout first two attempts
          await testUtils.page.waitForTimeout(31000); // Force timeout
          await route.abort('timedout');
        } else {
          // Succeed on third attempt
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { 
                id: 'retry-success', 
                title: 'Goal converted after retry', 
                confidence: 0.85,
                criteria: {
                  specific: { value: 'Specific after retry', confidence: 0.85 },
                  measurable: { value: 'Measurable after retry', confidence: 0.85 },
                  achievable: { value: 'Achievable after retry', confidence: 0.85 },
                  relevant: { value: 'Relevant after retry', confidence: 0.85 },
                  timeBound: { value: 'Time-bound after retry', confidence: 0.85 }
                }
              }
            })
          });
        }
      });

      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      await goalInputPage.enterGoal(testGoal.input);
      await goalInputPage.clickSubmit();

      // Should show timeout for first attempt
      const timeoutMessage = testUtils.page.locator('[data-testid="timeout-message"]');
      await expect(timeoutMessage).toBeVisible({ timeout: 35000 });

      // Should show retry option
      const retryButton = testUtils.page.locator('button:has-text("Retry")');
      await expect(retryButton).toBeVisible();
      await retryButton.click();

      // Should eventually succeed
      await smartGoalPage.assertSmartGoalDisplayed();
      await expect(smartGoalPage.page.locator('[data-testid="smart-goal-title"]')).toContainText('Goal converted after retry');
      
      await testUtils.takeScreenshotWithTimestamp('timeout-retry-success');
    });
  });

  test.describe('Network Connection Quality Testing', () => {
    test('should handle 2G network conditions', async () => {
      // Simulate 2G network (very slow)
      await testUtils.simulateSlowNetwork({
        downloadThroughput: 50 * 1024,    // 50 kbps
        uploadThroughput: 20 * 1024,     // 20 kbps
        latency: 500                     // 500ms latency
      });

      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      await goalInputPage.enterGoal(testGoal.input);
      
      const startTime = Date.now();
      await goalInputPage.clickSubmit();

      // Should show slow connection warning
      const slowConnectionWarning = testUtils.page.locator('[data-testid="slow-connection-warning"]');
      await expect(slowConnectionWarning).toBeVisible({ timeout: 5000 });

      // Should offer low-bandwidth mode
      const lowBandwidthOption = testUtils.page.locator('button:has-text("Enable Low-Bandwidth Mode")');
      await expect(lowBandwidthOption).toBeVisible();

      await testUtils.resetNetworkConditions();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      await testUtils.takeScreenshotWithTimestamp('2g-network-handling');
      
      // Log performance metrics
      console.log(`2G network test duration: ${duration}ms`);
    });

    test('should handle 3G network conditions', async () => {
      // Simulate 3G network (moderate speed)
      await testUtils.simulateSlowNetwork({
        downloadThroughput: 1.5 * 1024 * 1024, // 1.5 Mbps
        uploadThroughput: 750 * 1024,          // 750 kbps
        latency: 150                           // 150ms latency
      });

      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await goalInputPage.enterGoal(testGoal.input);
      await goalInputPage.clickSubmit();

      // Should complete without showing slow connection warning
      await smartGoalPage.assertSmartGoalDisplayed();
      
      const slowConnectionWarning = testUtils.page.locator('[data-testid="slow-connection-warning"]');
      await expect(slowConnectionWarning).not.toBeVisible();

      await testUtils.resetNetworkConditions();
      await testUtils.takeScreenshotWithTimestamp('3g-network-handling');
    });

    test('should handle unstable network with packet loss', async () => {
      let requestCount = 0;
      const packetLossRate = 0.3; // 30% packet loss
      
      await testUtils.page.route('**/api/smart-goal', async route => {
        requestCount++;
        
        // Simulate packet loss
        if (Math.random() < packetLossRate) {
          await route.abort('connectionrefused');
          return;
        }
        
        // Add variable delay to simulate network instability
        const delay = Math.random() * 3000 + 1000; // 1-4 seconds
        await testUtils.page.waitForTimeout(delay);
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { 
              id: 'unstable-network-test', 
              title: 'Goal processed despite network issues', 
              confidence: 0.8,
              criteria: {
                specific: { value: 'Specific value', confidence: 0.8 },
                measurable: { value: 'Measurable value', confidence: 0.8 },
                achievable: { value: 'Achievable value', confidence: 0.8 },
                relevant: { value: 'Relevant value', confidence: 0.8 },
                timeBound: { value: 'Time-bound value', confidence: 0.8 }
              }
            }
          })
        });
      });

      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      await goalInputPage.enterGoal(testGoal.input);
      await goalInputPage.clickSubmit();

      // Should show network instability warning
      const networkIssueWarning = testUtils.page.locator('[data-testid="network-instability-warning"]');
      await expect(networkIssueWarning).toBeVisible({ timeout: 10000 });

      // Should eventually succeed with retries
      await smartGoalPage.assertSmartGoalDisplayed();
      
      await testUtils.takeScreenshotWithTimestamp('unstable-network-success');
      console.log(`Unstable network test completed after ${requestCount} requests`);
    });
  });

  test.describe('Concurrent User Load Testing', () => {
    test('should handle multiple simultaneous requests', async () => {
      const concurrentRequests = 5;
      let completedRequests = 0;
      
      // Mock API to track concurrent requests
      await testUtils.page.route('**/api/smart-goal', async route => {
        const delay = Math.random() * 2000 + 1000; // 1-3 seconds
        await testUtils.page.waitForTimeout(delay);
        
        completedRequests++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { 
              id: `concurrent-${completedRequests}`, 
              title: `Goal ${completedRequests}`, 
              confidence: 0.8 
            }
          })
        });
      });

      // Open multiple tabs/contexts to simulate concurrent users
      const contexts = [];
      for (let i = 0; i < concurrentRequests; i++) {
        const context = await testUtils.page.context().browser()!.newContext();
        const page = await context.newPage();
        contexts.push({ context, page });
        
        const localApiConfigPage = new ApiConfigPage(page);
        const localGoalInputPage = new GoalInputPage(page);
        const localTestUtils = new TestUtils(page);
        
        await page.goto('/');
        await localTestUtils.setupApiConfig();
        
        const testGoal = TEST_GOALS[i % TEST_GOALS.length];
        await localGoalInputPage.enterGoal(testGoal.input);
        await localGoalInputPage.clickSubmit();
      }

      // Wait for all requests to complete
      await testUtils.page.waitForTimeout(10000);
      
      // Clean up contexts
      for (const { context } of contexts) {
        await context.close();
      }
      
      await testUtils.takeScreenshotWithTimestamp('concurrent-load-test');
      console.log(`Concurrent load test: ${completedRequests}/${concurrentRequests} requests completed`);
    });
  });

  test.describe('Error Recovery Testing', () => {
    test('should recover from temporary network failures', async () => {
      let isNetworkDown = true;
      let requestAttempts = 0;
      
      await testUtils.page.route('**/api/smart-goal', async route => {
        requestAttempts++;
        
        if (isNetworkDown && requestAttempts <= 3) {
          await route.abort('connectionrefused');
          
          // Restore network after 3 failed attempts
          if (requestAttempts === 3) {
            setTimeout(() => {
              isNetworkDown = false;
            }, 2000);
          }
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { 
                id: 'recovery-test', 
                title: 'Goal processed after network recovery', 
                confidence: 0.85,
                criteria: {
                  specific: { value: 'Recovered specific', confidence: 0.85 },
                  measurable: { value: 'Recovered measurable', confidence: 0.85 },
                  achievable: { value: 'Recovered achievable', confidence: 0.85 },
                  relevant: { value: 'Recovered relevant', confidence: 0.85 },
                  timeBound: { value: 'Recovered time-bound', confidence: 0.85 }
                }
              }
            })
          });
        }
      });

      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await goalInputPage.enterGoal(testGoal.input);
      await goalInputPage.clickSubmit();

      // Should show network failure message
      const networkFailureMessage = testUtils.page.locator('[data-testid="network-failure-message"]');
      await expect(networkFailureMessage).toBeVisible({ timeout: 5000 });

      // Should show recovery message
      const recoveryMessage = testUtils.page.locator('[data-testid="network-recovery-message"]');
      await expect(recoveryMessage).toBeVisible({ timeout: 10000 });

      // Should eventually succeed
      await smartGoalPage.assertSmartGoalDisplayed();
      
      await testUtils.takeScreenshotWithTimestamp('network-recovery-success');
      console.log(`Network recovery test completed after ${requestAttempts} attempts`);
    });

    test('should handle graceful degradation during partial failures', async () => {
      // Mock API to return partial success
      await testUtils.page.route('**/api/smart-goal', async route => {
        await route.fulfill({
          status: 206, // Partial Content
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            partial: true,
            data: { 
              id: 'partial-success', 
              title: 'Partially processed goal', 
              confidence: 0.6,
              criteria: {
                specific: { value: 'Specific value', confidence: 0.8 },
                measurable: { value: 'Measurable value', confidence: 0.7 },
                achievable: null, // Missing due to partial failure
                relevant: { value: 'Relevant value', confidence: 0.8 },
                timeBound: null // Missing due to partial failure
              },
              missingCriteria: ['achievable', 'timeBound'],
              partialReason: 'AI service partially unavailable'
            }
          })
        });
      });

      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      await goalInputPage.enterGoal(testGoal.input);
      await goalInputPage.clickSubmit();

      // Should show partial success message
      const partialMessage = testUtils.page.locator('[data-testid="partial-success-message"]');
      await expect(partialMessage).toBeVisible();

      // Should show missing criteria
      const missingCriteria = testUtils.page.locator('[data-testid="missing-criteria"]');
      await expect(missingCriteria).toBeVisible();
      await expect(missingCriteria).toContainText('achievable');
      await expect(missingCriteria).toContainText('timeBound');

      // Should offer option to retry for missing criteria
      const retryMissingButton = testUtils.page.locator('button:has-text("Complete Missing Criteria")');
      await expect(retryMissingButton).toBeVisible();
      
      await testUtils.takeScreenshotWithTimestamp('partial-success-handling');
    });
  });

  test.describe('Performance Under Stress', () => {
    test('should maintain performance with large goal inputs', async () => {
      const largeGoal = `
        Our comprehensive business transformation initiative aims to revolutionize our market position 
        through strategic expansion, technological innovation, and operational excellence. This multi-faceted 
        approach will encompass digital transformation, customer experience enhancement, supply chain 
        optimization, talent acquisition and development, sustainability initiatives, and financial 
        restructuring. We plan to achieve this through systematic implementation of best practices, 
        adoption of cutting-edge technologies, establishment of strategic partnerships, and continuous 
        monitoring of key performance indicators. The expected outcomes include increased market share, 
        improved customer satisfaction, enhanced operational efficiency, reduced costs, and sustainable 
        long-term growth. Success will be measured through various metrics including revenue growth, 
        customer retention rates, employee satisfaction scores, operational efficiency ratios, and 
        environmental impact assessments.
      `.trim();

      const startTime = Date.now();
      await goalInputPage.enterGoal(largeGoal);
      await goalInputPage.clickSubmit();

      // Should handle large input without performance degradation
      await smartGoalPage.assertSmartGoalDisplayed();
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should complete within reasonable time (< 15 seconds)
      expect(processingTime).toBeLessThan(15000);
      
      await testUtils.takeScreenshotWithTimestamp('large-input-performance');
      console.log(`Large input processing time: ${processingTime}ms`);
    });

    test('should handle rapid successive requests', async () => {
      const rapidRequests = 10;
      let completedRequests = 0;
      
      await testUtils.page.route('**/api/smart-goal', async route => {
        completedRequests++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { 
              id: `rapid-${completedRequests}`, 
              title: `Rapid request ${completedRequests}`, 
              confidence: 0.8 
            }
          })
        });
      });

      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      
      // Make rapid successive requests
      for (let i = 0; i < rapidRequests; i++) {
        await goalInputPage.enterGoal(`${testGoal.input} - Request ${i + 1}`);
        await goalInputPage.clickSubmit();
        
        // Brief delay between requests
        await testUtils.page.waitForTimeout(100);
        
        // Clear for next request
        await goalInputPage.clickClear();
      }

      await testUtils.page.waitForTimeout(5000);
      
      await testUtils.takeScreenshotWithTimestamp('rapid-successive-requests');
      console.log(`Rapid requests test: ${completedRequests}/${rapidRequests} completed`);
    });
  });
});