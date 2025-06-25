import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Quick Health Checks', () => {
  test('all services are healthy', async ({ request }) => {
    // Check frontend
    const frontend = await request.get('http://localhost:5174');
    expect(frontend.status()).toBe(200);
    
    // Check backend
    const backend = await request.get('http://localhost:8085/health');
    expect(backend.status()).toBe(200);
    
    // Check mock API
    const mockApi = await request.get('http://localhost:3000/health');
    expect(mockApi.status()).toBe(200);
  });

  test('frontend loads without errors', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5174');
    
    // Check for critical elements
    await expect(page.getByText('Personal AI Goal Assistant')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your goal')).toBeVisible();
    await expect(page.getByRole('button', { name: /transform/i })).toBeVisible();
    
    // Check for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('API endpoints respond correctly', async ({ request }) => {
    // Test goal translation endpoint
    const response = await request.post('http://localhost:3000/v1/chat/completions', {
      data: {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test message' }]
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('choices');
  });
});