import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ApiConfigPage extends BasePage {
  readonly apiKeyInput: Locator;
  readonly saveButton: Locator;
  readonly testConnectionButton: Locator;
  readonly connectionStatus: Locator;
  readonly configForm: Locator;

  constructor(page: Page) {
    super(page);
    this.apiKeyInput = page.locator('input[placeholder*="API key"], input[placeholder*="OpenAI API Key"]');
    this.saveButton = page.locator('button:has-text("Configure API"), button:has-text("Save Configuration")');
    this.testConnectionButton = page.locator('[data-testid="test-connection-button"]');
    this.connectionStatus = page.locator('[data-testid="connection-status"]');
    this.configForm = page.locator('[data-testid="api-config-form"], form');
  }

  async fillApiKey(apiKey: string) {
    await this.apiKeyInput.fill(apiKey);
  }

  async clickSave() {
    await this.saveButton.click();
  }

  async clickTestConnection() {
    await this.testConnectionButton.click();
  }

  async configureApi(apiKey: string, apiUrl?: string) {
    await this.fillApiKey(apiKey);
    await this.clickSave();
    
    // Wait for configuration to be saved and step to advance
    await this.waitForStepToBeActive(1);
  }

  async assertConfigurationVisible() {
    await expect(this.configForm).toBeVisible();
  }

  async assertApiKeyRequired() {
    await expect(this.apiKeyInput).toHaveAttribute('required');
  }

  async assertConnectionStatus(expectedStatus: 'success' | 'error' | 'testing') {
    const statusClasses = {
      success: /text-green/,
      error: /text-red/,
      testing: /text-yellow/
    };
    
    await expect(this.connectionStatus).toHaveClass(statusClasses[expectedStatus]);
  }

  async assertValidationError(message: string) {
    const errorMessage = this.page.locator('[data-testid="validation-error"]');
    await expect(errorMessage).toContainText(message);
  }
}