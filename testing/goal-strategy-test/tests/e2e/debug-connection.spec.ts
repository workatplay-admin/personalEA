import { test, expect } from '@playwright/test';

test.describe('Debug Backend Connection', () => {
  test('test connection through test page', async ({ page }) => {
    // Navigate to test page
    await page.goto('/test-connection.html');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Backend Connection Test');
    
    // Click test health button
    await page.click('button:has-text("Test Health Endpoint")');
    
    // Wait for result
    await page.waitForSelector('.test-result', { timeout: 10000 });
    
    // Check if it's a success
    const resultClass = await page.locator('.test-result').getAttribute('class');
    console.log('Health test result class:', resultClass);
    
    // Get the result content
    const resultContent = await page.locator('.test-result pre').textContent();
    console.log('Health test result:', resultContent);
    
    // Test auth endpoint
    await page.click('button:has-text("Test Auth Token Endpoint")');
    
    // Wait for new result
    await page.waitForTimeout(1000);
    
    // Get auth result
    const authResultContent = await page.locator('.test-result pre').last().textContent();
    console.log('Auth test result:', authResultContent);
  });

  test('test actual app connection', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Check console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    // Check network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log('API Request:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log('API Response:', response.status(), response.url());
      }
    });
    
    // Wait for API config component
    await page.waitForSelector('input[placeholder*="API key"]', { timeout: 10000 });
    
    // Enter a test API key
    await page.fill('input[placeholder*="API key"]', 'sk-test1234567890abcdef');
    
    // Click save
    await page.click('button:has-text("Save Configuration")');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check for error message
    const errorMessage = await page.locator('.text-red-600').textContent().catch(() => null);
    console.log('Error message:', errorMessage);
  });
});