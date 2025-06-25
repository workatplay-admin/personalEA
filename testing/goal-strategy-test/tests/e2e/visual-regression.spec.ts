import { test, expect } from '@playwright/test';
import { ApiConfigPage } from './page-objects/ApiConfigPage';
import { GoalInputPage } from './page-objects/GoalInputPage';
import { SmartGoalPage } from './page-objects/SmartGoalPage';
import { MilestonesPage } from './page-objects/MilestonesPage';
import { WBSPage } from './page-objects/WBSPage';
import { EstimationPage } from './page-objects/EstimationPage';
import { TestUtils } from './fixtures/test-utils';
import { TEST_GOALS } from './fixtures/test-data';

test.describe('Visual Regression Testing', () => {
  let apiConfigPage: ApiConfigPage;
  let goalInputPage: GoalInputPage;
  let smartGoalPage: SmartGoalPage;
  let milestonesPage: MilestonesPage;
  let wbsPage: WBSPage;
  let estimationPage: EstimationPage;
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    apiConfigPage = new ApiConfigPage(page);
    goalInputPage = new GoalInputPage(page);
    smartGoalPage = new SmartGoalPage(page);
    milestonesPage = new MilestonesPage(page);
    wbsPage = new WBSPage(page);
    estimationPage = new EstimationPage(page);
    testUtils = new TestUtils(page);

    // Setup consistent testing environment
    await testUtils.setupMockAPI();
    await page.goto('/');
  });

  test.describe('Phase 1 Visual Regression', () => {
    test('should match API configuration page layout', async ({ page }) => {
      await apiConfigPage.assertConfigurationVisible();
      
      // Take screenshot of API config page
      await expect(page).toHaveScreenshot('api-config-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match goal input page layout', async ({ page }) => {
      await testUtils.setupApiConfig();
      await goalInputPage.assertFormVisible();
      
      // Take screenshot of goal input page
      await expect(page).toHaveScreenshot('goal-input-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match goal input with example goals', async ({ page }) => {
      await testUtils.setupApiConfig();
      await goalInputPage.assertExampleGoalsVisible();
      
      // Expand example goals section if needed
      const exampleSection = page.locator('[data-testid="example-goals"]');
      await exampleSection.scrollIntoViewIfNeeded();
      
      await expect(page).toHaveScreenshot('goal-input-with-examples.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match SMART goal display layout', async ({ page }) => {
      await testUtils.setupApiConfig();
      const testGoal = TEST_GOALS.find(g => g.id === 'business-revenue-smart')!;
      
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Take screenshot of SMART goal display
      await expect(page).toHaveScreenshot('smart-goal-display.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match SMART goal with chat interface', async ({ page }) => {
      await testUtils.setupApiConfig();
      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Open chat refinement interface
      await smartGoalPage.clickRefine();
      
      await expect(page).toHaveScreenshot('smart-goal-with-chat.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Phase 2 Visual Regression', () => {
    test.beforeEach(async () => {
      await testUtils.setupApiConfig();
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.completeSmartGoalPhase();
    });

    test('should match milestones page initial state', async ({ page }) => {
      await milestonesPage.assertMilestonesDisplayVisible();
      
      await expect(page).toHaveScreenshot('milestones-initial.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match milestones after generation', async ({ page }) => {
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      
      // Ensure all milestones are visible
      const milestoneCount = await milestonesPage.getMilestoneCount();
      if (milestoneCount > 0) {
        const lastMilestone = milestonesPage.milestoneCards.last();
        await lastMilestone.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500); // Allow scroll animation to complete
      }
      
      await expect(page).toHaveScreenshot('milestones-generated.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match milestone editor interface', async ({ page }) => {
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      
      await milestonesPage.clickEditMilestone(0);
      await milestonesPage.assertMilestoneEditorVisible();
      
      await expect(page).toHaveScreenshot('milestone-editor.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Phase 3 Visual Regression', () => {
    test.beforeEach(async () => {
      await testUtils.setupApiConfig();
      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.completeSmartGoalPhase();
      await milestonesPage.completeMilestonesPhase();
    });

    test('should match WBS page initial state', async ({ page }) => {
      await wbsPage.assertWBSDisplayVisible();
      
      await expect(page).toHaveScreenshot('wbs-initial.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match WBS hierarchical tree view', async ({ page }) => {
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
      
      // Expand all tasks to show full hierarchy
      await wbsPage.clickExpandAll();
      
      // Ensure all tasks are visible
      const taskCount = await wbsPage.getTaskCount();
      if (taskCount > 0) {
        const lastTask = wbsPage.taskCards.last();
        await lastTask.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
      }
      
      await expect(page).toHaveScreenshot('wbs-hierarchy-expanded.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match WBS dependency graph view', async ({ page }) => {
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
      
      // Switch to dependency view
      await wbsPage.switchToDependencyView();
      
      // Wait for graph to render
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('wbs-dependency-graph.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match estimation page layout', async ({ page }) => {
      await wbsPage.completeWBSPhase();
      await estimationPage.assertEstimationDisplayVisible();
      
      await expect(page).toHaveScreenshot('estimation-initial.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match estimation results display', async ({ page }) => {
      await wbsPage.completeWBSPhase();
      await estimationPage.clickGenerateEstimates();
      await estimationPage.assertEstimationsGenerated();
      
      // Ensure all estimation results are visible
      const estimationCount = await estimationPage.getTaskEstimationCount();
      if (estimationCount > 0) {
        const lastEstimation = estimationPage.taskEstimations.last();
        await lastEstimation.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
      }
      
      await expect(page).toHaveScreenshot('estimation-results.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match estimation summary report', async ({ page }) => {
      await wbsPage.completeWBSPhase();
      await estimationPage.clickGenerateEstimates();
      await estimationPage.assertSummaryReport();
      
      // Scroll to summary report
      const summaryReport = estimationPage.summaryReport;
      await summaryReport.scrollIntoViewIfNeeded();
      
      await expect(page).toHaveScreenshot('estimation-summary.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Responsive Design Visual Testing', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1200, height: 800 },
      { name: 'wide', width: 1920, height: 1080 }
    ];

    viewports.forEach(viewport => {
      test(`should match goal input layout on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        await testUtils.setupApiConfig();
        await goalInputPage.assertFormVisible();
        
        await expect(page).toHaveScreenshot(`goal-input-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
      });

      test(`should match SMART goal display on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        await testUtils.setupApiConfig();
        const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
        
        await goalInputPage.submitGoal(testGoal.input);
        await smartGoalPage.assertSmartGoalDisplayed();
        
        await expect(page).toHaveScreenshot(`smart-goal-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
      });
    });
  });

  test.describe('Dark Mode Visual Testing', () => {
    test.beforeEach(async ({ page }) => {
      // Enable dark mode if supported
      await page.emulateMedia({ colorScheme: 'dark' });
    });

    test('should match dark mode goal input page', async ({ page }) => {
      await testUtils.setupApiConfig();
      await goalInputPage.assertFormVisible();
      
      await expect(page).toHaveScreenshot('goal-input-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match dark mode SMART goal display', async ({ page }) => {
      await testUtils.setupApiConfig();
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.assertSmartGoalDisplayed();
      
      await expect(page).toHaveScreenshot('smart-goal-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match dark mode milestones page', async ({ page }) => {
      await testUtils.setupApiConfig();
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.completeSmartGoalPhase();
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      
      await expect(page).toHaveScreenshot('milestones-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Error State Visual Testing', () => {
    test('should match API configuration error state', async ({ page }) => {
      await apiConfigPage.fillApiKey('');
      await apiConfigPage.clickSave();
      
      // Wait for validation error to appear
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('api-config-error.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match goal input validation error', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      await goalInputPage.enterGoal('hi'); // Too short
      await goalInputPage.clickSubmit();
      
      // Wait for validation error
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('goal-input-validation-error.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match API error state', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      // Mock API error
      await testUtils.mockApiError('/api/smart-goal', 500, 'Service temporarily unavailable');
      
      await goalInputPage.enterGoal('Test goal for error state');
      await goalInputPage.clickSubmit();
      
      // Wait for error message to appear
      await page.waitForTimeout(2000);
      
      await expect(page).toHaveScreenshot('api-error-state.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Loading State Visual Testing', () => {
    test('should match loading state during SMART goal generation', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      // Slow down API response to capture loading state
      await page.route('**/api/smart-goal', async route => {
        // Delay response to capture loading state
        await page.waitForTimeout(1000);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { /* minimal mock data */ }
          })
        });
      });
      
      await goalInputPage.enterGoal('Test goal for loading state');
      await goalInputPage.clickSubmit();
      
      // Capture loading state
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
      await expect(loadingSpinner).toBeVisible();
      
      await expect(page).toHaveScreenshot('smart-goal-loading.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match loading state during milestone generation', async ({ page }) => {
      await testUtils.setupApiConfig();
      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.completeSmartGoalPhase();
      
      // Slow down milestone API response
      await page.route('**/api/milestones', async route => {
        await page.waitForTimeout(1000);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: []
          })
        });
      });
      
      await milestonesPage.clickGenerateMilestones();
      
      // Capture loading state
      const loadingSpinner = page.locator('[data-testid="milestones-loading"]');
      await expect(loadingSpinner).toBeVisible();
      
      await expect(page).toHaveScreenshot('milestones-loading.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Progress Indicator Visual Testing', () => {
    test('should match progress indicators at each phase', async ({ page }) => {
      await testUtils.setupApiConfig();
      
      // Phase 1 - Goal Input
      await expect(page).toHaveScreenshot('progress-phase-1.png', {
        clip: { x: 0, y: 0, width: 1200, height: 200 },
        animations: 'disabled'
      });
      
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await goalInputPage.submitGoal(testGoal.input);
      
      // Phase 2 - SMART Goal
      await smartGoalPage.assertSmartGoalDisplayed();
      await expect(page).toHaveScreenshot('progress-phase-2.png', {
        clip: { x: 0, y: 0, width: 1200, height: 200 },
        animations: 'disabled'
      });
      
      await smartGoalPage.completeSmartGoalPhase();
      
      // Phase 3 - Milestones
      await expect(page).toHaveScreenshot('progress-phase-3.png', {
        clip: { x: 0, y: 0, width: 1200, height: 200 },
        animations: 'disabled'
      });
      
      await milestonesPage.completeMilestonesPhase();
      
      // Phase 4 - WBS
      await expect(page).toHaveScreenshot('progress-phase-4.png', {
        clip: { x: 0, y: 0, width: 1200, height: 200 },
        animations: 'disabled'
      });
      
      await wbsPage.completeWBSPhase();
      
      // Phase 5 - Estimation
      await expect(page).toHaveScreenshot('progress-phase-5.png', {
        clip: { x: 0, y: 0, width: 1200, height: 200 },
        animations: 'disabled'
      });
    });
  });
});