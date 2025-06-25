import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(url?: string) {
    await this.page.goto(url || '/');
  }

  async waitForLoadingToFinish() {
    // Wait for loading spinners to disappear
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden', timeout: 30000 });
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  async waitForStepToBeActive(stepNumber: number) {
    const stepIndicator = this.page.locator(`[data-testid="step-${stepNumber}"]`);
    await expect(stepIndicator).toHaveClass(/bg-indigo-600/);
  }

  async getProgressSteps() {
    return this.page.locator('[data-testid^="step-"]');
  }

  async getCurrentStep(): Promise<number> {
    const activeSteps = await this.page.locator('.bg-indigo-600.border-indigo-600').count();
    return activeSteps;
  }

  async clickResetButton() {
    await this.page.locator('button:has-text("Start Over")').click();
  }

  async assertPageTitle(expectedTitle: string) {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  async assertMainHeading(expectedHeading: string) {
    const heading = this.page.locator('h1');
    await expect(heading).toContainText(expectedHeading);
  }

  async waitForApiResponse(urlPattern: string | RegExp) {
    return this.page.waitForResponse(urlPattern);
  }

  async mockApiResponse(url: string | RegExp, response: any) {
    await this.page.route(url, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }
}