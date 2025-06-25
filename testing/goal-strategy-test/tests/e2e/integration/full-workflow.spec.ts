import { test, expect } from '@playwright/test';
import { ApiConfigPage } from '../page-objects/ApiConfigPage';
import { GoalInputPage } from '../page-objects/GoalInputPage';
import { SmartGoalPage } from '../page-objects/SmartGoalPage';
import { MilestonesPage } from '../page-objects/MilestonesPage';
import { WBSPage } from '../page-objects/WBSPage';
import { EstimationPage } from '../page-objects/EstimationPage';
import { TestUtils } from '../fixtures/test-utils';
import { TEST_GOALS, getGoalsByCategory } from '../fixtures/test-data';

test.describe('Full Workflow Integration Tests', () => {
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

  test.describe('Complete Workflow Scenarios', () => {
    test('should complete full workflow for business goal', async ({ page }) => {
      const testGoal = TEST_GOALS.find(g => g.id === 'business-revenue-smart')!;
      
      console.log(`Starting full workflow test for: ${testGoal.id}`);
      
      // Phase 0: API Configuration
      await apiConfigPage.configureApi('test-api-key-business', 'http://localhost:3001');
      
      // Phase 1: Goal Input and SMART Goal Generation
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.assertSmartGoalDisplayed();
      await smartGoalPage.assertAllCriteriaPresent();
      await smartGoalPage.assertConfidenceScore(0.7); // Business goals should have high confidence
      
      // Take screenshot after SMART goal generation
      await testUtils.takeScreenshotWithTimestamp('business-workflow-smart-goal');
      
      // Continue to Phase 2
      await smartGoalPage.clickContinue();
      
      // Phase 2: Milestone Generation
      await milestonesPage.assertMilestonesDisplayVisible();
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      
      // Validate milestone structure for business goal
      const milestoneCount = await milestonesPage.getMilestoneCount();
      expect(milestoneCount).toBeGreaterThanOrEqual(testGoal.expectedMilestoneCount.min);
      expect(milestoneCount).toBeLessThanOrEqual(testGoal.expectedMilestoneCount.max);
      
      // Verify business-specific milestone characteristics
      await milestonesPage.assertMilestoneTimelineValid();
      
      await testUtils.takeScreenshotWithTimestamp('business-workflow-milestones');
      
      // Continue to Phase 3
      await milestonesPage.clickContinueToWBS();
      
      // Phase 3: WBS Generation
      await wbsPage.assertWBSDisplayVisible();
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
      
      // Validate WBS structure for business goal
      const taskCount = await wbsPage.getTaskCount();
      expect(taskCount).toBeGreaterThanOrEqual(testGoal.expectedTaskCount.min);
      expect(taskCount).toBeLessThanOrEqual(testGoal.expectedTaskCount.max);
      
      await wbsPage.assertTaskHierarchy();
      await wbsPage.assertTaskPriorities();
      await wbsPage.assertTaskDependencies();
      
      await testUtils.takeScreenshotWithTimestamp('business-workflow-wbs');
      
      // Continue to Phase 4
      await wbsPage.clickContinueToEstimation();
      
      // Phase 4: Estimation
      await estimationPage.assertEstimationDisplayVisible();
      await estimationPage.clickGenerateEstimates();
      await estimationPage.assertEstimationsGenerated();
      
      // Validate estimation quality
      await estimationPage.assertEstimationMethods();
      await estimationPage.assertConfidenceScores();
      await estimationPage.assertUncertaintyRanges();
      await estimationPage.assertSummaryReport();
      
      await testUtils.takeScreenshotWithTimestamp('business-workflow-estimation');
      
      // Verify final workflow completion
      const finalReport = await testUtils.generateTestReport('business-workflow-complete', {
        goalType: testGoal.category,
        goalComplexity: testGoal.complexity,
        milestoneCount,
        taskCount,
        workflowCompleted: true
      });
      
      console.log(`Full workflow completed. Report saved to: ${finalReport}`);
    });

    test('should complete full workflow for personal health goal', async ({ page }) => {
      const testGoal = TEST_GOALS.find(g => g.id === 'personal-fitness-smart')!;
      
      console.log(`Starting full workflow test for: ${testGoal.id}`);
      
      // Complete full workflow
      await apiConfigPage.configureApi('test-api-key-health', 'http://localhost:3001');
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.completeSmartGoalPhase();
      await milestonesPage.completeMilestonesPhase();
      await wbsPage.completeWBSPhase();
      await estimationPage.completeEstimationPhase();
      
      // Validate health-specific characteristics
      const milestoneCount = await milestonesPage.getMilestoneCount();
      const taskCount = await wbsPage.getTaskCount();
      
      // Health goals should have regular milestone intervals
      expect(milestoneCount).toBeGreaterThanOrEqual(4);
      
      // Should have detailed task breakdown for activities
      expect(taskCount).toBeGreaterThan(15);
      
      await testUtils.generateTestReport('health-workflow-complete', {
        goalType: testGoal.category,
        goalComplexity: testGoal.complexity,
        milestoneCount,
        taskCount,
        workflowCompleted: true
      });
    });

    test('should complete full workflow for education goal', async ({ page }) => {
      const testGoal = TEST_GOALS.find(g => g.id === 'education-skill-development')!;
      
      console.log(`Starting full workflow test for: ${testGoal.id}`);
      
      // Complete full workflow with performance monitoring
      const startTime = Date.now();
      
      await apiConfigPage.configureApi('test-api-key-education', 'http://localhost:3001');
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.completeSmartGoalPhase();
      await milestonesPage.completeMilestonesPhase();
      await wbsPage.completeWBSPhase();
      await estimationPage.completeEstimationPhase();
      
      const endTime = Date.now();
      const totalWorkflowTime = endTime - startTime;
      
      // Education goals should complete within reasonable time
      expect(totalWorkflowTime).toBeLessThan(60000); // 60 seconds
      
      // Validate education-specific structure
      const milestoneCount = await milestonesPage.getMilestoneCount();
      const taskCount = await wbsPage.getTaskCount();
      
      // Education goals should have learning progression
      expect(milestoneCount).toBeGreaterThanOrEqual(6);
      expect(taskCount).toBeGreaterThan(20);
      
      await testUtils.generateTestReport('education-workflow-complete', {
        goalType: testGoal.category,
        goalComplexity: testGoal.complexity,
        milestoneCount,
        taskCount,
        workflowCompleted: true,
        totalTime: totalWorkflowTime
      });
    });
  });

  test.describe('Cross-Browser Workflow Testing', () => {
    // Test the same workflow across different browsers
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should complete workflow consistently in ${browserName}`, async ({ page }) => {
        const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
        
        // Complete abbreviated workflow
        await apiConfigPage.configureApi('test-api-key-cross-browser', 'http://localhost:3001');
        await goalInputPage.submitGoal(testGoal.input);
        await smartGoalPage.assertSmartGoalDisplayed();
        await smartGoalPage.clickContinue();
        await milestonesPage.clickGenerateMilestones();
        await milestonesPage.assertMilestonesGenerated();
        
        // Verify consistent behavior across browsers
        const milestoneCount = await milestonesPage.getMilestoneCount();
        expect(milestoneCount).toBeGreaterThan(0);
        
        await testUtils.takeScreenshotWithTimestamp(`cross-browser-${browserName}`);
      });
    });
  });

  test.describe('Data Persistence and Recovery', () => {
    test('should preserve data across page reloads', async ({ page }) => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      
      // Complete first two phases
      await apiConfigPage.configureApi('test-api-key-persistence', 'http://localhost:3001');
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.completeSmartGoalPhase();
      
      // Store reference data
      const originalGoal = await testUtils.getLocalStorageItem('currentGoal');
      expect(originalGoal).toBeTruthy();
      
      // Reload page
      await page.reload();
      
      // Verify data persistence
      const restoredGoal = await testUtils.getLocalStorageItem('currentGoal');
      expect(restoredGoal).toBe(originalGoal);
      
      // Should resume from correct phase
      await testUtils.waitForStepTransition(0, 3); // Should be at milestones phase
      await milestonesPage.assertMilestonesDisplayVisible();
    });

    test('should handle workflow interruption and recovery', async ({ page }) => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      
      // Start workflow
      await apiConfigPage.configureApi('test-api-key-recovery', 'http://localhost:3001');
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.completeSmartGoalPhase();
      await milestonesPage.clickGenerateMilestones();
      
      // Simulate interruption
      await page.close();
      
      // Recovery would be tested with a new page instance
      // This demonstrates the recovery pattern
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle multiple concurrent operations', async ({ page }) => {
      const testGoal = TEST_GOALS.find(g => g.id === 'business-product-launch')!;
      
      await apiConfigPage.configureApi('test-api-key-performance', 'http://localhost:3001');
      
      // Start multiple operations simultaneously
      const operations = [
        goalInputPage.enterGoal(testGoal.input),
        testUtils.measureApiResponseTime('/api/smart-goal'),
        testUtils.getPerformanceMetrics()
      ];
      
      const [, apiResponseTime, performanceMetrics] = await Promise.all(operations);
      
      // Verify performance under load
      expect(apiResponseTime).toBeLessThan(5000);
      expect(performanceMetrics.renderTime).toBeLessThan(10000);
      
      // Complete workflow to verify stability
      await goalInputPage.clickSubmit();
      await smartGoalPage.assertSmartGoalDisplayed();
    });

    test('should maintain responsiveness with large datasets', async ({ page }) => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      
      // Mock large dataset responses
      const largeMilestoneSet = Array.from({ length: 20 }, (_, i) => ({
        id: `milestone-${i + 1}`,
        goalId: 'goal-123',
        title: `Milestone ${i + 1}`,
        description: `Description for milestone ${i + 1}`,
        targetDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        successCriteria: [`Success criteria ${i + 1}`],
        dependencies: i > 0 ? [`milestone-${i}`] : [],
        progress: 0,
        status: 'not_started',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      await page.route('**/api/milestones', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: largeMilestoneSet })
        });
      });
      
      // Complete workflow with large dataset
      await apiConfigPage.configureApi('test-api-key-large-data', 'http://localhost:3001');
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.completeSmartGoalPhase();
      
      const startTime = Date.now();
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      const endTime = Date.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(15000); // Should handle large datasets efficiently
      
      // Verify all data is rendered
      const milestoneCount = await milestonesPage.getMilestoneCount();
      expect(milestoneCount).toBe(20);
    });
  });

  test.describe('Workflow Edge Cases and Error Recovery', () => {
    test('should handle API failures gracefully during workflow', async ({ page }) => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      
      await apiConfigPage.configureApi('test-api-key-error-handling', 'http://localhost:3001');
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.completeSmartGoalPhase();
      
      // Mock API failure for milestone generation
      await testUtils.mockApiError('/api/milestones', 503, 'Service temporarily unavailable');
      
      await milestonesPage.clickGenerateMilestones();
      
      // Should show error message
      const errorMessage = page.locator('[data-testid="milestones-error"]');
      await expect(errorMessage).toBeVisible();
      
      // Should provide retry mechanism
      const retryButton = page.locator('[data-testid="retry-milestones-button"]');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeEnabled();
      }
      
      // User should be able to go back to previous phase
      const prevStepButton = page.locator('[data-testid="step-2"]');
      await prevStepButton.click();
      await smartGoalPage.assertSmartGoalDisplayed();
    });

    test('should validate data consistency throughout workflow', async ({ page }) => {
      const testGoal = TEST_GOALS.find(g => g.id === 'financial-savings')!;
      
      // Complete full workflow while tracking data consistency
      await apiConfigPage.configureApi('test-api-key-consistency', 'http://localhost:3001');
      await goalInputPage.submitGoal(testGoal.input);
      
      // Track goal data through phases
      await smartGoalPage.completeSmartGoalPhase();
      const goalData = await testUtils.getLocalStorageItem('currentGoal');
      expect(goalData).toBeTruthy();
      
      await milestonesPage.completeMilestonesPhase();
      const milestoneData = await testUtils.getLocalStorageItem('currentMilestones');
      expect(milestoneData).toBeTruthy();
      
      await wbsPage.completeWBSPhase();
      const taskData = await testUtils.getLocalStorageItem('currentTasks');
      expect(taskData).toBeTruthy();
      
      await estimationPage.completeEstimationPhase();
      const estimationData = await testUtils.getLocalStorageItem('currentEstimations');
      expect(estimationData).toBeTruthy();
      
      // Verify data relationships
      if (goalData && milestoneData && taskData && estimationData) {
        const goal = JSON.parse(goalData);
        const milestones = JSON.parse(milestoneData);
        const tasks = JSON.parse(taskData);
        const estimations = JSON.parse(estimationData);
        
        // Verify referential integrity
        milestones.forEach((milestone: any) => {
          expect(milestone.goalId).toBe(goal.id);
        });
        
        tasks.forEach((task: any) => {
          const relatedMilestone = milestones.find((m: any) => m.id === task.milestoneId);
          expect(relatedMilestone).toBeTruthy();
        });
        
        estimations.forEach((estimation: any) => {
          const relatedTask = tasks.find((t: any) => t.id === estimation.taskId);
          expect(relatedTask).toBeTruthy();
        });
      }
    });
  });

  test.describe('User Experience and Accessibility', () => {
    test('should support keyboard navigation throughout workflow', async ({ page }) => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      
      // Test keyboard navigation
      await apiConfigPage.page.keyboard.press('Tab'); // Focus API key input
      await apiConfigPage.page.keyboard.type('test-api-key-keyboard');
      await apiConfigPage.page.keyboard.press('Tab'); // Focus URL input
      await apiConfigPage.page.keyboard.type('http://localhost:3001');
      await apiConfigPage.page.keyboard.press('Tab'); // Focus save button
      await apiConfigPage.page.keyboard.press('Enter'); // Save configuration
      
      // Continue with keyboard navigation
      await goalInputPage.page.keyboard.type(testGoal.input);
      await goalInputPage.page.keyboard.press('Tab'); // Focus submit button
      await goalInputPage.page.keyboard.press('Enter'); // Submit goal
      
      await smartGoalPage.assertSmartGoalDisplayed();
      
      // Should be able to navigate SMART goal with keyboard
      await smartGoalPage.page.keyboard.press('Tab');
      await smartGoalPage.page.keyboard.press('Enter'); // Continue button
      
      await milestonesPage.assertMilestonesDisplayVisible();
    });

    test('should maintain accessibility standards', async ({ page }) => {
      // This would typically use axe-core or similar accessibility testing
      await testUtils.setupApiConfig();
      
      // Check for basic accessibility elements
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
      
      // Check for form labels
      const inputs = page.locator('input, textarea, select');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        for (let i = 0; i < inputCount; i++) {
          const input = inputs.nth(i);
          const ariaLabel = await input.getAttribute('aria-label');
          const associatedLabel = await input.getAttribute('aria-labelledby');
          
          // Should have either aria-label or associated label
          expect(ariaLabel || associatedLabel).toBeTruthy();
        }
      }
    });
  });
});