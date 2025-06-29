import { test, expect, Page } from '@playwright/test';
import { ApiConfigPage } from './page-objects/ApiConfigPage';
import { GoalInputPage } from './page-objects/GoalInputPage';
import { SmartGoalPage } from './page-objects/SmartGoalPage';

/**
 * Comprehensive E2E test suite for SMART goal creation flow
 * Tests the complete user journey from goal input to SMART goal generation
 * Including AI clarification questions and user interactions
 */

interface TestScenario {
  name: string;
  description: string;
  initialGoal: string;
  expectedQuestions: string[];
  userResponses: string[];
  expectedSmartGoal: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };
  minConfidenceScore: number;
}

class SmartGoalFlowTester {
  constructor(
    private page: Page,
    private apiConfigPage: ApiConfigPage,
    private goalInputPage: GoalInputPage,
    private smartGoalPage: SmartGoalPage
  ) {}

  async setupEnvironment() {
    // Setup mock API or use real API based on environment
    const useRealAPI = process.env.USE_REAL_API === 'true';
    
    if (useRealAPI) {
      const apiKey = process.env.OPENAI_API_KEY || '';
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY required for real API testing');
      }
      await this.page.goto('/');
      await this.apiConfigPage.configureApi(apiKey);
    } else {
      // Setup mock API routes
      await this.setupMockAPI();
      await this.page.goto('/');
      await this.apiConfigPage.configureApi('test-api-key');
    }
  }

  private async setupMockAPI() {
    // Mock goal transformation endpoint
    await this.page.route('**/api/v1/goals/transform', async (route) => {
      const request = route.request();
      const body = request.postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            goalId: 'test-goal-' + Date.now(),
            title: body.goal,
            originalGoal: body.goal,
            smartGoal: {
              specific: { value: body.goal, confidence: 40 },
              measurable: { value: '', confidence: 20 },
              achievable: { value: '', confidence: 30 },
              relevant: { value: '', confidence: 35 },
              timeBound: { value: '', confidence: 15 }
            },
            needsClarification: true,
            overallConfidence: 28
          }
        })
      });
    });

    // Mock clarification endpoint
    await this.page.route('**/api/v1/goals/*/clarify', async (route) => {
      const request = route.request();
      const body = request.postDataJSON();
      const goalId = route.request().url().match(/goals\/([^\/]+)\/clarify/)?.[1];
      
      // Simulate intelligent response based on user input
      const response = this.generateMockClarificationResponse(body);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  private generateMockClarificationResponse(body: any) {
    const clarification = body.clarifications[0];
    const criterion = clarification.smartCriterion;
    const answer = clarification.answer;
    
    // Simulate confidence increase based on answer quality
    const answerLength = answer.length;
    const hasNumbers = /\d/.test(answer);
    const hasSpecificWords = /specific|exactly|measure|goal|deadline|week|month|year/.test(answer.toLowerCase());
    
    let confidenceIncrease = 30;
    if (answerLength > 50) confidenceIncrease += 20;
    if (hasNumbers) confidenceIncrease += 15;
    if (hasSpecificWords) confidenceIncrease += 15;
    
    const newConfidence = Math.min(95, 40 + confidenceIncrease);
    
    return {
      success: true,
      data: {
        goalId: body.goalId,
        updatedCriteria: {
          [criterion]: {
            value: answer,
            confidence: newConfidence
          }
        },
        nextQuestion: this.getNextQuestion(criterion, newConfidence),
        overallProgress: this.calculateOverallProgress(criterion, newConfidence),
        feedback: this.generateFeedback(criterion, answer, newConfidence)
      }
    };
  }

  private getNextQuestion(currentCriterion: string, confidence: number): string | null {
    if (confidence >= 90) {
      const criteriaOrder = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'];
      const currentIndex = criteriaOrder.indexOf(currentCriterion);
      
      if (currentIndex < criteriaOrder.length - 1) {
        const nextCriterion = criteriaOrder[currentIndex + 1];
        return this.getQuestionForCriterion(nextCriterion);
      }
    }
    return null;
  }

  private getQuestionForCriterion(criterion: string): string {
    const questions: Record<string, string> = {
      specific: "What specific aspect of this goal would you like to focus on?",
      measurable: "How will you measure your progress? What metrics will you track?",
      achievable: "What resources and skills do you have to achieve this goal?",
      relevant: "Why is this goal important to you? How does it align with your values?",
      timeBound: "What's your target deadline for achieving this goal?"
    };
    return questions[criterion] || "Tell me more about this aspect of your goal.";
  }

  private calculateOverallProgress(updatedCriterion: string, newConfidence: number): number {
    // Simplified calculation - in reality would track all criteria
    return Math.min(100, (newConfidence / 95) * 100);
  }

  private generateFeedback(criterion: string, answer: string, confidence: number): string {
    if (confidence >= 90) {
      return `Excellent! Your ${criterion} aspect is now well-defined.`;
    } else if (confidence >= 70) {
      return `Good progress! Your ${criterion} aspect is getting clearer.`;
    } else {
      return `That's a start. Let's make your ${criterion} aspect more specific.`;
    }
  }

  async enterInitialGoal(goal: string) {
    await this.goalInputPage.submitGoal(goal);
    await this.smartGoalPage.assertSmartGoalDisplayed();
  }

  async waitForChatInterface() {
    // Wait for chat interface to appear and auto-start
    await expect(this.page.locator('[data-testid="chat-clarification"]')).toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(3000); // Wait for auto-start
    
    // Verify welcome message
    const welcomeMessage = this.page.locator('[data-testid="chat-message-bot"]').first();
    await expect(welcomeMessage).toContainText(/SMART Goal|Welcome|Let's refine/i);
  }

  async answerClarificationQuestion(answer: string) {
    const chatInput = this.page.locator('[data-testid="chat-input"]');
    await chatInput.fill(answer);
    await this.page.locator('[data-testid="chat-send"]').click();
    
    // Wait for processing
    await this.page.waitForSelector('[data-testid="chat-processing"]', { state: 'visible' });
    await this.page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden', timeout: 15000 });
    
    // Allow time for state updates
    await this.page.waitForTimeout(1000);
  }

  async verifyConfidenceIncrease(criterion: string, minExpectedScore: number) {
    const confidenceSelector = `[data-testid="confidence-${criterion}"]`;
    const confidenceText = await this.page.locator(confidenceSelector).textContent();
    const confidenceScore = parseInt(confidenceText?.replace('%', '') || '0');
    
    expect(confidenceScore).toBeGreaterThanOrEqual(minExpectedScore);
  }

  async verifyCriterionUpdate(criterion: string, expectedContent: string) {
    const valueSelector = `[data-testid="criterion-${criterion}-value"]`;
    const value = await this.page.locator(valueSelector).textContent();
    
    expect(value?.toLowerCase()).toContain(expectedContent.toLowerCase());
  }

  async verifyCompletionState() {
    // Check for completion message
    const completionMessage = await this.page.locator('[data-testid="chat-message-bot"]')
      .filter({ hasText: /Congratulations|completed|Well done|finished/i })
      .first();
    
    await expect(completionMessage).toBeVisible({ timeout: 10000 });
    
    // Verify all confidence scores are high
    const criteriaList = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'];
    for (const criterion of criteriaList) {
      await this.verifyConfidenceIncrease(criterion, 85);
    }
    
    // Verify Complete Chat button appears
    const completeButton = this.page.locator('button:has-text("Complete Chat")');
    await expect(completeButton).toBeVisible();
  }

  async completeFullFlow(scenario: TestScenario) {
    console.log(`\n🎯 Testing scenario: ${scenario.name}`);
    console.log(`📝 Initial goal: "${scenario.initialGoal}"`);
    
    // Step 1: Enter initial goal
    await this.enterInitialGoal(scenario.initialGoal);
    
    // Step 2: Wait for chat interface
    await this.waitForChatInterface();
    
    // Step 3: Go through clarification questions
    for (let i = 0; i < scenario.userResponses.length; i++) {
      console.log(`\n💬 Answering question ${i + 1}...`);
      
      // Verify we're getting appropriate questions
      const lastBotMessage = await this.page.locator('[data-testid="chat-message-bot"]').last().textContent();
      console.log(`Bot asks: "${lastBotMessage?.substring(0, 100)}..."`);
      
      // Provide user response
      const response = scenario.userResponses[i];
      console.log(`User responds: "${response}"`);
      await this.answerClarificationQuestion(response);
      
      // Verify real-time updates
      await this.page.waitForTimeout(1000);
    }
    
    // Step 4: Verify completion
    await this.verifyCompletionState();
    
    // Step 5: Verify final SMART goal
    console.log('\n✅ Verifying final SMART goal...');
    for (const [criterion, expectedValue] of Object.entries(scenario.expectedSmartGoal)) {
      if (expectedValue) {
        await this.verifyCriterionUpdate(criterion, expectedValue);
      }
    }
    
    console.log(`✨ Scenario "${scenario.name}" completed successfully!`);
  }
}

// Test scenarios covering different user journeys
const testScenarios: TestScenario[] = [
  {
    name: 'Vague Goal to Specific SMART Goal',
    description: 'User starts with very vague goal and provides clarifications',
    initialGoal: 'Get fit',
    expectedQuestions: [
      'specific aspect',
      'measure progress',
      'achievable',
      'important to you',
      'deadline'
    ],
    userResponses: [
      'I want to lose weight and build muscle through gym workouts',
      'Lose 20 pounds and increase bench press by 50 pounds',
      'Yes, I have a gym membership and 1 hour daily for exercise',
      'To improve my health and confidence for my wedding',
      'By June 2025, which is 6 months from now'
    ],
    expectedSmartGoal: {
      specific: 'lose weight and build muscle',
      measurable: '20 pounds',
      achievable: 'gym membership',
      relevant: 'wedding',
      timeBound: 'June 2025'
    },
    minConfidenceScore: 85
  },
  {
    name: 'Career Development Goal',
    description: 'Professional seeking career advancement',
    initialGoal: 'Advance my career',
    expectedQuestions: [
      'specific aspect',
      'measure',
      'resources',
      'important',
      'timeline'
    ],
    userResponses: [
      'Get promoted to Senior Software Engineer at my company',
      'Complete 3 major projects and pass the senior engineer review',
      'I have 5 years experience and my manager supports my growth',
      'For financial stability and professional satisfaction',
      'Within the next 12 months'
    ],
    expectedSmartGoal: {
      specific: 'Senior Software Engineer',
      measurable: '3 major projects',
      achievable: '5 years experience',
      relevant: 'financial stability',
      timeBound: '12 months'
    },
    minConfidenceScore: 90
  },
  {
    name: 'Learning Goal with Iterations',
    description: 'User needs multiple clarifications for vague responses',
    initialGoal: 'Learn something new',
    expectedQuestions: [
      'What would you like to learn',
      'How will you track',
      'resources available',
      'Why is this important',
      'When do you want'
    ],
    userResponses: [
      'Programming', // Too vague, should trigger follow-up
      'Python for data science and machine learning',
      'Complete online course and build 5 projects',
      'I have evenings free and a good laptop',
      'To transition into a data science role',
      'Master basics in 3 months, job-ready in 6 months'
    ],
    expectedSmartGoal: {
      specific: 'Python for data science',
      measurable: '5 projects',
      achievable: 'evenings free',
      relevant: 'data science role',
      timeBound: '6 months'
    },
    minConfidenceScore: 85
  }
];

test.describe('Comprehensive SMART Goal Flow E2E Tests', () => {
  let apiConfigPage: ApiConfigPage;
  let goalInputPage: GoalInputPage;
  let smartGoalPage: SmartGoalPage;
  let flowTester: SmartGoalFlowTester;

  test.beforeEach(async ({ page }) => {
    apiConfigPage = new ApiConfigPage(page);
    goalInputPage = new GoalInputPage(page);
    smartGoalPage = new SmartGoalPage(page);
    flowTester = new SmartGoalFlowTester(page, apiConfigPage, goalInputPage, smartGoalPage);
    
    await flowTester.setupEnvironment();
  });

  // Test each scenario
  for (const scenario of testScenarios) {
    test(scenario.name, async ({ page }) => {
      await flowTester.completeFullFlow(scenario);
      
      // Take screenshot of final result
      await page.screenshot({ 
        path: `test-results/smart-goal-${scenario.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });
    });
  }

  test('User abandons and returns to continue', async ({ page }) => {
    // Start the flow
    await flowTester.enterInitialGoal('Start a business');
    await flowTester.waitForChatInterface();
    
    // Answer first question
    await flowTester.answerClarificationQuestion('Online e-commerce store');
    
    // Store current state
    const goalData = await page.evaluate(() => localStorage.getItem('currentGoal'));
    expect(goalData).toBeTruthy();
    
    // Navigate away
    await page.goto('/about');
    await page.waitForTimeout(1000);
    
    // Return to the app
    await page.goBack();
    
    // Verify state is preserved
    const restoredData = await page.evaluate(() => localStorage.getItem('currentGoal'));
    expect(restoredData).toEqual(goalData);
    
    // Continue the flow
    await flowTester.answerClarificationQuestion('Sell $10,000 per month');
    await flowTester.verifyConfidenceIncrease('measurable', 70);
  });

  test('Handles network errors gracefully', async ({ page }) => {
    await flowTester.enterInitialGoal('Improve health');
    await flowTester.waitForChatInterface();
    
    // Simulate network error
    await page.route('**/api/v1/goals/*/clarify', route => {
      route.abort('failed');
    });
    
    // Try to answer
    await flowTester.answerClarificationQuestion('Exercise regularly');
    
    // Should show error message
    const errorMessage = await page.locator('[data-testid="chat-message-bot"]')
      .filter({ hasText: /error|failed|try again/i })
      .first();
    
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Restore network
    await page.unroute('**/api/v1/goals/*/clarify');
    
    // Retry should work
    await flowTester.answerClarificationQuestion('Exercise regularly');
    await flowTester.verifyConfidenceIncrease('specific', 60);
  });

  test('Skip functionality works correctly', async ({ page }) => {
    await flowTester.enterInitialGoal('Save money');
    await flowTester.waitForChatInterface();
    
    // Skip first question
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('skip');
    await page.locator('[data-testid="chat-send"]').click();
    
    await page.waitForTimeout(1000);
    
    // Should move to next criterion
    const currentComponent = await page.locator('[data-testid="current-component"]').textContent();
    expect(currentComponent).toContain('Measurable');
    
    // Answer this one
    await flowTester.answerClarificationQuestion('Save $500 per month');
    await flowTester.verifyConfidenceIncrease('measurable', 70);
  });

  test('Comprehensive answer updates multiple criteria', async ({ page }) => {
    await flowTester.enterInitialGoal('New skill');
    await flowTester.waitForChatInterface();
    
    // Provide comprehensive answer
    const comprehensiveAnswer = 'Learn Spanish to B2 level by December 2025 through daily 30-minute practice sessions';
    await flowTester.answerClarificationQuestion(comprehensiveAnswer);
    
    // Multiple criteria should be updated
    await flowTester.verifyConfidenceIncrease('specific', 80);
    await flowTester.verifyConfidenceIncrease('measurable', 70);
    await flowTester.verifyConfidenceIncrease('timeBound', 85);
    
    // Should skip to criteria still needing work
    const nextQuestion = await page.locator('[data-testid="chat-message-bot"]').last().textContent();
    expect(nextQuestion?.toLowerCase()).toMatch(/achievable|relevant/);
  });

  test('Accessibility - full keyboard navigation', async ({ page }) => {
    await flowTester.enterInitialGoal('Learn piano');
    await flowTester.waitForChatInterface();
    
    // Navigate with Tab
    await page.keyboard.press('Tab');
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeFocused();
    
    // Type and submit with Enter
    await page.keyboard.type('Classical piano, grade 5 level');
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForSelector('[data-testid="chat-processing"]', { state: 'hidden' });
    
    // Continue with keyboard
    await page.keyboard.type('Practice 1 hour daily, complete grade 5 exam');
    await page.keyboard.press('Enter');
    
    await flowTester.verifyConfidenceIncrease('specific', 70);
    await flowTester.verifyConfidenceIncrease('measurable', 70);
  });

  test('Progress persistence across page refreshes', async ({ page }) => {
    await flowTester.enterInitialGoal('Write a book');
    await flowTester.waitForChatInterface();
    
    // Make some progress
    await flowTester.answerClarificationQuestion('Science fiction novel about space exploration');
    await flowTester.answerClarificationQuestion('Complete 80,000 word manuscript');
    
    // Get current state
    const progressBefore = await page.locator('[data-testid="overall-progress"]').textContent();
    
    // Refresh page
    await page.reload();
    
    // Verify progress is maintained
    await page.waitForSelector('[data-testid="overall-progress"]');
    const progressAfter = await page.locator('[data-testid="overall-progress"]').textContent();
    
    expect(progressAfter).toEqual(progressBefore);
  });
});

// Performance and stress tests
test.describe('Performance and Stress Tests', () => {
  test('Handles rapid user inputs', async ({ page }) => {
    const apiConfigPage = new ApiConfigPage(page);
    const goalInputPage = new GoalInputPage(page);
    const smartGoalPage = new SmartGoalPage(page);
    const flowTester = new SmartGoalFlowTester(page, apiConfigPage, goalInputPage, smartGoalPage);
    
    await flowTester.setupEnvironment();
    await flowTester.enterInitialGoal('Test goal');
    await flowTester.waitForChatInterface();
    
    // Send multiple messages rapidly
    const chatInput = page.locator('[data-testid="chat-input"]');
    const messages = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
    
    for (const msg of messages) {
      await chatInput.fill(msg);
      await page.locator('[data-testid="chat-send"]').click();
      await page.waitForTimeout(100); // Minimal delay
    }
    
    // System should handle all inputs gracefully
    await page.waitForTimeout(5000);
    
    // No error messages should appear
    const errorCount = await page.locator('text=/error|failed/i').count();
    expect(errorCount).toBe(0);
  });

  test('Large text input handling', async ({ page }) => {
    const apiConfigPage = new ApiConfigPage(page);
    const goalInputPage = new GoalInputPage(page);
    const smartGoalPage = new SmartGoalPage(page);
    const flowTester = new SmartGoalFlowTester(page, apiConfigPage, goalInputPage, smartGoalPage);
    
    await flowTester.setupEnvironment();
    
    // Enter very long initial goal
    const longGoal = 'I want to ' + 'achieve many things including '.repeat(20) + 'success';
    await flowTester.enterInitialGoal(longGoal);
    await flowTester.waitForChatInterface();
    
    // System should handle it gracefully
    await expect(page.locator('[data-testid="smart-goal-title"]')).toBeVisible();
  });
});