import { test, expect, Page } from '@playwright/test';
import { ApiConfigPage } from './page-objects/ApiConfigPage';
import { GoalInputPage } from './page-objects/GoalInputPage';
import { SmartGoalPage } from './page-objects/SmartGoalPage';
import { MilestonesPage } from './page-objects/MilestonesPage';
import { WBSPage } from './page-objects/WBSPage';
import { EstimationPage } from './page-objects/EstimationPage';
import { TestUtils } from './fixtures/test-utils';
import { TEST_GOALS } from './fixtures/test-data';

// API key from environment or default test key
const API_KEY = process.env.OPENAI_API_KEY || 'test-api-key-automated';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const USE_REAL_API = process.env.USE_REAL_API === 'true';

test.describe('Automated User Testing Suite - Complete User Journey', () => {
  let apiConfigPage: ApiConfigPage;
  let goalInputPage: GoalInputPage;
  let smartGoalPage: SmartGoalPage;
  let milestonesPage: MilestonesPage;
  let wbsPage: WBSPage;
  let estimationPage: EstimationPage;
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    apiConfigPage = new ApiConfigPage(page);
    goalInputPage = new GoalInputPage(page);
    smartGoalPage = new SmartGoalPage(page);
    milestonesPage = new MilestonesPage(page);
    wbsPage = new WBSPage(page);
    estimationPage = new EstimationPage(page);
    testUtils = new TestUtils(page);

    // Navigate to the app
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Clear any previous session data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('User Journey 1: First-time user configures API and creates a simple goal', async ({ page }) => {
    // Step 1: User lands on the app and sees API configuration
    await expect(page.locator('h2:has-text("OpenAI API Key Required")')).toBeVisible();
    
    // Step 2: User enters API key
    const apiKeyInput = page.locator('input[placeholder*="API key"]');
    const saveButton = page.locator('button:has-text("Configure API")');
    
    await apiKeyInput.fill(API_KEY);
    await saveButton.click();
    
    // Step 3: Verify configuration saved and moved to goal input
    await expect(page.locator('h2:has-text("What\'s your goal?")')).toBeVisible();
    
    // Step 4: User enters a simple goal
    const goalTextarea = page.locator('textarea[placeholder*="I want to get better at programming"]');
    await goalTextarea.fill('I want to lose 10 pounds');
    
    // Step 5: User clicks Transform button
    const transformButton = page.locator('button:has-text("Transform into SMART Goal")');
    await transformButton.click();
    
    // Step 6: Verify SMART goal is generated
    await expect(page.locator('h2:has-text("Your SMART Goal")')).toBeVisible({ timeout: 30000 });
    
    // Step 7: Verify all SMART criteria are displayed
    await expect(page.locator('text=Specific')).toBeVisible();
    await expect(page.locator('text=Measurable')).toBeVisible();
    await expect(page.locator('text=Achievable')).toBeVisible();
    await expect(page.locator('text=Relevant')).toBeVisible();
    await expect(page.locator('text=Time-bound')).toBeVisible();
    
    // Take screenshot for documentation
    await page.screenshot({ path: 'test-results/user-journey-1-smart-goal.png' });
  });

  test('User Journey 2: Complete workflow from goal to estimation', async ({ page }) => {
    // Configure API
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    // Enter a business goal
    await goalInputPage.enterGoal('Launch an online course about JavaScript');
    await goalInputPage.clickSubmit();
    
    // Wait for SMART goal generation
    await smartGoalPage.assertSmartGoalDisplayed();
    await page.screenshot({ path: 'test-results/user-journey-2-smart-goal.png' });
    
    // Continue to milestones
    await smartGoalPage.clickContinue();
    await milestonesPage.assertMilestonesDisplayVisible();
    await milestonesPage.clickGenerateMilestones();
    await milestonesPage.assertMilestonesGenerated();
    await page.screenshot({ path: 'test-results/user-journey-2-milestones.png' });
    
    // Continue to WBS
    await milestonesPage.clickContinueToWBS();
    await wbsPage.assertWBSDisplayVisible();
    await wbsPage.clickGenerateWBS();
    await wbsPage.assertWBSGenerated();
    await page.screenshot({ path: 'test-results/user-journey-2-wbs.png' });
    
    // Continue to estimation
    await wbsPage.clickContinueToEstimation();
    await estimationPage.assertEstimationDisplayVisible();
    await estimationPage.clickGenerateEstimates();
    await estimationPage.assertEstimationsGenerated();
    await page.screenshot({ path: 'test-results/user-journey-2-estimation.png' });
    
    // Verify complete workflow
    const summaryReport = await estimationPage.getSummaryReport();
    expect(summaryReport).toBeTruthy();
  });

  test('User Journey 3: Using example goals', async ({ page }) => {
    // Configure API
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    // Click on an example goal
    const exampleButton = page.locator('button:has-text("I want to get promoted to senior developer")');
    await exampleButton.click();
    
    // Verify the goal is populated
    const goalTextarea = page.locator('textarea[id="goal"]');
    await expect(goalTextarea).toHaveValue('I want to get promoted to senior developer');
    
    // Submit the goal
    await goalInputPage.clickSubmit();
    
    // Verify SMART goal generation
    await smartGoalPage.assertSmartGoalDisplayed();
    
    // Verify career-specific elements
    const smartGoalText = await page.locator('[data-testid="smart-goal-text"]').textContent();
    expect(smartGoalText).toContain('senior developer');
  });

  test('User Journey 4: Testing various goal types', async ({ page }) => {
    // Configure API once
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    const goalTypes = [
      { input: 'I want to save money', expectedKeywords: ['save', 'financial', 'budget'] },
      { input: 'Learn Spanish fluently', expectedKeywords: ['Spanish', 'fluent', 'language'] },
      { input: 'Start a small business', expectedKeywords: ['business', 'revenue', 'launch'] },
      { input: 'Run a marathon', expectedKeywords: ['marathon', 'running', 'training'] }
    ];
    
    for (const goal of goalTypes) {
      // Reset workflow
      await page.locator('button:has-text("Start Over")').click();
      
      // Enter goal
      await goalInputPage.enterGoal(goal.input);
      await goalInputPage.clickSubmit();
      
      // Verify SMART goal contains expected keywords
      await smartGoalPage.assertSmartGoalDisplayed();
      const smartGoalText = await page.locator('[data-testid="smart-goal-text"]').textContent();
      
      for (const keyword of goal.expectedKeywords) {
        expect(smartGoalText?.toLowerCase()).toContain(keyword.toLowerCase());
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/goal-type-${goal.input.replace(/\s+/g, '-').toLowerCase()}.png` 
      });
    }
  });

  test('User Journey 5: Error handling and recovery', async ({ page }) => {
    // Test 1: Invalid API configuration
    await apiConfigPage.configureApi('invalid-key', 'http://invalid-url');
    await goalInputPage.enterGoal('Test goal');
    await goalInputPage.clickSubmit();
    
    // Should show error
    await expect(page.locator('text=/error|failed/i')).toBeVisible({ timeout: 10000 });
    
    // Test 2: Recovery - fix API configuration
    await page.locator('button[data-testid="step-0"]').click(); // Go back to API config
    await apiConfigPage.configureApi(API_KEY, API_URL);
    await goalInputPage.enterGoal('Test goal after recovery');
    await goalInputPage.clickSubmit();
    
    // Should work now
    await smartGoalPage.assertSmartGoalDisplayed();
  });

  test('User Journey 6: Mobile user experience', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Configure API
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    // Enter goal on mobile
    await goalInputPage.enterGoal('Get fit and healthy');
    await goalInputPage.clickSubmit();
    
    // Verify responsive design
    await smartGoalPage.assertSmartGoalDisplayed();
    
    // Check that UI elements are properly sized for mobile
    const continueButton = page.locator('button:has-text("Continue to Milestones")');
    const buttonBox = await continueButton.boundingBox();
    expect(buttonBox?.width).toBeGreaterThan(200); // Minimum touch target
    
    await page.screenshot({ path: 'test-results/mobile-user-experience.png' });
  });

  test('User Journey 7: Performance testing', async ({ page }) => {
    // Configure API
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    // Measure goal transformation time
    const startTime = Date.now();
    await goalInputPage.enterGoal('Build a successful online business');
    await goalInputPage.clickSubmit();
    await smartGoalPage.assertSmartGoalDisplayed();
    const transformTime = Date.now() - startTime;
    
    // Goal transformation should complete within 30 seconds
    expect(transformTime).toBeLessThan(30000);
    
    // Continue through full workflow measuring each phase
    const milestoneStartTime = Date.now();
    await smartGoalPage.clickContinue();
    await milestonesPage.clickGenerateMilestones();
    await milestonesPage.assertMilestonesGenerated();
    const milestoneTime = Date.now() - milestoneStartTime;
    expect(milestoneTime).toBeLessThan(20000);
    
    // Log performance metrics
    console.log(`Performance Metrics:
      - Goal Transformation: ${transformTime}ms
      - Milestone Generation: ${milestoneTime}ms
    `);
  });

  test('User Journey 8: Keyboard navigation accessibility', async ({ page }) => {
    // Navigate using only keyboard
    await page.keyboard.press('Tab'); // Focus API key input
    await page.keyboard.type(API_KEY);
    await page.keyboard.press('Tab'); // Focus API URL input
    await page.keyboard.type(API_URL);
    await page.keyboard.press('Tab'); // Focus save button
    await page.keyboard.press('Enter'); // Save configuration
    
    // Wait for goal input page
    await expect(page.locator('textarea[id="goal"]')).toBeFocused({ timeout: 5000 });
    
    // Enter goal using keyboard
    await page.keyboard.type('I want to learn web development');
    await page.keyboard.press('Tab'); // Focus transform button
    await page.keyboard.press('Enter'); // Submit goal
    
    // Verify SMART goal is displayed
    await smartGoalPage.assertSmartGoalDisplayed();
  });

  test('User Journey 9: Data persistence and session recovery', async ({ page }) => {
    // Configure API and start workflow
    await apiConfigPage.configureApi(API_KEY, API_URL);
    await goalInputPage.enterGoal('Create a mobile app');
    await goalInputPage.clickSubmit();
    await smartGoalPage.assertSmartGoalDisplayed();
    
    // Save current state
    const goalData = await page.evaluate(() => {
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
    
    expect(restoredData.localStorage).toEqual(goalData.localStorage);
  });

  test('User Journey 10: Complete workflow validation', async ({ page }) => {
    // This test validates the entire user workflow from start to finish
    const testReport = {
      startTime: Date.now(),
      phases: [] as any[],
      errors: [] as any[],
      success: false
    };
    
    try {
      // Phase 1: API Configuration
      await apiConfigPage.configureApi(API_KEY, API_URL);
      testReport.phases.push({ phase: 'API Configuration', status: 'completed' });
      
      // Phase 2: Goal Input
      await goalInputPage.enterGoal('Become a successful freelance consultant');
      await goalInputPage.clickSubmit();
      testReport.phases.push({ phase: 'Goal Input', status: 'completed' });
      
      // Phase 3: SMART Goal Generation
      await smartGoalPage.assertSmartGoalDisplayed();
      await smartGoalPage.assertAllCriteriaPresent();
      const confidenceScore = await smartGoalPage.getConfidenceScore();
      testReport.phases.push({ 
        phase: 'SMART Goal Generation', 
        status: 'completed',
        confidenceScore 
      });
      
      // Phase 4: Milestone Generation
      await smartGoalPage.clickContinue();
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      const milestoneCount = await milestonesPage.getMilestoneCount();
      testReport.phases.push({ 
        phase: 'Milestone Generation', 
        status: 'completed',
        milestoneCount 
      });
      
      // Phase 5: WBS Generation
      await milestonesPage.clickContinueToWBS();
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
      const taskCount = await wbsPage.getTaskCount();
      testReport.phases.push({ 
        phase: 'WBS Generation', 
        status: 'completed',
        taskCount 
      });
      
      // Phase 6: Estimation
      await wbsPage.clickContinueToEstimation();
      await estimationPage.clickGenerateEstimates();
      await estimationPage.assertEstimationsGenerated();
      testReport.phases.push({ phase: 'Estimation', status: 'completed' });
      
      testReport.success = true;
      testReport.endTime = Date.now();
      testReport.totalDuration = testReport.endTime - testReport.startTime;
      
    } catch (error) {
      testReport.errors.push({
        phase: 'Unknown',
        error: error.message,
        timestamp: Date.now()
      });
    }
    
    // Save test report
    await page.evaluate((report) => {
      localStorage.setItem('automated-test-report', JSON.stringify(report));
    }, testReport);
    
    // Verify success
    expect(testReport.success).toBe(true);
    expect(testReport.phases.length).toBe(6);
    
    // Generate final report screenshot
    await page.screenshot({ 
      path: 'test-results/complete-workflow-validation.png',
      fullPage: true 
    });
  });
});

// Additional test suite for edge cases and stress testing
test.describe('Edge Cases and Stress Testing', () => {
  test('Handle extremely long goals', async ({ page }) => {
    const apiConfigPage = new ApiConfigPage(page);
    const goalInputPage = new GoalInputPage(page);
    const smartGoalPage = new SmartGoalPage(page);
    
    await page.goto('/');
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    // Create a very long goal
    const longGoal = 'I want to ' + 'achieve success in multiple areas including '.repeat(20) + 'and finally be happy';
    await goalInputPage.enterGoal(longGoal);
    await goalInputPage.clickSubmit();
    
    // Should still process successfully
    await smartGoalPage.assertSmartGoalDisplayed();
  });

  test('Handle special characters and emojis', async ({ page }) => {
    const apiConfigPage = new ApiConfigPage(page);
    const goalInputPage = new GoalInputPage(page);
    const smartGoalPage = new SmartGoalPage(page);
    
    await page.goto('/');
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    // Goal with special characters and emojis
    const specialGoal = 'I want to earn $100,000/year & travel to 10+ countries! 🌍✈️';
    await goalInputPage.enterGoal(specialGoal);
    await goalInputPage.clickSubmit();
    
    // Should handle gracefully
    await smartGoalPage.assertSmartGoalDisplayed();
  });

  test('Rapid successive submissions', async ({ page }) => {
    const apiConfigPage = new ApiConfigPage(page);
    const goalInputPage = new GoalInputPage(page);
    
    await page.goto('/');
    await apiConfigPage.configureApi(API_KEY, API_URL);
    
    // Try rapid submissions
    await goalInputPage.enterGoal('Quick goal 1');
    await goalInputPage.clickSubmit();
    
    // Immediately try another
    await page.locator('button:has-text("Start Over")').click();
    await goalInputPage.enterGoal('Quick goal 2');
    await goalInputPage.clickSubmit();
    
    // Should handle without crashes
    await expect(page.locator('h2')).toBeVisible();
  });
});