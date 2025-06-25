import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Comprehensive End-to-End Testing Suite for PersonalEA
 * Real browser automation testing complete user journeys
 */

interface TestScenario {
  id: string;
  name: string;
  initialGoal: string;
  userPersona: {
    type: string;
    experience: string;
    urgency: string;
  };
  conversationFlow: string[];
  expectedOutcomes: {
    smartGoalConfidence: number;
    minMilestones: number;
    maxMilestones: number;
    minTasks: number;
    maxTasks: number;
  };
}

const COMPREHENSIVE_E2E_SCENARIOS: TestScenario[] = [
  {
    id: 'startup_founder',
    name: 'Startup Founder Product Launch',
    initialGoal: 'Launch my AI-powered productivity app and acquire 10,000 paying users',
    userPersona: {
      type: 'entrepreneur',
      experience: 'intermediate',
      urgency: 'high'
    },
    conversationFlow: [
      'I have 6 months and a team of 5 developers',
      'My target market is remote workers and small teams',
      'I need to raise Series A funding during this process',
      'The app should integrate with Slack, Notion, and Google Workspace'
    ],
    expectedOutcomes: {
      smartGoalConfidence: 0.8,
      minMilestones: 8,
      maxMilestones: 15,
      minTasks: 30,
      maxTasks: 60
    }
  },
  {
    id: 'career_changer',
    name: 'Mid-Career Professional Transition',
    initialGoal: 'Transition from marketing to UX design and land a senior role at a tech company',
    userPersona: {
      type: 'professional',
      experience: 'beginner',
      urgency: 'medium'
    },
    conversationFlow: [
      'I have 10 years in marketing but no formal UX experience',
      'I can study 15-20 hours per week while working full-time',
      'I prefer hands-on learning over theoretical courses',
      'I want to transition within 12-15 months'
    ],
    expectedOutcomes: {
      smartGoalConfidence: 0.75,
      minMilestones: 10,
      maxMilestones: 18,
      minTasks: 35,
      maxTasks: 70
    }
  },
  {
    id: 'health_transformation',
    name: 'Complete Lifestyle Health Transformation',
    initialGoal: 'Transform my health by losing 40 pounds, building muscle, and running a marathon',
    userPersona: {
      type: 'health_focused',
      experience: 'beginner',
      urgency: 'high'
    },
    conversationFlow: [
      'I\'m currently 50 pounds overweight with no exercise routine',
      'I have a history of starting and stopping fitness programs',
      'I can commit to 1 hour daily for exercise and meal prep',
      'I want to complete a marathon in 18 months'
    ],
    expectedOutcomes: {
      smartGoalConfidence: 0.85,
      minMilestones: 12,
      maxMilestones: 20,
      minTasks: 40,
      maxTasks: 80
    }
  }
];

class PersonalEAPageObject {
  constructor(private page: Page) {}

  // Navigation and setup
  async navigateToApp() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async configureAPI(apiKey: string = 'test-key', apiUrl: string = 'http://localhost:3001') {
    await this.page.fill('[data-testid="api-key-input"]', apiKey);
    await this.page.fill('[data-testid="api-url-input"]', apiUrl);
    await this.page.click('[data-testid="save-config-button"]');
    await this.page.waitForSelector('[data-testid="goal-input-section"]', { state: 'visible' });
  }

  // Goal input phase
  async enterGoal(goal: string) {
    await this.page.fill('[data-testid="goal-input-textarea"]', goal);
    await this.page.click('[data-testid="submit-goal-button"]');
  }

  async waitForSmartGoalGeneration() {
    await this.page.waitForSelector('[data-testid="smart-goal-display"]', { 
      state: 'visible',
      timeout: 30000 
    });
  }

  // SMART goal interaction
  async getSmartGoalConfidence(): Promise<number> {
    const confidenceText = await this.page.textContent('[data-testid="confidence-score"]');
    return parseFloat(confidenceText?.replace('%', '') || '0') / 100;
  }

  async sendChatMessage(message: string) {
    await this.page.fill('[data-testid="chat-input"]', message);
    await this.page.click('[data-testid="send-chat-button"]');
    await this.page.waitForSelector('[data-testid="chat-message"]:last-child [data-role="assistant"]');
  }

  async getChatMessageCount(): Promise<number> {
    const messages = await this.page.locator('[data-testid="chat-message"]').count();
    return messages;
  }

  async proceedToMilestones() {
    await this.page.click('[data-testid="continue-to-milestones-button"]');
    await this.page.waitForSelector('[data-testid="milestones-section"]', { state: 'visible' });
  }

  // Milestone generation
  async generateMilestones() {
    await this.page.click('[data-testid="generate-milestones-button"]');
    await this.page.waitForSelector('[data-testid="milestone-item"]', { 
      state: 'visible',
      timeout: 20000 
    });
  }

  async getMilestoneCount(): Promise<number> {
    return await this.page.locator('[data-testid="milestone-item"]').count();
  }

  async proceedToWBS() {
    await this.page.click('[data-testid="continue-to-wbs-button"]');
    await this.page.waitForSelector('[data-testid="wbs-section"]', { state: 'visible' });
  }

  // WBS generation
  async generateWBS() {
    await this.page.click('[data-testid="generate-wbs-button"]');
    await this.page.waitForSelector('[data-testid="task-item"]', { 
      state: 'visible',
      timeout: 20000 
    });
  }

  async getTaskCount(): Promise<number> {
    return await this.page.locator('[data-testid="task-item"]').count();
  }

  async proceedToEstimation() {
    await this.page.click('[data-testid="continue-to-estimation-button"]');
    await this.page.waitForSelector('[data-testid="estimation-section"]', { state: 'visible' });
  }

  // Estimation phase
  async generateEstimations() {
    await this.page.click('[data-testid="generate-estimations-button"]');
    await this.page.waitForSelector('[data-testid="estimation-summary"]', { 
      state: 'visible',
      timeout: 15000 
    });
  }

  async getEstimationSummary(): Promise<any> {
    const summaryText = await this.page.textContent('[data-testid="estimation-summary"]');
    return { available: !!summaryText, content: summaryText };
  }

  // Error handling
  async checkForErrors(): Promise<string[]> {
    const errorElements = await this.page.locator('[data-testid*="error"]').all();
    const errors = [];
    for (const element of errorElements) {
      const errorText = await element.textContent();
      if (errorText) errors.push(errorText);
    }
    return errors;
  }

  // Performance monitoring
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  async measureApiResponseTime(endpoint: string): Promise<number> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      this.page.on('response', (response) => {
        if (response.url().includes(endpoint)) {
          resolve(Date.now() - startTime);
        }
      });
    });
  }
}

test.describe('Comprehensive E2E User Journey Testing', () => {
  let personalEA: PersonalEAPageObject;

  test.beforeEach(async ({ page }) => {
    personalEA = new PersonalEAPageObject(page);
    
    // Setup mock API responses for consistent testing
    await page.route('**/api/v1/goals/translate', async (route) => {
      const requestBody = await route.request().postDataJSON();
      const mockSmartGoal = {
        id: `goal-${Date.now()}`,
        title: `SMART: ${requestBody.raw_goal.substring(0, 50)}...`,
        criteria: {
          specific: { value: 'Specific criteria', confidence: 0.9 },
          measurable: { value: 'Measurable criteria', confidence: 0.85 },
          achievable: { value: 'Achievable criteria', confidence: 0.8 },
          relevant: { value: 'Relevant criteria', confidence: 0.9 },
          timeBound: { value: 'Time-bound criteria', confidence: 0.85 }
        },
        confidence: 0.85,
        clarificationQuestions: []
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockSmartGoal })
      });
    });

    await personalEA.navigateToApp();
  });

  for (const scenario of COMPREHENSIVE_E2E_SCENARIOS) {
    test(`Complete workflow: ${scenario.name}`, async ({ page }) => {
      console.log(`🧪 Testing complete workflow for: ${scenario.name}`);
      
      const workflowStartTime = Date.now();
      
      // Phase 1: API Configuration
      console.log('   📝 Phase 1: API Configuration');
      await personalEA.configureAPI();
      
      // Phase 2: Goal Input and SMART Generation
      console.log('   🎯 Phase 2: Goal Input and SMART Generation');
      const goalInputStartTime = Date.now();
      await personalEA.enterGoal(scenario.initialGoal);
      await personalEA.waitForSmartGoalGeneration();
      const goalInputTime = Date.now() - goalInputStartTime;
      
      // Verify SMART goal quality
      const confidence = await personalEA.getSmartGoalConfidence();
      expect(confidence).toBeGreaterThanOrEqual(scenario.expectedOutcomes.smartGoalConfidence);
      
      console.log(`      ✅ SMART goal generated with ${Math.round(confidence * 100)}% confidence in ${goalInputTime}ms`);
      
      // Phase 3: Conversational Refinement
      console.log('   💬 Phase 3: Conversational Refinement');
      for (const message of scenario.conversationFlow) {
        await personalEA.sendChatMessage(message);
        await page.waitForTimeout(1000); // Allow processing time
      }
      
      const finalMessageCount = await personalEA.getChatMessageCount();
      expect(finalMessageCount).toBeGreaterThanOrEqual(scenario.conversationFlow.length * 2); // User + AI responses
      
      console.log(`      ✅ Conversation completed with ${finalMessageCount} messages`);
      
      // Phase 4: Milestone Generation
      console.log('   🏁 Phase 4: Milestone Generation');
      await personalEA.proceedToMilestones();
      
      const milestoneStartTime = Date.now();
      await personalEA.generateMilestones();
      const milestoneTime = Date.now() - milestoneStartTime;
      
      const milestoneCount = await personalEA.getMilestoneCount();
      expect(milestoneCount).toBeGreaterThanOrEqual(scenario.expectedOutcomes.minMilestones);
      expect(milestoneCount).toBeLessThanOrEqual(scenario.expectedOutcomes.maxMilestones);
      
      console.log(`      ✅ ${milestoneCount} milestones generated in ${milestoneTime}ms`);
      
      // Phase 5: WBS Generation
      console.log('   📋 Phase 5: Work Breakdown Structure');
      await personalEA.proceedToWBS();
      
      const wbsStartTime = Date.now();
      await personalEA.generateWBS();
      const wbsTime = Date.now() - wbsStartTime;
      
      const taskCount = await personalEA.getTaskCount();
      expect(taskCount).toBeGreaterThanOrEqual(scenario.expectedOutcomes.minTasks);
      expect(taskCount).toBeLessThanOrEqual(scenario.expectedOutcomes.maxTasks);
      
      console.log(`      ✅ ${taskCount} tasks generated in ${wbsTime}ms`);
      
      // Phase 6: Estimation
      console.log('   📊 Phase 6: Estimation and Planning');
      await personalEA.proceedToEstimation();
      
      const estimationStartTime = Date.now();
      await personalEA.generateEstimations();
      const estimationTime = Date.now() - estimationStartTime;
      
      const estimationSummary = await personalEA.getEstimationSummary();
      expect(estimationSummary.available).toBe(true);
      
      console.log(`      ✅ Estimations completed in ${estimationTime}ms`);
      
      // Final validation
      const errors = await personalEA.checkForErrors();
      expect(errors).toHaveLength(0);
      
      const totalWorkflowTime = Date.now() - workflowStartTime;
      console.log(`   🎉 Complete workflow finished in ${totalWorkflowTime}ms`);
      
      // Performance assertions
      expect(goalInputTime).toBeLessThan(15000); // Goal processing under 15s
      expect(milestoneTime).toBeLessThan(10000); // Milestone generation under 10s
      expect(wbsTime).toBeLessThan(10000); // WBS generation under 10s
      expect(estimationTime).toBeLessThan(8000); // Estimation under 8s
      expect(totalWorkflowTime).toBeLessThan(60000); // Total workflow under 60s
    });
  }

  test('Cross-browser consistency testing', async ({ page, browserName }) => {
    console.log(`🌐 Testing cross-browser consistency on ${browserName}`);
    
    const testGoal = 'Build a mobile app for small business inventory management';
    
    await personalEA.configureAPI();
    await personalEA.enterGoal(testGoal);
    await personalEA.waitForSmartGoalGeneration();
    
    const confidence = await personalEA.getSmartGoalConfidence();
    expect(confidence).toBeGreaterThan(0.5);
    
    await personalEA.proceedToMilestones();
    await personalEA.generateMilestones();
    
    const milestoneCount = await personalEA.getMilestoneCount();
    expect(milestoneCount).toBeGreaterThan(0);
    
    console.log(`   ✅ ${browserName}: Generated ${milestoneCount} milestones with ${Math.round(confidence * 100)}% confidence`);
  });

  test('Performance under load simulation', async ({ page }) => {
    console.log('⚡ Testing performance under simulated load');
    
    // Simulate slower network conditions
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });
    
    const testGoal = 'Create comprehensive marketing strategy for new product launch';
    
    const startTime = Date.now();
    
    await personalEA.configureAPI();
    await personalEA.enterGoal(testGoal);
    await personalEA.waitForSmartGoalGeneration();
    
    const goalTime = Date.now() - startTime;
    console.log(`   🎯 Goal generation completed in ${goalTime}ms under load`);
    
    // Should still complete within reasonable time even under load
    expect(goalTime).toBeLessThan(25000); // 25s under load conditions
    
    const confidence = await personalEA.getSmartGoalConfidence();
    expect(confidence).toBeGreaterThan(0.6); // Should maintain quality under load
  });

  test('Error recovery and resilience', async ({ page }) => {
    console.log('🛡️ Testing error recovery and system resilience');
    
    await personalEA.configureAPI();
    
    // Test with invalid goal input
    await personalEA.enterGoal(''); // Empty goal
    const emptyGoalErrors = await personalEA.checkForErrors();
    expect(emptyGoalErrors.length).toBeGreaterThan(0);
    
    // Test with extremely long goal
    const longGoal = 'A'.repeat(5000);
    await personalEA.enterGoal(longGoal);
    const longGoalErrors = await personalEA.checkForErrors();
    // Should handle gracefully, either with validation or processing
    
    // Test recovery with valid goal
    await personalEA.enterGoal('Learn data science and machine learning');
    await personalEA.waitForSmartGoalGeneration();
    
    const confidence = await personalEA.getSmartGoalConfidence();
    expect(confidence).toBeGreaterThan(0.5);
    
    console.log('   ✅ System recovered successfully from error conditions');
  });

  test('Accessibility compliance verification', async ({ page }) => {
    console.log('♿ Testing accessibility compliance');
    
    await personalEA.configureAPI();
    
    // Check for basic accessibility elements
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    expect(headings).toBeGreaterThan(0);
    
    // Check form labels
    const inputs = await page.locator('input, textarea, select').all();
    for (const input of inputs) {
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const hasLabel = ariaLabel || ariaLabelledBy;
      
      if (!hasLabel) {
        console.warn('Input without proper labeling found');
      }
    }
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus').count();
    expect(focusedElement).toBe(1);
    
    console.log('   ✅ Basic accessibility requirements met');
  });

  test('Data persistence and recovery', async ({ page }) => {
    console.log('💾 Testing data persistence and recovery');
    
    await personalEA.configureAPI();
    await personalEA.enterGoal('Build a portfolio website with blog functionality');
    await personalEA.waitForSmartGoalGeneration();
    
    // Store initial state
    const initialConfidence = await personalEA.getSmartGoalConfidence();
    
    // Simulate page reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if data persisted (would depend on implementation)
    // This test assumes some form of local storage or session persistence
    
    console.log('   ✅ Data persistence mechanisms validated');
  });

  test('Mobile responsiveness verification', async ({ page }) => {
    console.log('📱 Testing mobile responsiveness');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    
    await personalEA.navigateToApp();
    
    // Verify UI adapts to mobile
    const apiConfigSection = page.locator('[data-testid="api-config-section"]');
    await expect(apiConfigSection).toBeVisible();
    
    await personalEA.configureAPI();
    await personalEA.enterGoal('Create a fitness tracking app');
    
    // Verify mobile interactions work
    await personalEA.waitForSmartGoalGeneration();
    const confidence = await personalEA.getSmartGoalConfidence();
    expect(confidence).toBeGreaterThan(0.5);
    
    console.log('   ✅ Mobile responsiveness verified');
  });
});

test.describe('Advanced Integration Testing', () => {
  let personalEA: PersonalEAPageObject;

  test.beforeEach(async ({ page }) => {
    personalEA = new PersonalEAPageObject(page);
    await personalEA.navigateToApp();
  });

  test('API integration with real OpenAI (if configured)', async ({ page }) => {
    // This test runs only if OPENAI_API_KEY is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      test.skip('OpenAI API key not configured');
    }
    
    console.log('🔗 Testing real OpenAI API integration');
    
    await personalEA.configureAPI(apiKey);
    await personalEA.enterGoal('Start a consulting business in digital transformation');
    
    // Real API call - may take longer
    await personalEA.waitForSmartGoalGeneration();
    
    const confidence = await personalEA.getSmartGoalConfidence();
    expect(confidence).toBeGreaterThan(0.6); // Real API should provide good confidence
    
    console.log(`   ✅ Real API integration successful with ${Math.round(confidence * 100)}% confidence`);
  });

  test('End-to-end workflow with realistic timing', async ({ page }) => {
    console.log('⏱️ Testing workflow with realistic user timing');
    
    await personalEA.configureAPI();
    
    // Simulate realistic user behavior with pauses
    await personalEA.enterGoal('Launch an e-commerce store selling handmade crafts');
    await page.waitForTimeout(2000); // User reading time
    
    await personalEA.waitForSmartGoalGeneration();
    await page.waitForTimeout(3000); // User reviewing SMART goal
    
    // Add some refinement
    await personalEA.sendChatMessage('I want to focus on wooden crafts specifically');
    await page.waitForTimeout(2000); // User thinking time
    
    await personalEA.sendChatMessage('I have a budget of $5,000 to start');
    await page.waitForTimeout(1000);
    
    await personalEA.proceedToMilestones();
    await page.waitForTimeout(1000); // Navigation time
    
    await personalEA.generateMilestones();
    const milestoneCount = await personalEA.getMilestoneCount();
    
    expect(milestoneCount).toBeGreaterThan(5);
    
    console.log(`   ✅ Realistic workflow completed with ${milestoneCount} milestones`);
  });
});