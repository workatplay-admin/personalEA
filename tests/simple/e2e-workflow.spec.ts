import { test, expect } from '@playwright/test';

test.describe('E2E Workflow - Complete User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
  });

  test('complete goal transformation workflow', async ({ page }) => {
    // Step 1: Enter API configuration
    await page.getByPlaceholder('Enter your OpenAI API key').fill('test-api-key');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Step 2: Enter goal
    const goalInput = page.getByPlaceholder('Enter your goal');
    await goalInput.fill('Launch a successful mobile app in 6 months');
    
    // Step 3: Transform to SMART goal
    await page.getByRole('button', { name: /transform/i }).click();
    
    // Step 4: Wait for and verify SMART goal
    await expect(page.getByText('Specific:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Measurable:')).toBeVisible();
    await expect(page.getByText('Achievable:')).toBeVisible();
    await expect(page.getByText('Relevant:')).toBeVisible();
    await expect(page.getByText('Time-bound:')).toBeVisible();
    
    // Verify transformation completed
    await expect(page.getByText(/confidence/i)).toBeVisible();
  });

  test('example goals work correctly', async ({ page }) => {
    // Click example goals button
    await page.getByRole('button', { name: /example goals/i }).click();
    
    // Select first example
    const firstExample = page.locator('.example-goal').first();
    await firstExample.click();
    
    // Verify goal is populated
    const goalInput = page.getByPlaceholder('Enter your goal');
    await expect(goalInput).not.toBeEmpty();
    
    // Transform the example goal
    await page.getByRole('button', { name: /transform/i }).click();
    
    // Verify transformation
    await expect(page.getByText('Specific:')).toBeVisible({ timeout: 10000 });
  });

  test('error handling for invalid input', async ({ page }) => {
    // Try to transform without entering goal
    await page.getByRole('button', { name: /transform/i }).click();
    
    // Verify error message
    await expect(page.getByText(/please enter a goal/i)).toBeVisible();
    
    // Enter very short goal
    await page.getByPlaceholder('Enter your goal').fill('abc');
    await page.getByRole('button', { name: /transform/i }).click();
    
    // Verify validation message
    await expect(page.getByText(/please provide more details/i)).toBeVisible();
  });

  test('responsive design works', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    await expect(page.getByText('Personal AI Goal Assistant')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your goal')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Verify tablet layout
    await expect(page.getByRole('button', { name: /transform/i })).toBeVisible();
  });
});