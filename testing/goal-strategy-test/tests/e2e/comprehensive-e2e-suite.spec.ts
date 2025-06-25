import { test, expect, Page, BrowserContext } from '@playwright/test';
import { ApiConfigPage } from './page-objects/ApiConfigPage';
import { GoalInputPage } from './page-objects/GoalInputPage';
import { SmartGoalPage } from './page-objects/SmartGoalPage';
import { MilestonesPage } from './page-objects/MilestonesPage';
import { WBSPage } from './page-objects/WBSPage';
import { EstimationPage } from './page-objects/EstimationPage';

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev/';
const API_KEY = process.env.OPENAI_API_KEY || 'test-api-key-e2e';
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Test data
const TEST_SCENARIOS = [
  {
    name: 'Personal Development Goal',
    goal: 'I want to learn Python programming',
    expectedKeywords: ['Python', 'programming', 'learn', 'skills'],
    category: 'learning'
  },
  {
    name: 'Business Goal',
    goal: 'Launch an online store selling handmade crafts',
    expectedKeywords: ['online store', 'business', 'sales', 'revenue'],
    category: 'business'
  },
  {
    name: 'Health & Fitness Goal',
    goal: 'Run a marathon in 6 months',
    expectedKeywords: ['marathon', 'running', 'training', 'fitness'],
    category: 'health'
  },
  {
    name: 'Financial Goal',
    goal: 'Save $10,000 for emergency fund',
    expectedKeywords: ['save', 'emergency fund', 'financial', 'money'],
    category: 'finance'
  },
  {
    name: 'Career Goal',
    goal: 'Get promoted to senior software engineer',
    expectedKeywords: ['promotion', 'senior', 'career', 'professional'],
    category: 'career'
  }
];

test.describe('Comprehensive E2E Test Suite', () => {
  let context: BrowserContext;
  let page: Page;
  let apiConfigPage: ApiConfigPage;
  let goalInputPage: GoalInputPage;
  let smartGoalPage: SmartGoalPage;
  let milestonesPage: MilestonesPage;
  let wbsPage: WBSPage;
  let estimationPage: EstimationPage;

  test.beforeAll(async ({ browser }) => {
    // Create a persistent context for the entire test suite
    context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: 'test-results/videos/',
        size: { width: 1280, height: 720 }
      }
    });
  });

  test.beforeEach(async () => {
    // Create a new page for each test
    page = await context.newPage();
    
    // Initialize page objects
    apiConfigPage = new ApiConfigPage(page);
    goalInputPage = new GoalInputPage(page);
    smartGoalPage = new SmartGoalPage(page);
    milestonesPage = new MilestonesPage(page);
    wbsPage = new WBSPage(page);
    estimationPage = new EstimationPage(page);

    // Set up console error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });

    // Monitor network failures
    page.on('requestfailed', request => {
      console.error('Request failed:', request.url(), request.failure()?.errorText);
    });

    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.afterEach(async () => {
    // Take screenshot on failure
    if (test.info().status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/failure-${test.info().title.replace(/\s+/g, '-')}.png`,
        fullPage: true
      });
    }
    
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('01. Initial page load and API configuration', async () => {
    console.log('🚀 Test 01: Initial page load and API configuration');
    
    // Navigate to the application
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Verify page loaded
    await expect(page).toHaveTitle(/Goal.*Strategy|PersonalEA/i);
    
    // Check for API configuration section
    const apiSection = page.locator('text=/API.*Configuration|OpenAI.*API.*Key/i');
    await expect(apiSection).toBeVisible();
    
    // Configure API
    await apiConfigPage.fillApiKey(API_KEY);
    await apiConfigPage.clickSave();
    
    // Verify configuration success
    const successMessage = page.locator('text=/configured|ready|success/i');
    await expect(successMessage).toBeVisible({ timeout: 30000 });
    
    console.log('✅ API configuration completed');
  });

  test('02. Complete workflow for learning goal', async () => {
    console.log('🚀 Test 02: Complete workflow for learning goal');
    
    await page.goto('/');
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    // Enter learning goal
    const scenario = TEST_SCENARIOS[0]; // Python programming
    await goalInputPage.enterGoal(scenario.goal);
    await goalInputPage.clickSubmit();
    
    // Verify SMART goal
    await smartGoalPage.assertSmartGoalDisplayed();
    const smartGoalText = await page.locator('[data-testid="smart-goal-text"]').textContent();
    
    for (const keyword of scenario.expectedKeywords) {
      expect(smartGoalText?.toLowerCase()).toContain(keyword.toLowerCase());
    }
    
    // Continue to milestones
    await smartGoalPage.clickContinue();
    await milestonesPage.assertMilestonesDisplayVisible();
    await milestonesPage.clickGenerateMilestones();
    await milestonesPage.assertMilestonesGenerated();
    
    const milestoneCount = await milestonesPage.getMilestoneCount();
    expect(milestoneCount).toBeGreaterThan(0);
    expect(milestoneCount).toBeLessThanOrEqual(10);
    
    // Continue to WBS
    await milestonesPage.clickContinueToWBS();
    await wbsPage.assertWBSDisplayVisible();
    await wbsPage.clickGenerateWBS();
    await wbsPage.assertWBSGenerated();
    
    const taskCount = await wbsPage.getTaskCount();
    expect(taskCount).toBeGreaterThan(milestoneCount);
    
    // Continue to estimation
    await wbsPage.clickContinueToEstimation();
    await estimationPage.assertEstimationDisplayVisible();
    await estimationPage.clickGenerateEstimates();
    await estimationPage.assertEstimationsGenerated();
    
    console.log('✅ Complete workflow executed successfully');
  });

  test('03. Batch testing multiple goal types', async () => {
    console.log('🚀 Test 03: Batch testing multiple goal types');
    
    await page.goto('/');
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    const results = [];
    
    for (const scenario of TEST_SCENARIOS) {
      console.log(`📋 Testing: ${scenario.name}`);
      
      // Reset to start
      const startOverButton = page.locator('button:has-text("Start Over")');
      if (await startOverButton.isVisible()) {
        await startOverButton.click();
      }
      
      // Enter goal
      await goalInputPage.enterGoal(scenario.goal);
      await goalInputPage.clickSubmit();
      
      // Wait for SMART goal
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Capture results
      const smartGoalText = await page.locator('[data-testid="smart-goal-text"]').textContent() || '';
      const confidence = await smartGoalPage.getConfidenceScore();
      
      results.push({
        scenario: scenario.name,
        category: scenario.category,
        originalGoal: scenario.goal,
        smartGoal: smartGoalText.substring(0, 100) + '...',
        confidence: confidence,
        keywordsFound: scenario.expectedKeywords.filter(kw => 
          smartGoalText.toLowerCase().includes(kw.toLowerCase())
        ).length,
        totalKeywords: scenario.expectedKeywords.length
      });
      
      // Take screenshot
      await page.screenshot({
        path: `test-results/screenshots/goal-${scenario.category}.png`
      });
    }
    
    // Log results
    console.log('\n📊 Batch Test Results:');
    console.table(results);
    
    // Verify all scenarios passed
    for (const result of results) {
      expect(result.keywordsFound).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    }
  });

  test('04. Error recovery and edge cases', async () => {
    console.log('🚀 Test 04: Error recovery and edge cases');
    
    await page.goto('/');
    
    // Test 1: Empty goal submission
    await apiConfigPage.configureApi(API_KEY, API_URL);
    await goalInputPage.clickSubmit(); // Without entering goal
    
    const emptyError = page.locator('text=/enter.*goal|required/i');
    await expect(emptyError).toBeVisible();
    
    // Test 2: Very short goal
    await goalInputPage.enterGoal('xyz');
    await goalInputPage.clickSubmit();
    
    // Should either show error or process it
    await page.waitForSelector('[data-testid="smart-goal-text"], [data-testid="error-message"]', { timeout: 30000 });
    
    // Test 3: Very long goal
    const longGoal = 'I want to ' + 'achieve many things and '.repeat(50) + 'be successful';
    await page.locator('button:has-text("Start Over")').click();
    await goalInputPage.enterGoal(longGoal);
    await goalInputPage.clickSubmit();
    
    // Should handle gracefully
    await smartGoalPage.assertSmartGoalDisplayed();
    
    // Test 4: Special characters
    await page.locator('button:has-text("Start Over")').click();
    await goalInputPage.enterGoal('I want to earn $$$$ & become #1!!!');
    await goalInputPage.clickSubmit();
    
    // Should process without crashing
    await smartGoalPage.assertSmartGoalDisplayed();
    
    console.log('✅ Error recovery tests passed');
  });

  test('05. Performance benchmarks', async () => {
    console.log('🚀 Test 05: Performance benchmarks');
    
    const metrics = {
      pageLoad: 0,
      apiConfig: 0,
      goalTransform: 0,
      milestoneGen: 0,
      wbsGen: 0,
      estimationGen: 0
    };
    
    // Page load
    const loadStart = Date.now();
    await page.goto('/');
    metrics.pageLoad = Date.now() - loadStart;
    
    // API configuration
    const configStart = Date.now();
    await apiConfigPage.configureApi(API_KEY, API_URL);
    metrics.apiConfig = Date.now() - configStart;
    
    // Goal transformation
    const goalStart = Date.now();
    await goalInputPage.enterGoal('Create a mobile app for task management');
    await goalInputPage.clickSubmit();
    await smartGoalPage.assertSmartGoalDisplayed();
    metrics.goalTransform = Date.now() - goalStart;
    
    // Milestone generation
    const milestoneStart = Date.now();
    await smartGoalPage.clickContinue();
    await milestonesPage.clickGenerateMilestones();
    await milestonesPage.assertMilestonesGenerated();
    metrics.milestoneGen = Date.now() - milestoneStart;
    
    // WBS generation
    const wbsStart = Date.now();
    await milestonesPage.clickContinueToWBS();
    await wbsPage.clickGenerateWBS();
    await wbsPage.assertWBSGenerated();
    metrics.wbsGen = Date.now() - wbsStart;
    
    // Estimation generation
    const estimationStart = Date.now();
    await wbsPage.clickContinueToEstimation();
    await estimationPage.clickGenerateEstimates();
    await estimationPage.assertEstimationsGenerated();
    metrics.estimationGen = Date.now() - estimationStart;
    
    // Log performance metrics
    console.log('\n⏱️ Performance Metrics:');
    console.table(metrics);
    
    // Performance assertions
    expect(metrics.pageLoad).toBeLessThan(10000); // 10s
    expect(metrics.goalTransform).toBeLessThan(30000); // 30s
    expect(metrics.milestoneGen).toBeLessThan(20000); // 20s
    expect(metrics.wbsGen).toBeLessThan(20000); // 20s
    expect(metrics.estimationGen).toBeLessThan(20000); // 20s
  });

  test('06. Accessibility compliance', async () => {
    console.log('🚀 Test 06: Accessibility compliance');
    
    await page.goto('/');
    
    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for form labels
    const inputs = await page.locator('input, textarea').count();
    const labels = await page.locator('label').count();
    expect(labels).toBeGreaterThan(0);
    
    // Check for button accessibility
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }
    
    // Check contrast (basic check)
    await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues = [];
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const fg = style.color;
        
        // Basic check for very low contrast
        if (bg === fg && bg !== 'rgba(0, 0, 0, 0)') {
          issues.push({
            element: el.tagName,
            issue: 'Same background and foreground color'
          });
        }
      });
      
      return issues;
    }).then(issues => {
      expect(issues).toHaveLength(0);
    });
    
    console.log('✅ Accessibility checks passed');
  });

  test('07. Network resilience', async () => {
    console.log('🚀 Test 07: Network resilience');
    
    await page.goto('/');
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    // Simulate slow network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000); // 1s delay
    });
    
    // Try goal transformation
    await goalInputPage.enterGoal('Build a website');
    await goalInputPage.clickSubmit();
    
    // Should still work with slow network
    await smartGoalPage.assertSmartGoalDisplayed();
    
    // Clear route
    await page.unroute('**/*');
    
    // Simulate network failure for non-critical resources
    await page.route('**/*.png', route => route.abort());
    await page.route('**/*.jpg', route => route.abort());
    
    // Core functionality should still work
    await page.locator('button:has-text("Start Over")').click();
    await goalInputPage.enterGoal('Learn guitar');
    await goalInputPage.clickSubmit();
    await smartGoalPage.assertSmartGoalDisplayed();
    
    console.log('✅ Network resilience verified');
  });

  test('08. Data persistence and session management', async () => {
    console.log('🚀 Test 08: Data persistence and session management');
    
    await page.goto('/');
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    // Create a goal and progress through workflow
    await goalInputPage.enterGoal('Start a podcast');
    await goalInputPage.clickSubmit();
    await smartGoalPage.assertSmartGoalDisplayed();
    
    // Save current state
    const sessionData = await page.evaluate(() => {
      return {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      };
    });
    
    // Reload page
    await page.reload();
    
    // Verify data persists
    const restoredData = await page.evaluate(() => {
      return {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      };
    });
    
    expect(Object.keys(restoredData.localStorage).length).toBeGreaterThan(0);
    
    // Verify API configuration persisted
    const configState = page.locator('text=/API Configuration Set/i');
    await expect(configState).toBeVisible();
    
    console.log('✅ Data persistence verified');
  });

  test('09. Mobile responsiveness', async () => {
    console.log('🚀 Test 09: Mobile responsiveness');
    
    // Test different viewport sizes
    const viewports = [
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad', width: 820, height: 1180 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      console.log(`📱 Testing ${viewport.name} viewport`);
      
      await page.setViewportSize(viewport);
      await page.goto('/');
      
      // Verify layout adapts
      const mainContent = page.locator('main, [role="main"], .container');
      await expect(mainContent).toBeVisible();
      
      // Check button sizes for touch targets
      const buttons = await page.locator('button').all();
      for (const button of buttons.slice(0, 3)) { // Check first 3 buttons
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44); // Min touch target
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
      
      await page.screenshot({
        path: `test-results/screenshots/responsive-${viewport.name.replace(/\s+/g, '-')}.png`
      });
    }
    
    console.log('✅ Mobile responsiveness verified');
  });

  test('10. Full integration test with real API', async () => {
    console.log('🚀 Test 10: Full integration test');
    
    // Skip if not using real API
    if (!process.env.USE_REAL_API) {
      test.skip();
      return;
    }
    
    await page.goto('/');
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    const testReport = {
      timestamp: new Date().toISOString(),
      phases: [],
      totalDuration: 0,
      success: false
    };
    
    const startTime = Date.now();
    
    try {
      // Phase 1: Goal Input
      await goalInputPage.enterGoal('Become a successful entrepreneur');
      await goalInputPage.clickSubmit();
      testReport.phases.push({ phase: 'Goal Input', duration: Date.now() - startTime });
      
      // Phase 2: SMART Goal
      await smartGoalPage.assertSmartGoalDisplayed();
      await smartGoalPage.assertAllCriteriaPresent();
      testReport.phases.push({ phase: 'SMART Goal', duration: Date.now() - startTime });
      
      // Phase 3: Milestones
      await smartGoalPage.clickContinue();
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      testReport.phases.push({ phase: 'Milestones', duration: Date.now() - startTime });
      
      // Phase 4: WBS
      await milestonesPage.clickContinueToWBS();
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
      testReport.phases.push({ phase: 'WBS', duration: Date.now() - startTime });
      
      // Phase 5: Estimation
      await wbsPage.clickContinueToEstimation();
      await estimationPage.clickGenerateEstimates();
      await estimationPage.assertEstimationsGenerated();
      testReport.phases.push({ phase: 'Estimation', duration: Date.now() - startTime });
      
      testReport.totalDuration = Date.now() - startTime;
      testReport.success = true;
      
    } catch (error) {
      testReport.error = error.message;
    }
    
    // Save report
    await page.evaluate((report) => {
      localStorage.setItem('integration-test-report', JSON.stringify(report));
    }, testReport);
    
    console.log('\n📊 Integration Test Report:');
    console.log(JSON.stringify(testReport, null, 2));
    
    expect(testReport.success).toBe(true);
  });
});

// Additional test suite for stress testing
test.describe('Stress Testing', () => {
  test('Concurrent user simulation', async ({ browser }) => {
    console.log('🚀 Stress test: Concurrent user simulation');
    
    const userCount = 5;
    const contexts = [];
    const results = [];
    
    // Create multiple browser contexts
    for (let i = 0; i < userCount; i++) {
      const context = await browser.newContext();
      contexts.push(context);
    }
    
    // Run tests concurrently
    const promises = contexts.map(async (context, index) => {
      const page = await context.newPage();
      const startTime = Date.now();
      
      try {
        await page.goto(BASE_URL);
        
        // Each user performs different action
        const actions = [
          'Learn web development',
          'Start a business',
          'Get fit and healthy',
          'Save money for retirement',
          'Improve leadership skills'
        ];
        
        const apiConfig = new ApiConfigPage(page);
        const goalInput = new GoalInputPage(page);
        
        await apiConfig.configureApi(API_KEY, API_URL);
        await goalInput.enterGoal(actions[index]);
        await goalInput.clickSubmit();
        
        // Wait for response
        await page.waitForSelector('[data-testid="smart-goal-text"]', { timeout: 60000 });
        
        results.push({
          user: index + 1,
          action: actions[index],
          duration: Date.now() - startTime,
          success: true
        });
        
      } catch (error) {
        results.push({
          user: index + 1,
          action: actions[index],
          duration: Date.now() - startTime,
          success: false,
          error: error.message
        });
      } finally {
        await page.close();
      }
    });
    
    await Promise.all(promises);
    
    // Clean up
    for (const context of contexts) {
      await context.close();
    }
    
    // Analyze results
    console.log('\n📊 Concurrent User Test Results:');
    console.table(results);
    
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBeGreaterThan(userCount * 0.8); // 80% success rate
  });
});