import { test, expect } from '@playwright/test';
import { ApiConfigPage } from '../page-objects/ApiConfigPage';
import { GoalInputPage } from '../page-objects/GoalInputPage';
import { SmartGoalPage } from '../page-objects/SmartGoalPage';
import { MilestonesPage } from '../page-objects/MilestonesPage';
import { WBSPage } from '../page-objects/WBSPage';
import { EstimationPage } from '../page-objects/EstimationPage';
import { TestUtils } from '../fixtures/test-utils';
import { TEST_GOALS, getGoalsByComplexity } from '../fixtures/test-data';

test.describe('Phase 3: WBS Tasks and Estimation', () => {
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

    // Setup mock API for consistent testing
    await testUtils.setupMockAPI();
    await testUtils.setupApiConfig();
  });

  async function navigateToWBSPhase(testGoal: typeof TEST_GOALS[0]) {
    await goalInputPage.submitGoal(testGoal.input);
    await smartGoalPage.completeSmartGoalPhase();
    await milestonesPage.completeMilestonesPhase();
    await testUtils.waitForStepTransition(3, 4);
  }

  async function navigateToEstimationPhase(testGoal: typeof TEST_GOALS[0]) {
    await navigateToWBSPhase(testGoal);
    await wbsPage.completeWBSPhase();
    await testUtils.waitForStepTransition(4, 5);
  }

  test.describe('WBS (Work Breakdown Structure) Generation', () => {
    test('should display WBS section after milestones completion', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await navigateToWBSPhase(testGoal);
      
      await wbsPage.assertWBSDisplayVisible();
      
      // Should show generate WBS button initially
      const generateButton = wbsPage.page.locator('[data-testid="generate-wbs-button"]');
      await expect(generateButton).toBeVisible();
    });

    test('should generate hierarchical task structure', async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'business-product-launch')!;
      await navigateToWBSPhase(testGoal);
      
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
      
      // Verify hierarchical structure
      await wbsPage.assertTaskHierarchy();
      
      // Check for multiple levels
      const level0Tasks = await wbsPage.getTasksByLevel(0).count();
      const level1Tasks = await wbsPage.getTasksByLevel(1).count();
      
      expect(level0Tasks).toBeGreaterThan(0);
      expect(level1Tasks).toBeGreaterThan(0);
    });

    test('should assign appropriate task priorities', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      await navigateToWBSPhase(testGoal);
      
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
      
      // Verify priority assignments
      await wbsPage.assertTaskPriorities();
      
      // Should have a mix of priorities
      const priorities = await wbsPage.taskCards.locator('[data-testid="task-priority"]').allTextContents();
      const uniquePriorities = [...new Set(priorities.map(p => p.toLowerCase()))];
      expect(uniquePriorities.length).toBeGreaterThan(1);
    });

    test('should provide realistic time estimates', async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'education-skill-development')!;
      await navigateToWBSPhase(testGoal);
      
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
      
      // Verify all tasks have positive estimates
      await wbsPage.assertTaskEstimates();
      
      // Verify total estimate is reasonable for goal timeframe
      const taskCount = await wbsPage.getTaskCount();
      expect(taskCount).toBeGreaterThanOrEqual(testGoal.expectedTaskCount.min);
      expect(taskCount).toBeLessThanOrEqual(testGoal.expectedTaskCount.max);
    });

    test('should establish proper task dependencies', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      await navigateToWBSPhase(testGoal);
      
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
      
      // Verify dependency relationships
      await wbsPage.assertTaskDependencies();
    });
  });

  test.describe('WBS Navigation and Interaction', () => {
    test.beforeEach(async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await navigateToWBSPhase(testGoal);
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
    });

    test('should expand and collapse task hierarchy', async () => {
      // Test expand all functionality
      await wbsPage.clickExpandAll();
      
      // All tasks should be visible
      const totalTasks = await wbsPage.getTaskCount();
      const visibleTasks = await wbsPage.taskCards.locator(':visible').count();
      expect(visibleTasks).toBe(totalTasks);
      
      // Test collapse all functionality
      await wbsPage.clickCollapseAll();
      
      // Only level 0 tasks should be visible
      const visibleLevel0 = await wbsPage.getTasksByLevel(0).locator(':visible').count();
      expect(visibleLevel0).toBeGreaterThan(0);
    });

    test('should filter tasks by priority', async () => {
      const priorities: Array<'low' | 'medium' | 'high' | 'critical'> = ['high', 'medium', 'low'];
      
      for (const priority of priorities) {
        await wbsPage.filterTasksByPriority(priority);
        
        // Verify only selected priority tasks are shown
        const visibleTasks = wbsPage.taskCards.locator(':visible');
        const visibleCount = await visibleTasks.count();
        
        if (visibleCount > 0) {
          const visiblePriorities = await visibleTasks.locator('[data-testid="task-priority"]').allTextContents();
          visiblePriorities.forEach(p => {
            expect(p.toLowerCase()).toBe(priority);
          });
        }
        
        // Clear filter for next iteration
        await wbsPage.clearFilters();
      }
    });

    test('should display dependency graph view', async () => {
      await wbsPage.switchToDependencyView();
      await wbsPage.assertDependencyGraph();
      
      // Verify nodes and edges are displayed
      const nodes = wbsPage.dependencyView.locator('[data-testid="dependency-node"]');
      const nodeCount = await nodes.count();
      expect(nodeCount).toBeGreaterThan(0);
    });

    test('should validate WBS structure completeness', async () => {
      await wbsPage.validateWBSStructure();
      
      // Verify comprehensive task coverage
      const taskCount = await wbsPage.getTaskCount();
      expect(taskCount).toBeGreaterThan(10); // Should have sufficient tasks
      
      // Verify hierarchical completeness
      await wbsPage.assertTaskHierarchy();
    });
  });

  test.describe('Task Estimation Methods', () => {
    test.beforeEach(async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      await navigateToEstimationPhase(testGoal);
    });

    test('should display estimation interface after WBS completion', async () => {
      await estimationPage.assertEstimationDisplayVisible();
      await estimationPage.assertEstimationMethods();
    });

    test('should generate estimates using multiple methods', async () => {
      await estimationPage.clickGenerateEstimates();
      await estimationPage.assertEstimationsGenerated();
      
      // Verify all estimation methods are available
      await estimationPage.assertEstimationMethods();
      
      // Test switching between methods
      await estimationPage.switchToMethod('expert-judgment');
      await estimationPage.assertExpertJudgmentMethod(0);
      
      await estimationPage.switchToMethod('three-point');
      await estimationPage.assertThreePointMethod(0);
      
      await estimationPage.switchToMethod('bottom-up');
      await estimationPage.assertBottomUpMethod(0);
    });

    test('should validate estimation accuracy and consistency', async () => {
      await estimationPage.clickGenerateEstimates();
      await estimationPage.assertEstimationsGenerated();
      
      // Validate estimation accuracy
      await estimationPage.validateEstimationAccuracy();
      
      // Validate consistency across methods
      await estimationPage.validateEstimationConsistency();
    });

    test('should display confidence scores for estimates', async () => {
      await estimationPage.clickGenerateEstimates();
      await estimationPage.assertEstimationsGenerated();
      
      // Verify confidence scores
      await estimationPage.assertConfidenceScores();
      
      // Confidence scores should be realistic (0-1 range)
      const confidenceElements = estimationPage.confidenceIndicators;
      const confidenceCount = await confidenceElements.count();
      
      for (let i = 0; i < confidenceCount; i++) {
        const confidenceText = await confidenceElements.nth(i).textContent();
        const score = parseFloat(confidenceText?.replace(/[^\d.]/g, '') || '0');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });

    test('should show uncertainty ranges for estimates', async () => {
      await estimationPage.clickGenerateEstimates();
      await estimationPage.assertEstimationsGenerated();
      
      // Verify uncertainty ranges
      await estimationPage.assertUncertaintyRanges();
      
      // Ranges should be logical (min < max)
      const rangeElements = estimationPage.uncertaintyRanges;
      const rangeCount = await rangeElements.count();
      
      for (let i = 0; i < Math.min(rangeCount, 3); i++) {
        const range = rangeElements.nth(i);
        const minText = await range.locator('[data-testid="min-estimate"]').textContent();
        const maxText = await range.locator('[data-testid="max-estimate"]').textContent();
        
        const minValue = parseFloat(minText?.replace(/[^\d.]/g, '') || '0');
        const maxValue = parseFloat(maxText?.replace(/[^\d.]/g, '') || '0');
        
        expect(maxValue).toBeGreaterThan(minValue);
      }
    });
  });

  test.describe('Estimation Summary and Reporting', () => {
    test.beforeEach(async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'business-revenue-smart')!;
      await navigateToEstimationPhase(testGoal);
      await estimationPage.clickGenerateEstimates();
      await estimationPage.assertEstimationsGenerated();
    });

    test('should generate comprehensive summary report', async () => {
      await estimationPage.assertSummaryReport();
      
      // Verify summary components
      const totalEstimate = estimationPage.summaryReport.locator('[data-testid="total-estimate"]');
      const totalConfidence = estimationPage.summaryReport.locator('[data-testid="total-confidence"]');
      const riskAnalysis = estimationPage.summaryReport.locator('[data-testid="risk-analysis"]');
      
      await expect(totalEstimate).toBeVisible();
      await expect(totalConfidence).toBeVisible();
      await expect(riskAnalysis).toBeVisible();
      
      // Total should be positive and reasonable
      const totalText = await totalEstimate.textContent();
      const total = parseFloat(totalText?.replace(/[^\d.]/g, '') || '0');
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThan(10000); // Reasonable upper bound
    });

    test('should provide risk analysis and recommendations', async () => {
      const riskAnalysis = estimationPage.summaryReport.locator('[data-testid="risk-analysis"]');
      await expect(riskAnalysis).toBeVisible();
      
      const riskText = await riskAnalysis.textContent();
      expect(riskText?.length || 0).toBeGreaterThan(50);
      
      // Should contain actionable recommendations
      const hasRecommendations = /recommend|suggest|consider|should|advice/i.test(riskText || '');
      expect(hasRecommendations).toBeTruthy();
    });

    test('should enable export functionality', async () => {
      await estimationPage.assertExportFunctionality();
      
      // Test export button is functional
      const exportButton = estimationPage.exportButton;
      await expect(exportButton).toBeVisible();
      await expect(exportButton).toBeEnabled();
      
      // Note: Actual download testing would require special handling in CI
      // This test just verifies the UI elements are present and functional
    });

    test('should calculate total project timeline', async () => {
      const summaryReport = estimationPage.summaryReport;
      const timelineElement = summaryReport.locator('[data-testid="project-timeline"]');
      
      if (await timelineElement.isVisible()) {
        const timelineText = await timelineElement.textContent();
        
        // Should contain time units (days, weeks, months)
        const hasTimeUnits = /day|week|month|hour/i.test(timelineText || '');
        expect(hasTimeUnits).toBeTruthy();
        
        // Should be reasonable timeframe
        const hasReasonableTimeframe = /\d+\s*(day|week|month)/i.test(timelineText || '');
        expect(hasReasonableTimeframe).toBeTruthy();
      }
    });
  });

  test.describe('Full End-to-End Phase 3 Completion', () => {
    const complexGoals = getGoalsByComplexity('complex');

    complexGoals.forEach((testGoal) => {
      test(`should complete full Phase 3 workflow for: ${testGoal.id}`, async () => {
        await navigateToWBSPhase(testGoal);
        
        // Complete WBS generation and validation
        await wbsPage.completeWBSPhase();
        
        // Complete estimation process
        await estimationPage.completeEstimationPhase();
        
        // Verify all components are present
        await estimationPage.assertSummaryReport();
        
        // Take comprehensive screenshot
        await testUtils.takeScreenshotWithTimestamp(`phase3-complete-${testGoal.id}`);
        
        // Verify performance meets thresholds
        const metrics = await testUtils.getPerformanceMetrics();
        expect(metrics.renderTime).toBeLessThan(30000); // 30 second total render time
      });
    });

    test('should maintain data consistency across all phases', async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'business-product-launch')!;
      
      // Complete full workflow
      await goalInputPage.submitGoal(testGoal.input);
      await smartGoalPage.completeSmartGoalPhase();
      await milestonesPage.completeMilestonesPhase();
      await wbsPage.completeWBSPhase();
      await estimationPage.completeEstimationPhase();
      
      // Verify data consistency
      const goalData = await testUtils.getLocalStorageItem('currentGoal');
      const milestoneData = await testUtils.getLocalStorageItem('currentMilestones');
      const taskData = await testUtils.getLocalStorageItem('currentTasks');
      const estimationData = await testUtils.getLocalStorageItem('currentEstimations');
      
      expect(goalData).toBeTruthy();
      expect(milestoneData).toBeTruthy();
      expect(taskData).toBeTruthy();
      expect(estimationData).toBeTruthy();
      
      // Verify data relationships
      if (goalData && milestoneData) {
        const goal = JSON.parse(goalData);
        const milestones = JSON.parse(milestoneData);
        
        milestones.forEach((milestone: any) => {
          expect(milestone.goalId).toBe(goal.id);
        });
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle WBS generation errors gracefully', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await navigateToWBSPhase(testGoal);
      
      // Mock WBS API error
      await testUtils.mockApiError('/api/wbs', 504, 'WBS generation service timeout');
      
      await wbsPage.clickGenerateWBS();
      
      // Should show error message
      const errorMessage = wbsPage.page.locator('[data-testid="wbs-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('WBS generation service timeout');
    });

    test('should handle estimation API failures', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      await navigateToEstimationPhase(testGoal);
      
      // Mock estimation API error
      await testUtils.mockApiError('/api/estimations', 502, 'Estimation service unavailable');
      
      await estimationPage.clickGenerateEstimates();
      
      // Should show error message and recovery options
      const errorMessage = estimationPage.page.locator('[data-testid="estimation-error"]');
      await expect(errorMessage).toBeVisible();
      
      const retryButton = estimationPage.page.locator('[data-testid="retry-estimation-button"]');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeEnabled();
      }
    });

    test('should recover from partial data loss', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await navigateToWBSPhase(testGoal);
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
      
      // Simulate data loss
      await testUtils.clearLocalStorage();
      
      // Navigate back and forth to trigger recovery
      await wbsPage.page.reload();
      
      // Should handle missing data gracefully
      await testUtils.assertNoErrors();
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle large WBS structures efficiently', async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'business-product-launch')!;
      await navigateToWBSPhase(testGoal);
      
      // Mock large WBS response
      const largeTasks = Array.from({ length: 50 }, (_, i) => ({
        id: `task-${i + 1}`,
        milestoneId: 'milestone-1',
        title: `Task ${i + 1}`,
        description: `Description for task ${i + 1}`,
        completionCriteria: `Completion criteria ${i + 1}`,
        estimatedHours: Math.floor(Math.random() * 40) + 8,
        priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        dependencies: i > 0 ? [`task-${Math.floor(Math.random() * i) + 1}`] : [],
        status: 'not_started',
        level: Math.floor(i / 10),
        order: i + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      await wbsPage.page.route('**/api/wbs', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: largeTasks })
        });
      });
      
      const startTime = Date.now();
      await wbsPage.clickGenerateWBS();
      await wbsPage.assertWBSGenerated();
      const endTime = Date.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(20000); // Should render within 20 seconds
      
      // Verify all tasks are accessible
      const taskCount = await wbsPage.getTaskCount();
      expect(taskCount).toBe(50);
    });

    test('should maintain performance during intensive estimation calculations', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      await navigateToEstimationPhase(testGoal);
      
      const startTime = Date.now();
      await estimationPage.clickGenerateEstimates();
      await estimationPage.assertEstimationsGenerated();
      const endTime = Date.now();
      
      const estimationTime = endTime - startTime;
      expect(estimationTime).toBeLessThan(25000); // Should complete within 25 seconds
      
      // Verify UI remains responsive
      const summaryButton = estimationPage.page.locator('[data-testid="summary-tab"]');
      if (await summaryButton.isVisible()) {
        await summaryButton.click();
        await estimationPage.assertSummaryReport();
      }
    });
  });
});