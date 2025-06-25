import { test, expect } from '@playwright/test';
import { ApiConfigPage } from '../page-objects/ApiConfigPage';
import { GoalInputPage } from '../page-objects/GoalInputPage';
import { SmartGoalPage } from '../page-objects/SmartGoalPage';
import { MilestonesPage } from '../page-objects/MilestonesPage';
import { TestUtils } from '../fixtures/test-utils';
import { TEST_GOALS, getGoalsByCategory, getGoalsByComplexity } from '../fixtures/test-data';

test.describe('Phase 2: SMART Goal to Milestones', () => {
  let apiConfigPage: ApiConfigPage;
  let goalInputPage: GoalInputPage;
  let smartGoalPage: SmartGoalPage;
  let milestonesPage: MilestonesPage;
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    apiConfigPage = new ApiConfigPage(page);
    goalInputPage = new GoalInputPage(page);
    smartGoalPage = new SmartGoalPage(page);
    milestonesPage = new MilestonesPage(page);
    testUtils = new TestUtils(page);

    // Setup mock API for consistent testing
    await testUtils.setupMockAPI();
    await testUtils.setupApiConfig();
  });

  async function navigateToMilestonesPhase(testGoal: typeof TEST_GOALS[0]) {
    await goalInputPage.submitGoal(testGoal.input);
    await smartGoalPage.completeSmartGoalPhase();
    await testUtils.waitForStepTransition(2, 3);
  }

  test.describe('Milestones Display and Generation', () => {
    test('should display milestones section after SMART goal completion', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await navigateToMilestonesPhase(testGoal);
      
      await milestonesPage.assertMilestonesDisplayVisible();
      
      // Should show generate button initially
      const generateButton = milestonesPage.page.locator('[data-testid="generate-milestones-button"]');
      await expect(generateButton).toBeVisible();
    });

    test('should generate milestones based on SMART goal', async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'business-revenue-smart')!;
      await navigateToMilestonesPhase(testGoal);
      
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      
      // Verify milestone count is within expected range
      const milestoneCount = await milestonesPage.getMilestoneCount();
      expect(milestoneCount).toBeGreaterThanOrEqual(testGoal.expectedMilestoneCount.min);
      expect(milestoneCount).toBeLessThanOrEqual(testGoal.expectedMilestoneCount.max);
    });

    test('should display milestone details correctly', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      await navigateToMilestonesPhase(testGoal);
      
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      
      // Check first milestone details
      await milestonesPage.assertMilestoneDetails(0);
      
      // Verify milestone has required fields
      const firstMilestone = milestonesPage.milestoneCards.first();
      await expect(firstMilestone.locator('[data-testid="milestone-title"]')).toBeVisible();
      await expect(firstMilestone.locator('[data-testid="milestone-description"]')).toBeVisible();
      await expect(firstMilestone.locator('[data-testid="milestone-target-date"]')).toBeVisible();
      await expect(firstMilestone.locator('[data-testid="milestone-success-criteria"]')).toBeVisible();
    });

    test('should validate milestone chronological order', async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'education-skill-development')!;
      await navigateToMilestonesPhase(testGoal);
      
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      
      // Verify milestones are in chronological order
      await milestonesPage.assertMilestoneTimelineValid();
    });

    test('should show milestone dependencies when they exist', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      await navigateToMilestonesPhase(testGoal);
      
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      
      // Check for dependency relationships
      await milestonesPage.assertMilestoneDependencies();
    });
  });

  test.describe('Milestone Editing and Customization', () => {
    test.beforeEach(async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await navigateToMilestonesPhase(testGoal);
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
    });

    test('should open milestone editor when edit button is clicked', async () => {
      await milestonesPage.clickEditMilestone(0);
      await milestonesPage.assertMilestoneEditorVisible();
      
      // Editor should have form fields populated
      const titleInput = milestonesPage.page.locator('[data-testid="milestone-title-input"]');
      const descriptionInput = milestonesPage.page.locator('[data-testid="milestone-description-input"]');
      
      await expect(titleInput).toBeVisible();
      await expect(descriptionInput).toBeVisible();
      
      const titleValue = await titleInput.inputValue();
      expect(titleValue.length).toBeGreaterThan(0);
    });

    test('should save milestone changes successfully', async () => {
      await milestonesPage.clickEditMilestone(0);
      
      const newTitle = 'Updated Milestone Title - Phase 2 Test';
      await milestonesPage.editMilestoneTitle(newTitle);
      await milestonesPage.saveMilestoneChanges();
      
      // Verify changes are saved
      await milestonesPage.assertMilestoneCard(0, newTitle);
    });

    test('should cancel milestone edit without saving changes', async () => {
      // Get original title
      const originalTitle = await milestonesPage.milestoneCards.first()
        .locator('[data-testid="milestone-title"]').textContent();
      
      await milestonesPage.clickEditMilestone(0);
      await milestonesPage.editMilestoneTitle('Temporary Title Change');
      await milestonesPage.cancelMilestoneEdit();
      
      // Verify original title is preserved
      await milestonesPage.assertMilestoneCard(0, originalTitle || '');
    });

    test('should allow adding new milestone', async () => {
      const originalCount = await milestonesPage.getMilestoneCount();
      
      await milestonesPage.clickAddMilestone();
      await milestonesPage.assertMilestoneEditorVisible();
      
      await milestonesPage.editMilestoneTitle('Custom Milestone Title');
      await milestonesPage.editMilestoneDescription('Custom milestone description for testing');
      await milestonesPage.editMilestoneTargetDate('2024-10-15');
      await milestonesPage.saveMilestoneChanges();
      
      // Verify new milestone is added
      const newCount = await milestonesPage.getMilestoneCount();
      expect(newCount).toBe(originalCount + 1);
    });

    test('should validate milestone date format', async () => {
      await milestonesPage.clickEditMilestone(0);
      
      // Try invalid date format
      await milestonesPage.editMilestoneTargetDate('invalid-date');
      
      const dateInput = milestonesPage.page.locator('[data-testid="milestone-date-input"]');
      const validationMessage = milestonesPage.page.locator('[data-testid="date-validation-error"]');
      
      // Should show validation error
      await expect(validationMessage).toBeVisible();
    });
  });

  test.describe('Data-Driven Milestone Testing', () => {
    const goalCategories = ['business', 'personal', 'education', 'financial'] as const;

    goalCategories.forEach(category => {
      test(`should generate appropriate milestones for ${category} goals`, async () => {
        const categoryGoals = getGoalsByCategory(category);
        const testGoal = categoryGoals.find(g => g.complexity !== 'simple');
        
        if (!testGoal) {
          test.skip(`No suitable test goal found for category: ${category}`);
          return;
        }

        await navigateToMilestonesPhase(testGoal);
        await milestonesPage.clickGenerateMilestones();
        await milestonesPage.assertMilestonesGenerated();
        
        // Validate milestone structure for category
        await milestonesPage.validateMilestoneData();
        
        // Take screenshot for category
        await testUtils.takeScreenshotWithTimestamp(`milestones-${category}-${testGoal.id}`);
      });
    });

    test('should handle varying complexity levels appropriately', async () => {
      const complexityLevels = ['simple', 'medium', 'complex'] as const;
      
      for (const complexity of complexityLevels) {
        const goals = getGoalsByComplexity(complexity);
        const testGoal = goals[0];
        
        await navigateToMilestonesPhase(testGoal);
        await milestonesPage.clickGenerateMilestones();
        await milestonesPage.assertMilestonesGenerated();
        
        const milestoneCount = await milestonesPage.getMilestoneCount();
        
        // More complex goals should generally have more milestones
        if (complexity === 'simple') {
          expect(milestoneCount).toBeLessThanOrEqual(6);
        } else if (complexity === 'complex') {
          expect(milestoneCount).toBeGreaterThanOrEqual(4);
        }
        
        // Reset for next iteration
        await milestonesPage.page.reload();
        await testUtils.setupApiConfig();
      }
    });
  });

  test.describe('Milestone Validation and Quality Checks', () => {
    test.beforeEach(async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'business-product-launch')!;
      await navigateToMilestonesPhase(testGoal);
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
    });

    test('should ensure milestone titles are descriptive', async () => {
      const milestoneCount = await milestonesPage.getMilestoneCount();
      
      for (let i = 0; i < milestoneCount; i++) {
        const titleElement = milestonesPage.milestoneCards.nth(i)
          .locator('[data-testid="milestone-title"]');
        const title = await titleElement.textContent();
        
        // Title should be descriptive (more than just a few words)
        expect(title?.trim().length || 0).toBeGreaterThan(10);
        
        // Should not contain placeholder text
        expect(title?.toLowerCase()).not.toContain('milestone');
        expect(title?.toLowerCase()).not.toContain('todo');
        expect(title?.toLowerCase()).not.toContain('placeholder');
      }
    });

    test('should ensure success criteria are specific and measurable', async () => {
      const milestoneCount = await milestonesPage.getMilestoneCount();
      
      for (let i = 0; i < Math.min(milestoneCount, 3); i++) {
        const criteriaElement = milestonesPage.milestoneCards.nth(i)
          .locator('[data-testid="milestone-success-criteria"]');
        
        await expect(criteriaElement).toBeVisible();
        
        const criteriaText = await criteriaElement.textContent();
        expect(criteriaText?.trim().length || 0).toBeGreaterThan(20);
        
        // Should contain actionable criteria
        const hasActionableTerms = /complete|achieve|reach|deliver|implement|finish/i.test(criteriaText || '');
        expect(hasActionableTerms).toBeTruthy();
      }
    });

    test('should validate milestone target dates are realistic', async () => {
      const milestoneCount = await milestonesPage.getMilestoneCount();
      const today = new Date();
      
      for (let i = 0; i < milestoneCount; i++) {
        const dateElement = milestonesPage.milestoneCards.nth(i)
          .locator('[data-testid="milestone-target-date"]');
        const dateText = await dateElement.textContent();
        
        if (dateText) {
          const milestoneDate = new Date(dateText.trim());
          
          // Date should be in the future
          expect(milestoneDate.getTime()).toBeGreaterThan(today.getTime());
          
          // Date should be within reasonable timeframe (not more than 2 years)
          const twoYearsFromNow = new Date();
          twoYearsFromNow.setFullYear(today.getFullYear() + 2);
          expect(milestoneDate.getTime()).toBeLessThan(twoYearsFromNow.getTime());
        }
      }
    });

    test('should ensure milestone descriptions provide clear guidance', async () => {
      const milestoneCount = await milestonesPage.getMilestoneCount();
      
      for (let i = 0; i < Math.min(milestoneCount, 3); i++) {
        const descriptionElement = milestonesPage.milestoneCards.nth(i)
          .locator('[data-testid="milestone-description"]');
        
        const description = await descriptionElement.textContent();
        
        // Description should be substantial
        expect(description?.trim().length || 0).toBeGreaterThan(30);
        
        // Should provide actionable guidance
        const hasGuidanceTerms = /how|what|when|where|who|steps|process|method/i.test(description || '');
        expect(hasGuidanceTerms).toBeTruthy();
      }
    });
  });

  test.describe('Phase 2 Completion and Navigation', () => {
    test('should advance to Phase 3 (WBS) after milestone completion', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await navigateToMilestonesPhase(testGoal);
      
      await milestonesPage.completeMilestonesPhase();
      
      // Verify advancement to Phase 3
      await testUtils.waitForStepTransition(3, 4);
      
      // Verify WBS page is displayed
      const wbsDisplay = milestonesPage.page.locator('[data-testid="wbs-display"]');
      await expect(wbsDisplay).toBeVisible();
    });

    test('should preserve milestone data for next phase', async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'financial-savings')!;
      await navigateToMilestonesPhase(testGoal);
      
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      
      const milestoneCount = await milestonesPage.getMilestoneCount();
      
      await milestonesPage.clickContinueToWBS();
      
      // Verify milestone data is preserved in local storage
      const milestoneData = await testUtils.getLocalStorageItem('currentMilestones');
      expect(milestoneData).toBeTruthy();
      
      if (milestoneData) {
        const parsedData = JSON.parse(milestoneData);
        expect(parsedData.length).toBe(milestoneCount);
      }
    });

    test('should allow returning to previous phases', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      await navigateToMilestonesPhase(testGoal);
      
      await milestonesPage.clickGenerateMilestones();
      
      // Click to go back to SMART goal phase
      const stepIndicator = milestonesPage.page.locator('[data-testid="step-2"]');
      await stepIndicator.click();
      
      // Should return to SMART goal display
      await expect(smartGoalPage.smartGoalDisplay).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle milestone generation API errors', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await navigateToMilestonesPhase(testGoal);
      
      // Mock API error for milestone generation
      await testUtils.mockApiError('/api/milestones', 503, 'Milestone service unavailable');
      
      await milestonesPage.clickGenerateMilestones();
      
      // Should show error message
      const errorMessage = milestonesPage.page.locator('[data-testid="milestones-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Milestone service unavailable');
    });

    test('should handle empty milestone response gracefully', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'simple')!;
      await navigateToMilestonesPhase(testGoal);
      
      // Mock empty response
      await milestonesPage.page.route('**/api/milestones', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] })
        });
      });
      
      await milestonesPage.clickGenerateMilestones();
      
      // Should show appropriate message for empty results
      const emptyMessage = milestonesPage.page.locator('[data-testid="no-milestones-message"]');
      await expect(emptyMessage).toBeVisible();
    });

    test('should validate milestone edit form inputs', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'medium')!;
      await navigateToMilestonesPhase(testGoal);
      
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.clickEditMilestone(0);
      
      // Try to save with empty title
      await milestonesPage.editMilestoneTitle('');
      
      const saveButton = milestonesPage.page.locator('[data-testid="save-milestone-button"]');
      await saveButton.click();
      
      // Should show validation error
      const validationError = milestonesPage.page.locator('[data-testid="title-validation-error"]');
      await expect(validationError).toBeVisible();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should generate milestones within performance thresholds', async () => {
      const testGoal = TEST_GOALS.find(g => g.complexity === 'complex')!;
      await navigateToMilestonesPhase(testGoal);
      
      const startTime = Date.now();
      await milestonesPage.clickGenerateMilestones();
      await milestonesPage.assertMilestonesGenerated();
      const endTime = Date.now();
      
      const generationTime = endTime - startTime;
      expect(generationTime).toBeLessThan(15000); // Should complete within 15 seconds
      
      // Measure API response time
      await testUtils.assertApiResponseTime('/api/milestones', 8000);
    });

    test('should handle large number of milestones efficiently', async () => {
      const testGoal = TEST_GOALS.find(g => g.id === 'business-product-launch')!;
      await navigateToMilestonesPhase(testGoal);
      
      // Mock response with many milestones
      const largeMilestoneSet = Array.from({ length: 15 }, (_, i) => ({
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
      
      await milestonesPage.page.route('**/api/milestones', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: largeMilestoneSet })
        });
      });
      
      await milestonesPage.clickGenerateMilestones();
      
      // UI should handle large dataset without performance issues
      const milestoneCount = await milestonesPage.getMilestoneCount();
      expect(milestoneCount).toBe(15);
      
      // Should be able to scroll through all milestones
      const lastMilestone = milestonesPage.milestoneCards.last();
      await lastMilestone.scrollIntoViewIfNeeded();
      await expect(lastMilestone).toBeVisible();
    });
  });
});