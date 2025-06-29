import { test, expect } from '@playwright/test';
import { ApiConfigPage } from './page-objects/ApiConfigPage';
import { GoalInputPage } from './page-objects/GoalInputPage';
import { SmartGoalPage } from './page-objects/SmartGoalPage';
import { TestUtils } from './fixtures/test-utils';

/**
 * Test Suite: Score Update Bug Validation
 * Purpose: Verify that SMART criteria scores update correctly after user clarifications
 * Bug: Scores were not updating when users provided specific details during chat
 */
test.describe('Score Update Bug Validation', () => {
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

  test.describe('Bug Reproduction Scenarios', () => {
    test('should reproduce bug: vague goal with low scores', async ({ page }) => {
      // Start with a vague goal that should have low scores
      await page.route('**/goals/translate', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal-123',
              title: 'Get better',
              description: 'I want to get better',
              criteria: {
                specific: { value: 'Get better', confidence: 0.2 }, // 20% - Very vague
                measurable: { value: 'Not measurable', confidence: 0.15 }, // 15% - No metrics
                achievable: { value: 'Unclear if achievable', confidence: 0.3 }, // 30%
                relevant: { value: 'Personal improvement', confidence: 0.4 }, // 40%
                timeBound: { value: 'No timeframe', confidence: 0.1 } // 10% - No deadline
              },
              confidence: 0.23, // Overall low confidence
              status: 'active'
            }
          })
        });
      });

      await goalInputPage.submitGoal('Get better');
      await smartGoalPage.assertSmartGoalDisplayed();

      // Verify initial low scores are displayed
      const specificScore = await page.locator('[data-testid="criterion-specific-confidence"]').textContent();
      expect(specificScore).toContain('20%');

      const measurableScore = await page.locator('[data-testid="criterion-measurable-confidence"]').textContent();
      expect(measurableScore).toContain('15%');

      const timeBoundScore = await page.locator('[data-testid="criterion-timeBound-confidence"]').textContent();
      expect(timeBoundScore).toContain('10%');
    });
  });

  test.describe('Score Update After Clarifications', () => {
    test('should increase specificity score when user provides specific details', async ({ page }) => {
      // Start with vague goal
      await goalInputPage.submitGoal('Get healthier');
      await smartGoalPage.assertSmartGoalDisplayed();

      // Wait for chat to initialize
      await page.waitForTimeout(2500);

      // Mock the clarify endpoint to return updated scores after specific input
      await page.route('**/goals/*/clarify', async route => {
        const request = route.request();
        const data = await request.postDataJSON();
        const clarifications = data.clarifications;

        // Check if user provided specific details
        if (clarifications.specific && clarifications.specific.includes('lose 20 pounds')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'test-goal-123',
                title: 'Lose 20 pounds through diet and exercise',
                criteria: {
                  specific: { 
                    value: 'Lose 20 pounds through diet and exercise', 
                    confidence: 0.85 // Score increased from 20% to 85%
                  },
                  measurable: { 
                    value: '20 pounds weight loss', 
                    confidence: 0.8, // Score increased
                    metrics: ['pounds'] 
                  },
                  achievable: { value: 'Realistic with plan', confidence: 0.6 },
                  relevant: { value: 'For health improvement', confidence: 0.5 },
                  timeBound: { value: 'No timeframe yet', confidence: 0.2 }
                },
                confidence: 0.58,
                status: 'active'
              },
              aiFeedback: 'Great! Your goal is now much more specific. You want to lose 20 pounds through diet and exercise.'
            })
          });
        } else {
          // Default response
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'test-goal-123',
                title: 'Get healthier',
                criteria: {
                  specific: { value: 'Get healthier', confidence: 0.2 },
                  measurable: { value: 'Not measurable', confidence: 0.15 },
                  achievable: { value: 'Unclear', confidence: 0.3 },
                  relevant: { value: 'Personal health', confidence: 0.4 },
                  timeBound: { value: 'No timeframe', confidence: 0.1 }
                },
                confidence: 0.23,
                status: 'active'
              }
            })
          });
        }
      });

      // Initial scores should be low
      let specificScore = await page.locator('[data-testid="criterion-specific-confidence"]').textContent();
      expect(specificScore).toContain('20%');

      // Provide specific details in chat
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('I want to lose 20 pounds through diet and exercise');
      await page.locator('[data-testid="chat-send"]').click();

      // Wait for processing
      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      await page.waitForTimeout(1000);

      // Verify score increased
      specificScore = await page.locator('[data-testid="criterion-specific-confidence"]').textContent();
      expect(specificScore).toContain('85%');

      // Also check measurable score increased
      const measurableScore = await page.locator('[data-testid="criterion-measurable-confidence"]').textContent();
      expect(measurableScore).toContain('80%');
    });

    test('should update measurement score when metrics are provided', async ({ page }) => {
      await goalInputPage.submitGoal('Save money');
      await smartGoalPage.assertSmartGoalDisplayed();

      await page.waitForTimeout(2500);

      // Mock clarify to update measurement scores
      await page.route('**/goals/*/clarify', async route => {
        const request = route.request();
        const data = await request.postDataJSON();
        const clarifications = data.clarifications;

        if (clarifications.measurable && clarifications.measurable.includes('$5000')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'test-goal-123',
                title: 'Save $5000 for emergency fund',
                criteria: {
                  specific: { value: 'Save for emergency fund', confidence: 0.6 },
                  measurable: { 
                    value: 'Save $5000', 
                    confidence: 0.9, // High score for specific amount
                    metrics: ['dollars', 'amount']
                  },
                  achievable: { value: 'Based on income', confidence: 0.5 },
                  relevant: { value: 'Financial security', confidence: 0.7 },
                  timeBound: { value: 'No deadline yet', confidence: 0.2 }
                },
                confidence: 0.58,
                status: 'active'
              },
              aiFeedback: 'Perfect! $5000 is a specific, measurable target for your emergency fund.'
            })
          });
        }
      });

      // Navigate to measurable component
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('next'); // Skip to measurable
      await page.locator('[data-testid="chat-send"]').click();
      await page.waitForTimeout(1000);

      // Provide specific measurement
      await chatInput.fill('I want to save exactly $5000');
      await page.locator('[data-testid="chat-send"]').click();

      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      await page.waitForTimeout(1000);

      // Verify measurement score updated
      const measurableScore = await page.locator('[data-testid="criterion-measurable-confidence"]').textContent();
      expect(measurableScore).toContain('90%');
    });

    test('should update timeframe score when deadline is provided', async ({ page }) => {
      await goalInputPage.submitGoal('Learn Spanish');
      await smartGoalPage.assertSmartGoalDisplayed();

      await page.waitForTimeout(2500);

      // Mock clarify to update timeframe scores
      await page.route('**/goals/*/clarify', async route => {
        const request = route.request();
        const data = await request.postDataJSON();
        const clarifications = data.clarifications;

        if (clarifications.timeBound && clarifications.timeBound.includes('6 months')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'test-goal-123',
                title: 'Learn Spanish to conversational level in 6 months',
                criteria: {
                  specific: { value: 'Learn Spanish to conversational level', confidence: 0.7 },
                  measurable: { value: 'Conversational proficiency', confidence: 0.6 },
                  achievable: { value: 'With daily practice', confidence: 0.6 },
                  relevant: { value: 'Career and travel', confidence: 0.7 },
                  timeBound: { 
                    value: 'Complete in 6 months by June 2025', 
                    confidence: 0.95 // High score for specific deadline
                  }
                },
                confidence: 0.72,
                status: 'active'
              },
              aiFeedback: 'Excellent! 6 months is a clear deadline that will help you stay on track.'
            })
          });
        }
      });

      // Navigate to time-bound component
      const chatInput = page.locator('[data-testid="chat-input"]');
      for (let i = 0; i < 4; i++) {
        await chatInput.fill('next');
        await page.locator('[data-testid="chat-send"]').click();
        await page.waitForTimeout(500);
      }

      // Provide specific timeframe
      await chatInput.fill('I want to complete this in 6 months, by June 2025');
      await page.locator('[data-testid="chat-send"]').click();

      await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
      await page.waitForTimeout(1000);

      // Verify timeframe score updated
      const timeBoundScore = await page.locator('[data-testid="criterion-timeBound-confidence"]').textContent();
      expect(timeBoundScore).toContain('95%');
    });
  });

  test.describe('State Management and Persistence', () => {
    test('should maintain updated scores across component transitions', async ({ page }) => {
      await goalInputPage.submitGoal('Start a business');
      await smartGoalPage.assertSmartGoalDisplayed();

      await page.waitForTimeout(2500);

      let clarificationCount = 0;
      const updatedScores = {
        specific: 0.85,
        measurable: 0.8,
        achievable: 0.75,
        relevant: 0.9,
        timeBound: 0.85
      };

      // Mock to track and update scores progressively
      await page.route('**/goals/*/clarify', async route => {
        clarificationCount++;
        const currentComponent = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'][clarificationCount - 1];
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal-123',
              title: 'Start an online consulting business',
              criteria: {
                specific: { 
                  value: 'Start online consulting business', 
                  confidence: clarificationCount >= 1 ? updatedScores.specific : 0.3 
                },
                measurable: { 
                  value: '$10k monthly revenue', 
                  confidence: clarificationCount >= 2 ? updatedScores.measurable : 0.2 
                },
                achievable: { 
                  value: 'Based on expertise and network', 
                  confidence: clarificationCount >= 3 ? updatedScores.achievable : 0.3 
                },
                relevant: { 
                  value: 'Aligns with career goals', 
                  confidence: clarificationCount >= 4 ? updatedScores.relevant : 0.4 
                },
                timeBound: { 
                  value: 'Launch in 3 months', 
                  confidence: clarificationCount >= 5 ? updatedScores.timeBound : 0.2 
                }
              },
              confidence: 0.7,
              status: 'active'
            }
          })
        });
      });

      const chatInput = page.locator('[data-testid="chat-input"]');

      // Provide clarifications for each component
      const clarifications = [
        'Start an online consulting business in digital marketing',
        'Generate $10,000 monthly revenue within first year',
        'I have 10 years experience and strong network',
        'This aligns perfectly with my long-term career goals',
        'Launch the business in 3 months, by April 2025'
      ];

      for (let i = 0; i < clarifications.length; i++) {
        await chatInput.fill(clarifications[i]);
        await page.locator('[data-testid="chat-send"]').click();
        await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
        await page.waitForTimeout(1000);

        // Verify scores persist and accumulate
        if (i >= 0) {
          const specificScore = await page.locator('[data-testid="criterion-specific-confidence"]').textContent();
          expect(specificScore).toContain('85%');
        }
        if (i >= 1) {
          const measurableScore = await page.locator('[data-testid="criterion-measurable-confidence"]').textContent();
          expect(measurableScore).toContain('80%');
        }
        if (i >= 2) {
          const achievableScore = await page.locator('[data-testid="criterion-achievable-confidence"]').textContent();
          expect(achievableScore).toContain('75%');
        }
      }
    });
  });

  test.describe('No Repeated Questions', () => {
    test('should not ask for information already provided', async ({ page }) => {
      await goalInputPage.submitGoal('Exercise more');
      await smartGoalPage.assertSmartGoalDisplayed();

      await page.waitForTimeout(2500);

      let questionCount = 0;
      const askedQuestions = new Set<string>();

      // Mock component questions to track what's being asked
      await page.route('**/goals/component-question', async route => {
        const request = route.request();
        const data = await request.postDataJSON();
        
        questionCount++;
        let question = '';
        
        // Generate questions based on what's already been answered
        if (data.componentKey === 'specific' && !data.currentValue.includes('running')) {
          question = 'What specific type of exercise do you want to do?';
        } else if (data.componentKey === 'specific' && data.currentValue.includes('running')) {
          question = 'You mentioned running. How often do you want to run?';
        } else if (data.componentKey === 'measurable' && !data.currentValue.includes('miles')) {
          question = 'How will you measure your progress?';
        } else if (data.componentKey === 'measurable' && data.currentValue.includes('miles')) {
          question = 'Great! You want to track miles. Any other metrics?';
        }

        askedQuestions.add(question);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { question }
          })
        });
      });

      // Mock clarify to update based on provided info
      await page.route('**/goals/*/clarify', async route => {
        const request = route.request();
        const data = await request.postDataJSON();
        const input = data.conversationHistory[data.conversationHistory.length - 1].content;

        let updatedGoal = {
          specific: { value: 'Exercise more', confidence: 0.3 },
          measurable: { value: 'Track progress', confidence: 0.3 }
        };

        if (input.includes('running')) {
          updatedGoal.specific = { value: 'Go running 3 times a week', confidence: 0.8 };
        }
        if (input.includes('5 miles')) {
          updatedGoal.measurable = { value: 'Run 5 miles per session', confidence: 0.85 };
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal-123',
              title: 'Exercise more',
              criteria: {
                ...updatedGoal,
                achievable: { value: 'Based on fitness', confidence: 0.5 },
                relevant: { value: 'Health improvement', confidence: 0.6 },
                timeBound: { value: 'Ongoing', confidence: 0.3 }
              },
              confidence: 0.5,
              status: 'active'
            }
          })
        });
      });

      const chatInput = page.locator('[data-testid="chat-input"]');

      // First clarification: specific exercise type
      await chatInput.fill('I want to go running 3 times a week');
      await page.locator('[data-testid="chat-send"]').click();
      await page.waitForTimeout(2000);

      // Second clarification: should not ask about exercise type again
      await chatInput.fill('Run 5 miles per session');
      await page.locator('[data-testid="chat-send"]').click();
      await page.waitForTimeout(2000);

      // Verify no duplicate questions about running/exercise type
      const questionTexts = Array.from(askedQuestions);
      const runningQuestions = questionTexts.filter(q => 
        q.toLowerCase().includes('what specific type') || 
        q.toLowerCase().includes('what exercise')
      );
      
      // Should only ask about specific exercise type once
      expect(runningQuestions.length).toBeLessThanOrEqual(1);
    });

    test('should skip components that already have high confidence', async ({ page }) => {
      // Create a goal with some components already at high confidence
      await page.route('**/goals/translate', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal-123',
              title: 'Complete marathon in 4 hours by December 2025',
              criteria: {
                specific: { 
                  value: 'Complete a full marathon', 
                  confidence: 0.95 // Already high
                },
                measurable: { 
                  value: 'Finish in under 4 hours', 
                  confidence: 0.92, // Already high
                  metrics: ['hours', 'time']
                },
                achievable: { 
                  value: 'Need training plan', 
                  confidence: 0.4 // Low - needs work
                },
                relevant: { 
                  value: 'Personal fitness goal', 
                  confidence: 0.5 // Medium - needs work
                },
                timeBound: { 
                  value: 'December 2025', 
                  confidence: 0.98 // Already high
                }
              },
              confidence: 0.75,
              status: 'active'
            }
          })
        });
      });

      await goalInputPage.submitGoal('Complete marathon in 4 hours by December 2025');
      await smartGoalPage.assertSmartGoalDisplayed();

      await page.waitForTimeout(2500);

      // Track which components are being worked on
      const workedComponents = new Set<string>();

      await page.route('**/goals/component-question', async route => {
        const request = route.request();
        const data = await request.postDataJSON();
        
        workedComponents.add(data.componentKey);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              question: `Tell me more about the ${data.componentKey} aspect`
            }
          })
        });
      });

      // Let the chat progress through a few components
      await page.waitForTimeout(5000);

      // Verify high-confidence components were skipped
      expect(workedComponents.has('specific')).toBe(false); // 95% - should skip
      expect(workedComponents.has('measurable')).toBe(false); // 92% - should skip
      expect(workedComponents.has('timeBound')).toBe(false); // 98% - should skip
      
      // Should work on low confidence components
      expect(workedComponents.has('achievable')).toBe(true); // 40% - needs work
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle rapid clarifications without losing data', async ({ page }) => {
      await goalInputPage.submitGoal('Be productive');
      await smartGoalPage.assertSmartGoalDisplayed();

      await page.waitForTimeout(2500);

      let responseCount = 0;
      await page.route('**/goals/*/clarify', async route => {
        responseCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal-123',
              title: 'Be productive',
              criteria: {
                specific: { 
                  value: 'Productivity improvements', 
                  confidence: Math.min(0.3 + (responseCount * 0.2), 0.9)
                },
                measurable: { value: 'Track tasks', confidence: 0.4 },
                achievable: { value: 'With systems', confidence: 0.5 },
                relevant: { value: 'Career growth', confidence: 0.6 },
                timeBound: { value: 'Daily habits', confidence: 0.3 }
              },
              confidence: 0.5,
              status: 'active'
            }
          })
        });
      });

      const chatInput = page.locator('[data-testid="chat-input"]');

      // Send multiple clarifications rapidly
      for (let i = 0; i < 3; i++) {
        await chatInput.fill(`Clarification ${i + 1}: more specific details`);
        await page.locator('[data-testid="chat-send"]').click();
        await page.waitForTimeout(100); // Very short delay
      }

      // Wait for all to process
      await page.waitForTimeout(3000);

      // Verify final score reflects all updates
      const specificScore = await page.locator('[data-testid="criterion-specific-confidence"]').textContent();
      const scoreValue = parseInt(specificScore.replace('%', ''));
      expect(scoreValue).toBeGreaterThan(50); // Should have increased from 30%
    });

    test('should handle conflicting clarifications gracefully', async ({ page }) => {
      await goalInputPage.submitGoal('Improve skills');
      await smartGoalPage.assertSmartGoalDisplayed();

      await page.waitForTimeout(2500);

      // Mock to handle conflicting inputs
      await page.route('**/goals/*/clarify', async route => {
        const request = route.request();
        const data = await request.postDataJSON();
        const lastInput = data.conversationHistory[data.conversationHistory.length - 1].content;

        let needsFollowUp = false;
        let feedback = '';

        if (lastInput.includes('Python') && lastInput.includes('JavaScript')) {
          needsFollowUp = true;
          feedback = 'I see you mentioned both Python and JavaScript. Which one would you like to focus on first?';
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-goal-123',
              title: 'Improve skills',
              criteria: {
                specific: { value: 'Programming skills', confidence: 0.4 },
                measurable: { value: 'Build projects', confidence: 0.3 },
                achievable: { value: 'With practice', confidence: 0.5 },
                relevant: { value: 'Career advancement', confidence: 0.6 },
                timeBound: { value: 'This year', confidence: 0.4 }
              },
              confidence: 0.44,
              status: 'active',
              needsFollowUp,
              feedback
            },
            message: feedback
          })
        });
      });

      const chatInput = page.locator('[data-testid="chat-input"]');

      // Provide conflicting information
      await chatInput.fill('I want to learn Python and JavaScript at the same time');
      await page.locator('[data-testid="chat-send"]').click();

      await page.waitForTimeout(2000);

      // Verify system asks for clarification
      const botMessages = await page.locator('[data-testid="chat-message-bot"]').allTextContents();
      const lastBotMessage = botMessages[botMessages.length - 1];
      expect(lastBotMessage).toContain('Which one would you like to focus on first?');
    });
  });
});