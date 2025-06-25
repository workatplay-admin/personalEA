import { Page, expect } from '@playwright/test';
import { API_CONFIG, MOCK_RESPONSES } from './test-data';

export class TestUtils {
  constructor(private page: Page) {}

  async setupMockAPI() {
    // Mock API responses for testing
    await this.page.route('**/api/smart-goal', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.smartGoal)
      });
    });

    await this.page.route('**/api/milestones', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.milestones)
      });
    });

    await this.page.route('**/api/wbs', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.wbsTasks)
      });
    });

    await this.page.route('**/api/estimations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.estimations)
      });
    });
  }

  async setupApiConfig() {
    // Configure API settings for testing
    await this.page.goto('/');
    
    // Fill API configuration if not already done
    const apiKeyInput = this.page.locator('[data-testid="api-key-input"]');
    if (await apiKeyInput.isVisible()) {
      await apiKeyInput.fill(API_CONFIG.validApiKey);
      await this.page.locator('[data-testid="api-url-input"]').fill(API_CONFIG.validUrl);
      await this.page.locator('[data-testid="save-config-button"]').click();
    }
  }

  async waitForStepTransition(fromStep: number, toStep: number, timeout: number = 30000) {
    // Wait for step transition with timeout
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const currentStep = await this.getCurrentStep();
      if (currentStep === toStep) {
        return;
      }
      await this.page.waitForTimeout(100);
    }
    
    throw new Error(`Step transition from ${fromStep} to ${toStep} timed out after ${timeout}ms`);
  }

  async getCurrentStep(): Promise<number> {
    const activeSteps = await this.page.locator('.bg-indigo-600.border-indigo-600').count();
    return activeSteps;
  }

  async assertNoErrors() {
    // Check for any error messages on the page
    const errorMessages = this.page.locator('[data-testid*="error"], .error, .text-red-500');
    const errorCount = await errorMessages.count();
    
    if (errorCount > 0) {
      const errorTexts = await errorMessages.allTextContents();
      throw new Error(`Found ${errorCount} errors on page: ${errorTexts.join(', ')}`);
    }
  }

  async assertLoadingComplete() {
    // Ensure all loading spinners are gone
    const loadingSpinners = this.page.locator('[data-testid*="loading"], .loading');
    await expect(loadingSpinners).toHaveCount(0);
  }

  async takeScreenshotWithTimestamp(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    
    await this.page.screenshot({
      path: `test-results/screenshots/${filename}`,
      fullPage: true
    });
    
    return filename;
  }

  async getPerformanceMetrics() {
    // Get basic performance metrics
    const navigationTiming = await this.page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        loadComplete: timing.loadEventEnd - timing.loadEventStart,
        responseTime: timing.responseEnd - timing.requestStart,
        renderTime: timing.loadEventEnd - timing.navigationStart
      };
    });

    return navigationTiming;
  }

  async measureApiResponseTime(apiEndpoint: string): Promise<number> {
    const startTime = Date.now();
    
    const responsePromise = this.page.waitForResponse(response => 
      response.url().includes(apiEndpoint) && response.status() === 200
    );
    
    await responsePromise;
    return Date.now() - startTime;
  }

  async assertApiResponseTime(apiEndpoint: string, maxResponseTime: number = 5000) {
    const responseTime = await this.measureApiResponseTime(apiEndpoint);
    expect(responseTime).toBeLessThan(maxResponseTime);
  }

  async simulateSlowNetwork() {
    // Simulate slow network conditions
    const client = await this.page.context().newCDPSession(this.page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1024 * 1024, // 1MB/s
      uploadThroughput: 512 * 1024,    // 512KB/s
      latency: 200 // 200ms latency
    });
  }

  async resetNetworkConditions() {
    // Reset to normal network conditions
    const client = await this.page.context().newCDPSession(this.page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  }

  async mockApiError(endpoint: string, errorCode: number = 500, errorMessage: string = 'Internal Server Error') {
    await this.page.route(`**${endpoint}`, async route => {
      await route.fulfill({
        status: errorCode,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: errorMessage,
          message: errorMessage
        })
      });
    });
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
    });
  }

  async setLocalStorageItem(key: string, value: string) {
    await this.page.evaluate(({ key, value }) => {
      localStorage.setItem(key, value);
    }, { key, value });
  }

  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((key) => {
      return localStorage.getItem(key);
    }, key);
  }

  async waitForApiCall(endpoint: string, timeout: number = 10000): Promise<void> {
    await this.page.waitForResponse(
      response => response.url().includes(endpoint),
      { timeout }
    );
  }

  async assertElementVisibleWithRetry(selector: string, maxRetries: number = 3) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        await expect(this.page.locator(selector)).toBeVisible({ timeout: 5000 });
        return;
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw error;
        }
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  async clickWithRetry(selector: string, maxRetries: number = 3) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        await this.page.locator(selector).click({ timeout: 5000 });
        return;
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw error;
        }
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async generateTestReport(testName: string, results: any) {
    const report = {
      testName,
      timestamp: new Date().toISOString(),
      results,
      performanceMetrics: await this.getPerformanceMetrics(),
      userAgent: await this.page.evaluate(() => navigator.userAgent),
      viewport: this.page.viewportSize()
    };

    // Store report in test results
    const fs = require('fs');
    const path = require('path');
    
    const reportsDir = 'test-results/reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, `${testName}-report.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return reportPath;
  }
}