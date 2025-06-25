import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class MilestonesPage extends BasePage {
  readonly milestonesDisplay: Locator;
  readonly milestonesTitle: Locator;
  readonly milestonesList: Locator;
  readonly generateButton: Locator;
  readonly continueButton: Locator;
  readonly editMilestoneButton: Locator;
  readonly addMilestoneButton: Locator;
  readonly loadingSpinner: Locator;
  readonly milestoneCards: Locator;
  readonly progressIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.milestonesDisplay = page.locator('[data-testid="milestones-display"]');
    this.milestonesTitle = page.locator('[data-testid="milestones-title"]');
    this.milestonesList = page.locator('[data-testid="milestones-list"]');
    this.generateButton = page.locator('[data-testid="generate-milestones-button"]');
    this.continueButton = page.locator('[data-testid="continue-to-wbs-button"]');
    this.editMilestoneButton = page.locator('[data-testid="edit-milestone-button"]');
    this.addMilestoneButton = page.locator('[data-testid="add-milestone-button"]');
    this.loadingSpinner = page.locator('[data-testid="milestones-loading"]');
    this.milestoneCards = page.locator('[data-testid^="milestone-card-"]');
    this.progressIndicator = page.locator('[data-testid="milestones-progress"]');
  }

  async assertMilestonesDisplayVisible() {
    await expect(this.milestonesDisplay).toBeVisible();
  }

  async clickGenerateMilestones() {
    await this.generateButton.click();
    
    // Wait for loading to start and finish
    await expect(this.loadingSpinner).toBeVisible();
    await this.waitForLoadingToFinish();
  }

  async assertMilestonesGenerated() {
    const milestoneCount = await this.milestoneCards.count();
    expect(milestoneCount).toBeGreaterThan(0);
  }

  async assertMilestoneCard(index: number, expectedTitle: string) {
    const milestoneCard = this.milestoneCards.nth(index);
    const title = milestoneCard.locator('[data-testid="milestone-title"]');
    await expect(title).toContainText(expectedTitle);
  }

  async assertMilestoneDetails(index: number) {
    const milestoneCard = this.milestoneCards.nth(index);
    
    // Check that essential milestone elements are present
    await expect(milestoneCard.locator('[data-testid="milestone-title"]')).toBeVisible();
    await expect(milestoneCard.locator('[data-testid="milestone-description"]')).toBeVisible();
    await expect(milestoneCard.locator('[data-testid="milestone-target-date"]')).toBeVisible();
    await expect(milestoneCard.locator('[data-testid="milestone-success-criteria"]')).toBeVisible();
  }

  async getMilestoneCount() {
    return await this.milestoneCards.count();
  }

  async clickEditMilestone(index: number) {
    const milestoneCard = this.milestoneCards.nth(index);
    const editButton = milestoneCard.locator('[data-testid="edit-milestone-button"]');
    await editButton.click();
  }

  async clickAddMilestone() {
    await this.addMilestoneButton.click();
  }

  async assertMilestoneEditorVisible() {
    const editor = this.page.locator('[data-testid="milestone-editor"]');
    await expect(editor).toBeVisible();
  }

  async editMilestoneTitle(newTitle: string) {
    const titleInput = this.page.locator('[data-testid="milestone-title-input"]');
    await titleInput.fill(newTitle);
  }

  async editMilestoneDescription(newDescription: string) {
    const descriptionInput = this.page.locator('[data-testid="milestone-description-input"]');
    await descriptionInput.fill(newDescription);
  }

  async editMilestoneTargetDate(newDate: string) {
    const dateInput = this.page.locator('[data-testid="milestone-date-input"]');
    await dateInput.fill(newDate);
  }

  async saveMilestoneChanges() {
    const saveButton = this.page.locator('[data-testid="save-milestone-button"]');
    await saveButton.click();
  }

  async cancelMilestoneEdit() {
    const cancelButton = this.page.locator('[data-testid="cancel-milestone-button"]');
    await cancelButton.click();
  }

  async assertMilestoneTimelineValid() {
    // Check that milestones are in chronological order
    const dates = await this.milestoneCards.locator('[data-testid="milestone-target-date"]').allTextContents();
    const parsedDates = dates.map(dateStr => new Date(dateStr)).filter(date => !isNaN(date.getTime()));
    
    for (let i = 1; i < parsedDates.length; i++) {
      expect(parsedDates[i].getTime()).toBeGreaterThanOrEqual(parsedDates[i-1].getTime());
    }
  }

  async assertMilestoneDependencies() {
    // Check that dependencies are properly displayed
    const dependencyElements = this.milestoneCards.locator('[data-testid="milestone-dependencies"]');
    const dependencyCount = await dependencyElements.count();
    
    if (dependencyCount > 0) {
      for (let i = 0; i < dependencyCount; i++) {
        await expect(dependencyElements.nth(i)).toBeVisible();
      }
    }
  }

  async clickContinueToWBS() {
    await this.continueButton.click();
    await this.waitForStepToBeActive(4);
  }

  async completeMilestonesPhase() {
    await this.assertMilestonesDisplayVisible();
    await this.clickGenerateMilestones();
    await this.assertMilestonesGenerated();
    
    // Validate milestone structure
    const milestoneCount = await this.getMilestoneCount();
    for (let i = 0; i < milestoneCount; i++) {
      await this.assertMilestoneDetails(i);
    }
    
    await this.assertMilestoneTimelineValid();
    await this.clickContinueToWBS();
  }

  async validateMilestoneData() {
    const milestoneCount = await this.getMilestoneCount();
    expect(milestoneCount).toBeGreaterThan(2); // Should have at least 3 milestones
    expect(milestoneCount).toBeLessThan(10); // Should not be overwhelming
    
    // Check each milestone has required fields
    for (let i = 0; i < milestoneCount; i++) {
      await this.assertMilestoneDetails(i);
    }
  }
}