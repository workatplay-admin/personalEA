import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ApiConfigPage extends BasePage {
  readonly apiKeyInput: Locator;
  readonly apiUrlInput: Locator;
  readonly saveButton: Locator;
  readonly testConnectionButton: Locator;
  readonly connectionStatus: Locator;
  readonly configForm: Locator;

  constructor(page: Page) {
    super(page);
    this.apiKeyInput = page.locator('[data-testid="api-key-input"]');
    this.apiUrlInput = page.locator('[data-testid="api-url-input"]');
    this.saveButton = page.locator('[data-testid="save-config-button"]');
    this.testConnectionButton = page.locator('[data-testid="test-connection-button"]');
    this.connectionStatus = page.locator('[data-testid="connection-status"]');
    this.configForm = page.locator('[data-testid="api-config-form"]');
  }

  async fillApiKey(apiKey: string) {
    await this.apiKeyInput.fill(apiKey);
  }

  async fillApiUrl(apiUrl: string) {
    await this.apiUrlInput.fill(apiUrl);
  }

  async clickSave() {
    await this.saveButton.click();
  }

  async clickTestConnection() {
    await this.testConnectionButton.click();
  }

  async configureApi(apiKey: string, apiUrl: string = 'http://localhost:3001') {
    await this.fillApiKey(apiKey);
    await this.fillApiUrl(apiUrl);
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