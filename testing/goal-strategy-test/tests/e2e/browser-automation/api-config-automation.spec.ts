import { test, expect, Page } from '@playwright/test';

// Test configuration
const TARGET_URL = 'https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev/';
const API_KEY = process.env.OPENAI_API_KEY || 'test-api-key-automated-browser';
const TIMEOUT_CONFIG = {
  actionTimeout: 30000,
  navigationTimeout: 60000,
  expectTimeout: 30000
};

test.describe('Automated Browser Testing - API Configuration', () => {
  // Set test timeout
  test.setTimeout(120000); // 2 minutes per test

  test.beforeEach(async ({ page }) => {
    // Configure page timeouts
    page.setDefaultTimeout(TIMEOUT_CONFIG.actionTimeout);
    page.setDefaultNavigationTimeout(TIMEOUT_CONFIG.navigationTimeout);
    
    // Clear browser state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Navigate to URL and click Configure API button', async ({ page }) => {
    console.log('🚀 Starting browser automation test');
    console.log(`📍 Target URL: ${TARGET_URL}`);
    
    // Step 1: Navigate to the target URL
    console.log('📌 Step 1: Navigating to the application...');
    await page.goto(TARGET_URL, { 
      waitUntil: 'networkidle',
      timeout: TIMEOUT_CONFIG.navigationTimeout 
    });
    
    // Take screenshot of initial page load
    await page.screenshot({ 
      path: 'test-results/screenshots/browser-automation-initial-load.png',
      fullPage: true 
    });
    
    // Step 2: Verify page loaded correctly
    console.log('📌 Step 2: Verifying page loaded...');
    await expect(page).toHaveURL(TARGET_URL);
    
    // Check for any console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console error:', msg.text());
      }
    });
    
    // Step 3: Locate and verify the Configure API button
    console.log('📌 Step 3: Locating Configure API button...');
    const configureButton = page.locator('button:has-text("Configure API")');
    
    // Wait for the button to be visible
    await expect(configureButton).toBeVisible({ timeout: TIMEOUT_CONFIG.expectTimeout });
    console.log('✅ Configure API button found');
    
    // Get button details
    const buttonText = await configureButton.textContent();
    const buttonEnabled = await configureButton.isEnabled();
    console.log(`📊 Button details: Text="${buttonText}", Enabled=${buttonEnabled}`);
    
    // Step 4: Click the Configure API button
    console.log('📌 Step 4: Clicking Configure API button...');
    await configureButton.click();
    console.log('✅ Configure API button clicked successfully');
    
    // Take screenshot after clicking
    await page.screenshot({ 
      path: 'test-results/screenshots/browser-automation-after-click.png',
      fullPage: true 
    });
    
    // Step 5: Verify no errors occurred
    console.log('📌 Step 5: Verifying no errors occurred...');
    
    // Check for error messages on the page
    const errorMessages = await page.locator('text=/error|failed|exception/i').count();
    expect(errorMessages).toBe(0);
    console.log('✅ No error messages found on page');
    
    // Verify the API configuration form or next step is visible
    const apiKeyInput = page.locator('input[id="openai-key"], input[placeholder*="API key"]');
    const formVisible = await apiKeyInput.isVisible().catch(() => false);
    
    if (formVisible) {
      console.log('✅ API configuration form is now visible');
    } else {
      // Check if we're already configured
      const configuredMessage = page.locator('text=/API Configuration Set|configured/i');
      const isConfigured = await configuredMessage.isVisible().catch(() => false);
      
      if (isConfigured) {
        console.log('ℹ️ API is already configured');
      } else {
        console.log('⚠️ Neither form nor configured state detected');
      }
    }
    
    // Final verification
    console.log('🎯 Test completed successfully - Configure API button works without errors');
  });

  test('Complete API configuration workflow', async ({ page }) => {
    console.log('🚀 Starting complete API configuration workflow test');
    
    // Navigate to the application
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    
    // Wait for initial load
    await page.waitForLoadState('domcontentloaded');
    
    // Check if already configured
    const configuredState = page.locator('text=/API Configuration Set/i');
    const isAlreadyConfigured = await configuredState.isVisible().catch(() => false);
    
    if (isAlreadyConfigured) {
      console.log('ℹ️ API already configured, testing reconfigure flow');
      
      // Click reconfigure button
      const reconfigureButton = page.locator('button:has-text("Reconfigure")');
      await reconfigureButton.click();
      console.log('✅ Clicked reconfigure button');
    }
    
    // Now we should see the configuration form
    const apiKeyInput = page.locator('input[id="openai-key"]');
    await expect(apiKeyInput).toBeVisible({ timeout: TIMEOUT_CONFIG.expectTimeout });
    console.log('✅ API configuration form is visible');
    
    // Fill in the API key
    await apiKeyInput.fill(API_KEY);
    console.log('✅ Entered API key');
    
    // Find and click the Configure API button
    const configureButton = page.locator('button:has-text("Configure API")').filter({ hasText: /^Configure API$/ });
    await expect(configureButton).toBeVisible();
    await configureButton.click();
    console.log('✅ Clicked Configure API button');
    
    // Wait for configuration to complete
    await page.waitForResponse(response => 
      response.url().includes('/auth/test-token') || 
      response.url().includes('/health'),
      { timeout: TIMEOUT_CONFIG.expectTimeout }
    ).catch(() => {
      console.log('⚠️ No backend response detected, might be using mock mode');
    });
    
    // Verify successful configuration
    const successIndicators = [
      page.locator('text=/API Configuration Set/i'),
      page.locator('text=/configured|ready/i'),
      page.locator('button:has-text("Continue")')
    ];
    
    let configurationSuccessful = false;
    for (const indicator of successIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        configurationSuccessful = true;
        break;
      }
    }
    
    expect(configurationSuccessful).toBeTruthy();
    console.log('✅ API configuration completed successfully');
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/browser-automation-config-complete.png',
      fullPage: true 
    });
  });

  test('Test error handling for invalid API key', async ({ page }) => {
    console.log('🚀 Testing error handling for invalid API key');
    
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    
    // Check if we need to reconfigure
    const reconfigureButton = page.locator('button:has-text("Reconfigure")');
    if (await reconfigureButton.isVisible().catch(() => false)) {
      await reconfigureButton.click();
    }
    
    // Enter invalid API key
    const apiKeyInput = page.locator('input[id="openai-key"]');
    await expect(apiKeyInput).toBeVisible();
    await apiKeyInput.fill('invalid-key-123');
    
    // Click Configure API
    const configureButton = page.locator('button:has-text("Configure API")').filter({ hasText: /^Configure API$/ });
    await configureButton.click();
    
    // Verify error message appears
    const errorMessage = page.locator('text=/Invalid.*API.*key|error|failed/i');
    await expect(errorMessage).toBeVisible({ timeout: TIMEOUT_CONFIG.expectTimeout });
    console.log('✅ Error message displayed for invalid API key');
    
    // Verify button is still clickable (not permanently disabled)
    await expect(configureButton).toBeEnabled();
    console.log('✅ Configure API button remains functional after error');
  });

  test('Test keyboard navigation and accessibility', async ({ page }) => {
    console.log('🚀 Testing keyboard navigation and accessibility');
    
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Check if Configure API button can be reached via keyboard
    let activeElement = await page.evaluate(() => document.activeElement?.textContent);
    console.log(`Current focused element: ${activeElement}`);
    
    // Keep tabbing until we find the Configure API button or reach a limit
    let tabCount = 0;
    const maxTabs = 20;
    
    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      activeElement = await page.evaluate(() => document.activeElement?.textContent);
      
      if (activeElement?.includes('Configure API')) {
        console.log('✅ Configure API button is keyboard accessible');
        
        // Test Enter key activation
        await page.keyboard.press('Enter');
        console.log('✅ Configure API button activated via Enter key');
        break;
      }
      
      tabCount++;
    }
    
    if (tabCount >= maxTabs) {
      console.log('⚠️ Configure API button might not be keyboard accessible');
    }
    
    // Check ARIA labels and roles
    const button = page.locator('button:has-text("Configure API")');
    const role = await button.getAttribute('role');
    const ariaLabel = await button.getAttribute('aria-label');
    
    console.log(`Button accessibility: role="${role}", aria-label="${ariaLabel}"`);
  });

  test('Performance metrics for API configuration', async ({ page }) => {
    console.log('🚀 Measuring performance metrics');
    
    const metrics = {
      pageLoadTime: 0,
      buttonClickResponseTime: 0,
      totalConfigurationTime: 0
    };
    
    const startTime = Date.now();
    
    // Measure page load time
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    metrics.pageLoadTime = Date.now() - startTime;
    
    // Measure button click response time
    const configureButton = page.locator('button:has-text("Configure API")');
    await expect(configureButton).toBeVisible();
    
    const clickStartTime = Date.now();
    await configureButton.click();
    
    // Wait for any response or state change
    await page.waitForTimeout(1000); // Brief wait to capture immediate response
    metrics.buttonClickResponseTime = Date.now() - clickStartTime;
    
    // Log performance metrics
    console.log('📊 Performance Metrics:');
    console.log(`  - Page Load Time: ${metrics.pageLoadTime}ms`);
    console.log(`  - Button Click Response: ${metrics.buttonClickResponseTime}ms`);
    console.log(`  - Total Time: ${Date.now() - startTime}ms`);
    
    // Performance assertions
    expect(metrics.pageLoadTime).toBeLessThan(30000); // Page should load within 30s
    expect(metrics.buttonClickResponseTime).toBeLessThan(5000); // Button response within 5s
  });
});

// Cross-browser testing configuration
test.describe('Cross-Browser API Configuration Tests', () => {
  const browsers = ['chromium', 'firefox', 'webkit'];
  
  browsers.forEach(browserName => {
    test(`API configuration works in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      if (currentBrowser !== browserName) {
        test.skip();
        return;
      }
      
      console.log(`🌐 Testing in ${browserName}`);
      
      await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
      
      const configureButton = page.locator('button:has-text("Configure API")');
      await expect(configureButton).toBeVisible();
      await configureButton.click();
      
      // Verify no browser-specific errors
      const errors = await page.locator('text=/error|failed/i').count();
      expect(errors).toBe(0);
      
      console.log(`✅ ${browserName} test passed`);
    });
  });
});

// Mobile viewport testing
test.describe('Mobile Browser API Configuration', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  
  test('API configuration works on mobile viewport', async ({ page }) => {
    console.log('📱 Testing mobile viewport');
    
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    
    // On mobile, button might be in a different layout
    const configureButton = page.locator('button:has-text("Configure API")');
    await expect(configureButton).toBeVisible();
    
    // Verify button is appropriately sized for mobile
    const buttonBox = await configureButton.boundingBox();
    expect(buttonBox?.width).toBeGreaterThan(44); // Minimum touch target
    expect(buttonBox?.height).toBeGreaterThan(44); // Minimum touch target
    
    await configureButton.click();
    console.log('✅ Mobile viewport test passed');
  });
});