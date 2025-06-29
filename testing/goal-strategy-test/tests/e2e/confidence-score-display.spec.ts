import { test, expect } from '@playwright/test';

test.describe('Confidence Score Display E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Initial Goal Display', () => {
    test('should display confidence scores as percentages, not decimals', async ({ page }) => {
      // Setup API with test key
      await page.fill('[data-testid="api-key-input"]', 'test-key');
      await page.fill('[data-testid="api-endpoint-input"]', 'http://localhost:8085');
      await page.click('button:has-text("Configure API")');

      // Enter a goal
      await page.fill('[data-testid="goal-input-textarea"]', 'Learn React in 3 months');
      await page.click('button:has-text("Transform to SMART Goal")');

      // Wait for the chat clarification to appear
      await page.waitForSelector('.bg-gradient-to-r.from-indigo-500.to-purple-600');

      // Check the welcome message for proper percentage display
      const welcomeMessage = await page.locator('.whitespace-pre-wrap').first();
      const welcomeText = await welcomeMessage.textContent();

      // Verify percentages are displayed correctly
      expect(welcomeText).toMatch(/\d+% confident/);
      expect(welcomeText).not.toMatch(/0\.\d+ confident/);
      
      // Check for specific percentage patterns
      const percentageMatches = welcomeText?.match(/(\d+)% confident/g) || [];
      expect(percentageMatches.length).toBeGreaterThan(0);
      
      // All matches should be integer percentages
      percentageMatches.forEach(match => {
        expect(match).toMatch(/^\d+% confident$/);
      });
    });

    test('should display 0% confidence correctly', async ({ page }) => {
      // Mock API response with 0 confidence
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal',
              title: 'Test Goal',
              criteria: {
                specific: { value: '', confidence: 0 },
                measurable: { value: '', confidence: 0 },
                achievable: { value: '', confidence: 0 },
                relevant: { value: '', confidence: 0 },
                timeBound: { value: '', confidence: 0 }
              },
              confidence: 0
            }
          })
        });
      });

      await page.fill('[data-testid="api-key-input"]', 'test-key');
      await page.fill('[data-testid="api-endpoint-input"]', 'http://localhost:8085');
      await page.click('button:has-text("Configure API")');

      await page.fill('[data-testid="goal-input-textarea"]', 'Test goal');
      await page.click('button:has-text("Transform to SMART Goal")');

      await page.waitForSelector('.whitespace-pre-wrap');
      const welcomeText = await page.locator('.whitespace-pre-wrap').first().textContent();

      // Should show 0% not 0
      expect(welcomeText).toContain('0% confident');
      expect(welcomeText).not.toContain('0 confident');
    });

    test('should display 100% confidence correctly', async ({ page }) => {
      // Mock API response with 100% confidence
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal',
              title: 'Perfect Goal',
              criteria: {
                specific: { value: 'Perfect', confidence: 1 },
                measurable: { value: 'Perfect', confidence: 1 },
                achievable: { value: 'Perfect', confidence: 1 },
                relevant: { value: 'Perfect', confidence: 1 },
                timeBound: { value: 'Perfect', confidence: 1 }
              },
              confidence: 1
            }
          })
        });
      });

      await page.fill('[data-testid="api-key-input"]', 'test-key');
      await page.fill('[data-testid="api-endpoint-input"]', 'http://localhost:8085');
      await page.click('button:has-text("Configure API")');

      await page.fill('[data-testid="goal-input-textarea"]', 'Perfect goal');
      await page.click('button:has-text("Transform to SMART Goal")');

      await page.waitForSelector('.whitespace-pre-wrap');
      const welcomeText = await page.locator('.whitespace-pre-wrap').first().textContent();

      // Should show 100% not 1
      expect(welcomeText).toContain('100% confident');
      expect(welcomeText).not.toContain('1 confident');
      expect(welcomeText).not.toContain('1.0 confident');
    });
  });

  test.describe('Component Introduction Messages', () => {
    test('should display current component score as percentage', async ({ page }) => {
      // Mock API response with specific confidence values
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal',
              title: 'Learn Programming',
              criteria: {
                specific: { value: 'Learn React', confidence: 0.2 },
                measurable: { value: '', confidence: 0.05 },
                achievable: { value: '', confidence: 0.5 },
                relevant: { value: '', confidence: 0.95 },
                timeBound: { value: '', confidence: 0.15 }
              },
              confidence: 0.37
            }
          })
        });
      });

      await page.fill('[data-testid="api-key-input"]', 'test-key');
      await page.fill('[data-testid="api-endpoint-input"]', 'http://localhost:8085');
      await page.click('button:has-text("Configure API")');

      await page.fill('[data-testid="goal-input-textarea"]', 'Learn programming');
      await page.click('button:has-text("Transform to SMART Goal")');

      // Wait for component introduction
      await page.waitForSelector('text=/Your current .* score is \\d+%/');
      
      const introMessages = await page.locator('text=/Your current .* score is/').all();
      
      for (const message of introMessages) {
        const text = await message.textContent();
        // Should show percentage format like "20%" not "0.2"
        expect(text).toMatch(/Your current .* score is \d+%/);
        expect(text).not.toMatch(/Your current .* score is 0\.\d+/);
      }
    });

    test('should show 5% for 0.05 confidence', async ({ page }) => {
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal',
              title: 'Test Goal',
              criteria: {
                specific: { value: '', confidence: 0.05 },
                measurable: { value: '', confidence: 0.05 },
                achievable: { value: '', confidence: 0.05 },
                relevant: { value: '', confidence: 0.05 },
                timeBound: { value: '', confidence: 0.05 }
              },
              confidence: 0.05
            }
          })
        });
      });

      await page.fill('[data-testid="api-key-input"]', 'test-key');
      await page.fill('[data-testid="api-endpoint-input"]', 'http://localhost:8085');
      await page.click('button:has-text("Configure API")');

      await page.fill('[data-testid="goal-input-textarea"]', 'Test goal');
      await page.click('button:has-text("Transform to SMART Goal")');

      await page.waitForSelector('.whitespace-pre-wrap');
      const content = await page.locator('body').textContent();

      // Should show 5% not 0.05
      expect(content).toContain('5%');
      expect(content).not.toContain('0.05');
    });
  });

  test.describe('Progress Indicators', () => {
    test('should show percentage in tooltip on hover', async ({ page }) => {
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal',
              title: 'Test Goal',
              criteria: {
                specific: { value: 'Test', confidence: 0.75 },
                measurable: { value: 'Test', confidence: 0.25 },
                achievable: { value: 'Test', confidence: 0.91 },
                relevant: { value: 'Test', confidence: 0.5 },
                timeBound: { value: 'Test', confidence: 0.99 }
              },
              confidence: 0.68
            }
          })
        });
      });

      await page.fill('[data-testid="api-key-input"]', 'test-key');
      await page.fill('[data-testid="api-endpoint-input"]', 'http://localhost:8085');
      await page.click('button:has-text("Configure API")');

      await page.fill('[data-testid="goal-input-textarea"]', 'Test goal');
      await page.click('button:has-text("Transform to SMART Goal")');

      // Wait for progress indicators
      await page.waitForSelector('.w-2.h-2.rounded-full');
      
      const indicators = await page.locator('.w-2.h-2.rounded-full').all();
      
      for (const indicator of indicators) {
        const title = await indicator.getAttribute('title');
        if (title) {
          // Should show percentage format in tooltip
          expect(title).toMatch(/\w+ - \d+%$/);
          expect(title).not.toMatch(/\w+ - 0\.\d+$/);
        }
      }
    });
  });

  test.describe('Feedback Messages', () => {
    test('should display improvement feedback with correct percentage', async ({ page }) => {
      // Setup initial goal
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal',
              title: 'Learn Programming',
              criteria: {
                specific: { value: 'Learn React', confidence: 0.45 },
                measurable: { value: '', confidence: 0.2 },
                achievable: { value: '', confidence: 0.3 },
                relevant: { value: '', confidence: 0.4 },
                timeBound: { value: '', confidence: 0.15 }
              },
              confidence: 0.3
            }
          })
        });
      });

      // Mock clarification response with improved score
      await page.route('**/api/v1/goals/clarify*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal',
              title: 'Learn React for web development',
              criteria: {
                specific: { value: 'Learn React for web development', confidence: 0.85 },
                measurable: { value: '', confidence: 0.2 },
                achievable: { value: '', confidence: 0.3 },
                relevant: { value: '', confidence: 0.4 },
                timeBound: { value: '', confidence: 0.15 }
              },
              confidence: 0.38
            }
          })
        });
      });

      await page.fill('[data-testid="api-key-input"]', 'test-key');
      await page.fill('[data-testid="api-endpoint-input"]', 'http://localhost:8085');
      await page.click('button:has-text("Configure API")');

      await page.fill('[data-testid="goal-input-textarea"]', 'Learn programming');
      await page.click('button:has-text("Transform to SMART Goal")');

      // Wait for chat interface
      await page.waitForSelector('input[placeholder*="Describe"]');

      // Submit clarification
      await page.fill('input[placeholder*="Describe"]', 'I want to learn React for web development');
      await page.click('button:has([class*="Send"])');

      // Wait for feedback message
      await page.waitForSelector('text=/score improved to \\d+%/');
      
      const feedback = await page.locator('text=/score improved to/').textContent();
      
      // Should show "85%" not "0.85"
      expect(feedback).toContain('85%');
      expect(feedback).not.toContain('0.85');
    });

    test('should show success message when reaching 90%+', async ({ page }) => {
      // Mock initial response
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal',
              title: 'Test Goal',
              criteria: {
                specific: { value: 'Test', confidence: 0.85 },
                measurable: { value: '', confidence: 0.2 },
                achievable: { value: '', confidence: 0.3 },
                relevant: { value: '', confidence: 0.4 },
                timeBound: { value: '', confidence: 0.15 }
              },
              confidence: 0.38
            }
          })
        });
      });

      // Mock clarification response with 90%+ score
      await page.route('**/api/v1/goals/clarify*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal',
              title: 'Improved Goal',
              criteria: {
                specific: { value: 'Very specific goal', confidence: 0.92 },
                measurable: { value: '', confidence: 0.2 },
                achievable: { value: '', confidence: 0.3 },
                relevant: { value: '', confidence: 0.4 },
                timeBound: { value: '', confidence: 0.15 }
              },
              confidence: 0.39
            }
          })
        });
      });

      await page.fill('[data-testid="api-key-input"]', 'test-key');
      await page.fill('[data-testid="api-endpoint-input"]', 'http://localhost:8085');
      await page.click('button:has-text("Configure API")');

      await page.fill('[data-testid="goal-input-textarea"]', 'Test goal');
      await page.click('button:has-text("Transform to SMART Goal")');

      await page.waitForSelector('input[placeholder*="Describe"]');

      await page.fill('input[placeholder*="Describe"]', 'Very specific details');
      await page.click('button:has([class*="Send"])');

      // Wait for success message
      await page.waitForSelector('text=/92% confidence/');
      
      const successMessage = await page.locator('text=/successfully improved/').textContent();
      
      // Should show "92%" not "0.92"
      expect(successMessage).toContain('92%');
      expect(successMessage).not.toContain('0.92');
    });
  });

  test.describe('Final Summary Display', () => {
    test('should display all final scores as percentages', async ({ page }) => {
      // Mock response with all criteria at 90%+
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal',
              title: 'Perfect Goal',
              criteria: {
                specific: { value: 'Perfect', confidence: 0.92 },
                measurable: { value: 'Perfect', confidence: 0.91 },
                achievable: { value: 'Perfect', confidence: 0.93 },
                relevant: { value: 'Perfect', confidence: 0.94 },
                timeBound: { value: 'Perfect', confidence: 0.95 }
              },
              confidence: 0.93
            }
          })
        });
      });

      await page.fill('[data-testid="api-key-input"]', 'test-key');
      await page.fill('[data-testid="api-endpoint-input"]', 'http://localhost:8085');
      await page.click('button:has-text("Configure API")');

      await page.fill('[data-testid="goal-input-textarea"]', 'Perfect goal');
      await page.click('button:has-text("Transform to SMART Goal")');

      // Wait for completion message
      await page.waitForSelector('text=/Congratulations!/');
      
      const finalScores = await page.locator('text=/\\d+% confidence/').all();
      
      for (const score of finalScores) {
        const text = await score.textContent();
        // All scores should be in percentage format
        expect(text).toMatch(/\d+% confidence/);
        expect(text).not.toMatch(/0\.\d+ confidence/);
      }

      // Check specific percentages
      const summaryText = await page.locator('text=/Final Confidence Scores/').locator('..').textContent();
      expect(summaryText).toContain('92% confidence');
      expect(summaryText).toContain('91% confidence');
      expect(summaryText).toContain('93% confidence');
      expect(summaryText).toContain('94% confidence');
      expect(summaryText).toContain('95% confidence');
    });
  });

  test.describe('Edge Case Rounding', () => {
    test('should correctly round confidence scores', async ({ page }) => {
      // Test various rounding scenarios
      await page.route('**/api/v1/goals/translate*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal',
              title: 'Rounding Test',
              criteria: {
                specific: { value: 'Test', confidence: 0.854 },  // Should round to 85%
                measurable: { value: 'Test', confidence: 0.856 }, // Should round to 86%
                achievable: { value: 'Test', confidence: 0.125 }, // Should round to 13%
                relevant: { value: 'Test', confidence: 0.124 },   // Should round to 12%
                timeBound: { value: 'Test', confidence: 0.895 }   // Should round to 90%
              },
              confidence: 0.534
            }
          })
        });
      });

      await page.fill('[data-testid="api-key-input"]', 'test-key');
      await page.fill('[data-testid="api-endpoint-input"]', 'http://localhost:8085');
      await page.click('button:has-text("Configure API")');

      await page.fill('[data-testid="goal-input-textarea"]', 'Rounding test');
      await page.click('button:has-text("Transform to SMART Goal")');

      await page.waitForSelector('.whitespace-pre-wrap');
      const content = await page.locator('body').textContent();

      // Check rounded values
      expect(content).toContain('85%');
      expect(content).toContain('86%');
      expect(content).toContain('13%');
      expect(content).toContain('12%');
      expect(content).toContain('90%'); // 0.895 rounds to 90%

      // Should not contain unrounded decimal values
      expect(content).not.toContain('0.854');
      expect(content).not.toContain('0.856');
      expect(content).not.toContain('0.125');
      expect(content).not.toContain('0.124');
      expect(content).not.toContain('0.895');
    });
  });
});