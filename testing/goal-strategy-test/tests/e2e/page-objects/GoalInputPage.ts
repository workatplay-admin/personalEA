import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class GoalInputPage extends BasePage {
  readonly goalInput: Locator;
  readonly submitButton: Locator;
  readonly clearButton: Locator;
  readonly characterCount: Locator;
  readonly exampleGoals: Locator;
  readonly goalForm: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    super(page);
    this.goalInput = page.locator('[data-testid="goal-input-textarea"]');
    this.submitButton = page.locator('[data-testid="submit-goal-button"]');
    this.clearButton = page.locator('[data-testid="clear-goal-button"]');
    this.characterCount = page.locator('[data-testid="character-count"]');
    this.exampleGoals = page.locator('[data-testid="example-goals"]');
    this.goalForm = page.locator('[data-testid="goal-input-form"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
  }

  async enterGoal(goalText: string) {
    await this.goalInput.fill(goalText);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async clickClear() {
    await this.clearButton.click();
  }

  async selectExampleGoal(index: number = 0) {
    const exampleGoal = this.exampleGoals.nth(index);
    await exampleGoal.click();
  }

  async submitGoal(goalText: string) {
    await this.enterGoal(goalText);
    await this.clickSubmit();
    
    // Wait for loading to start and finish
    await expect(this.loadingSpinner).toBeVisible();
    await this.waitForLoadingToFinish();
    
    // Wait for step to advance to SMART goal display
    await this.waitForStepToBeActive(2);
  }

  async assertFormVisible() {
    await expect(this.goalForm).toBeVisible();
  }

  async assertGoalInputEmpty() {
    await expect(this.goalInput).toHaveValue('');
  }

  async assertGoalInputHasValue(expectedValue: string) {
    await expect(this.goalInput).toHaveValue(expectedValue);
  }

  async assertSubmitButtonDisabled() {
    await expect(this.submitButton).toBeDisabled();
  }

  async assertSubmitButtonEnabled() {
    await expect(this.submitButton).toBeEnabled();
  }

  async assertCharacterCount(expectedCount: number) {
    await expect(this.characterCount).toContainText(expectedCount.toString());
  }

  async assertMinimumCharacterValidation() {
    const validationMessage = this.page.locator('[data-testid="validation-error"]');
    await expect(validationMessage).toContainText('Goal must be at least');
  }

  async assertMaximumCharacterValidation() {
    const validationMessage = this.page.locator('[data-testid="validation-error"]');
    await expect(validationMessage).toContainText('Goal cannot exceed');
  }

  async assertExampleGoalsVisible() {
    await expect(this.exampleGoals).toBeVisible();
  }

  async getExampleGoalsCount() {
    return await this.exampleGoals.count();
  }
}