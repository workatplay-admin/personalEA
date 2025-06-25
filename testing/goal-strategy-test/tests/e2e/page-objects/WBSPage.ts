import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class WBSPage extends BasePage {
  readonly wbsDisplay: Locator;
  readonly wbsTitle: Locator;
  readonly wbsTree: Locator;
  readonly generateWBSButton: Locator;
  readonly continueButton: Locator;
  readonly taskCards: Locator;
  readonly loadingSpinner: Locator;
  readonly expandAllButton: Locator;
  readonly collapseAllButton: Locator;
  readonly dependencyView: Locator;
  readonly taskFilters: Locator;

  constructor(page: Page) {
    super(page);
    this.wbsDisplay = page.locator('[data-testid="wbs-display"]');
    this.wbsTitle = page.locator('[data-testid="wbs-title"]');
    this.wbsTree = page.locator('[data-testid="wbs-tree"]');
    this.generateWBSButton = page.locator('[data-testid="generate-wbs-button"]');
    this.continueButton = page.locator('[data-testid="continue-to-estimation-button"]');
    this.taskCards = page.locator('[data-testid^="task-card-"]');
    this.loadingSpinner = page.locator('[data-testid="wbs-loading"]');
    this.expandAllButton = page.locator('[data-testid="expand-all-button"]');
    this.collapseAllButton = page.locator('[data-testid="collapse-all-button"]');
    this.dependencyView = page.locator('[data-testid="dependency-view"]');
    this.taskFilters = page.locator('[data-testid="task-filters"]');
  }

  async assertWBSDisplayVisible() {
    await expect(this.wbsDisplay).toBeVisible();
  }

  async clickGenerateWBS() {
    await this.generateWBSButton.click();
    
    // Wait for loading to start and finish
    await expect(this.loadingSpinner).toBeVisible();
    await this.waitForLoadingToFinish();
  }

  async assertWBSGenerated() {
    const taskCount = await this.taskCards.count();
    expect(taskCount).toBeGreaterThan(0);
  }

  async assertTaskHierarchy() {
    // Check that tasks are properly nested with different levels
    const levelElements = await this.taskCards.locator('[data-level]').all();
    const levels = await Promise.all(levelElements.map(el => el.getAttribute('data-level')));
    
    // Should have multiple levels (at least 2)
    const uniqueLevels = [...new Set(levels.map(l => parseInt(l || '0')))].sort();
    expect(uniqueLevels.length).toBeGreaterThan(1);
    expect(uniqueLevels[0]).toBe(0); // Should start with level 0
  }

  async assertTaskDetails(index: number) {
    const taskCard = this.taskCards.nth(index);
    
    // Check that essential task elements are present
    await expect(taskCard.locator('[data-testid="task-title"]')).toBeVisible();
    await expect(taskCard.locator('[data-testid="task-description"]')).toBeVisible();
    await expect(taskCard.locator('[data-testid="task-priority"]')).toBeVisible();
    await expect(taskCard.locator('[data-testid="task-estimated-hours"]')).toBeVisible();
  }

  async getTaskCount() {
    return await this.taskCards.count();
  }

  async getTasksByLevel(level: number) {
    return this.taskCards.locator(`[data-level="${level}"]`);
  }

  async assertTaskPriorities() {
    const priorityElements = this.taskCards.locator('[data-testid="task-priority"]');
    const priorities = await priorityElements.allTextContents();
    
    // Should have a mix of priorities
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    priorities.forEach(priority => {
      expect(validPriorities).toContain(priority.toLowerCase());
    });
  }

  async assertTaskEstimates() {
    const estimateElements = this.taskCards.locator('[data-testid="task-estimated-hours"]');
    const estimates = await estimateElements.allTextContents();
    
    // All tasks should have positive hour estimates
    estimates.forEach(estimateStr => {
      const hours = parseFloat(estimateStr.replace(/[^\d.]/g, ''));
      expect(hours).toBeGreaterThan(0);
    });
  }

  async clickExpandAll() {
    await this.expandAllButton.click();
    
    // Wait for all tasks to be expanded
    const collapsedTasks = this.taskCards.locator('[data-collapsed="true"]');
    await expect(collapsedTasks).toHaveCount(0);
  }

  async clickCollapseAll() {
    await this.collapseAllButton.click();
    
    // Wait for tasks to be collapsed (except level 0)
    const level0Tasks = this.getTasksByLevel(0);
    const visibleLevel0Count = await level0Tasks.count();
    expect(visibleLevel0Count).toBeGreaterThan(0);
  }

  async expandTask(index: number) {
    const taskCard = this.taskCards.nth(index);
    const expandButton = taskCard.locator('[data-testid="expand-task-button"]');
    
    if (await expandButton.isVisible()) {
      await expandButton.click();
    }
  }

  async collapseTask(index: number) {
    const taskCard = this.taskCards.nth(index);
    const collapseButton = taskCard.locator('[data-testid="collapse-task-button"]');
    
    if (await collapseButton.isVisible()) {
      await collapseButton.click();
    }
  }

  async assertTaskDependencies() {
    // Check that dependency relationships are properly displayed
    const dependencyElements = this.taskCards.locator('[data-testid="task-dependencies"]');
    const dependencyCount = await dependencyElements.count();
    
    if (dependencyCount > 0) {
      for (let i = 0; i < dependencyCount; i++) {
        const deps = dependencyElements.nth(i);
        await expect(deps).toBeVisible();
        
        // Check dependency links are valid task IDs
        const dependencyText = await deps.textContent();
        if (dependencyText && dependencyText.trim()) {
          expect(dependencyText).toMatch(/^[a-zA-Z0-9-_,\s]+$/);
        }
      }
    }
  }

  async switchToDependencyView() {
    const dependencyToggle = this.page.locator('[data-testid="dependency-view-toggle"]');
    await dependencyToggle.click();
    await expect(this.dependencyView).toBeVisible();
  }

  async assertDependencyGraph() {
    await this.switchToDependencyView();
    
    // Check that dependency graph elements are visible
    const nodes = this.dependencyView.locator('[data-testid="dependency-node"]');
    const edges = this.dependencyView.locator('[data-testid="dependency-edge"]');
    
    const nodeCount = await nodes.count();
    const edgeCount = await edges.count();
    
    expect(nodeCount).toBeGreaterThan(0);
    if (edgeCount > 0) {
      expect(edgeCount).toBeLessThan(nodeCount * (nodeCount - 1) / 2); // Should not be fully connected
    }
  }

  async filterTasksByPriority(priority: 'low' | 'medium' | 'high' | 'critical') {
    const priorityFilter = this.taskFilters.locator(`[data-testid="filter-${priority}"]`);
    await priorityFilter.click();
    
    // Wait for filtering to complete
    await this.page.waitForTimeout(500);
    
    // Verify only tasks with selected priority are shown
    const visibleTasks = this.taskCards.locator(':visible');
    const visibleCount = await visibleTasks.count();
    
    if (visibleCount > 0) {
      const priorities = await visibleTasks.locator('[data-testid="task-priority"]').allTextContents();
      priorities.forEach(p => {
        expect(p.toLowerCase()).toBe(priority);
      });
    }
  }

  async clearFilters() {
    const clearFiltersButton = this.taskFilters.locator('[data-testid="clear-filters"]');
    await clearFiltersButton.click();
    
    // Verify all tasks are visible again
    const allTasksCount = await this.taskCards.count();
    const visibleTasksCount = await this.taskCards.locator(':visible').count();
    expect(visibleTasksCount).toBe(allTasksCount);
  }

  async clickContinueToEstimation() {
    await this.continueButton.click();
    await this.waitForStepToBeActive(5);
  }

  async completeWBSPhase() {
    await this.assertWBSDisplayVisible();
    await this.clickGenerateWBS();
    await this.assertWBSGenerated();
    
    // Validate WBS structure
    await this.assertTaskHierarchy();
    const taskCount = await this.getTaskCount();
    for (let i = 0; i < Math.min(taskCount, 5); i++) { // Test first 5 tasks
      await this.assertTaskDetails(i);
    }
    
    await this.assertTaskPriorities();
    await this.assertTaskEstimates();
    await this.assertTaskDependencies();
    
    await this.clickContinueToEstimation();
  }

  async validateWBSStructure() {
    const taskCount = await this.getTaskCount();
    expect(taskCount).toBeGreaterThan(5); // Should have sufficient tasks
    expect(taskCount).toBeLessThan(50); // Should not be overwhelming
    
    // Validate hierarchy structure
    await this.assertTaskHierarchy();
    
    // Test expand/collapse functionality
    await this.clickExpandAll();
    await this.clickCollapseAll();
    
    // Test dependency relationships
    await this.assertTaskDependencies();
  }
}