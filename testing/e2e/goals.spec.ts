import { test, expect, type Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';

// Test data generators
function generateGoalData() {
  return {
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(['Personal', 'Professional', 'Health', 'Financial']),
    priority: faker.helpers.arrayElement(['High', 'Medium', 'Low']),
    deadline: faker.date.future(),
    measurableTarget: faker.number.int({ min: 1, max: 100 }),
    timebound: '3 months'
  };
}

// Helper functions
async function loginUser(page: Page) {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'mock-jwt-token',
        user: { id: '123', email: 'test@example.com', name: 'Test User' }
      })
    });
  });

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

async function mockGoalEndpoints(page: Page) {
  const mockGoals = Array.from({ length: 5 }, (_, i) => ({
    id: faker.string.uuid(),
    ...generateGoalData(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    progress: faker.number.int({ min: 0, max: 100 })
  }));

  await page.route('**/api/goals**', async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === 'GET' && url.includes('/goals')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGoals)
      });
    } else if (method === 'POST') {
      const data = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: faker.string.uuid(),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          progress: 0
        })
      });
    } else if (method === 'PUT') {
      const data = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...data,
          updatedAt: new Date()
        })
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 204
      });
    }
  });
}

test.describe('Goal Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockGoalEndpoints(page);
    await loginUser(page);
  });

  test.describe('Goal Creation', () => {
    test('should create a new SMART goal', async ({ page }) => {
      await page.click('text=New Goal');
      
      // Fill in goal details
      await page.fill('input[name="title"]', 'Learn Spanish');
      await page.fill('textarea[name="description"]', 'Become conversational in Spanish for upcoming trip');
      
      // Make it SMART
      await page.selectOption('select[name="category"]', 'Personal');
      await page.fill('input[name="specific"]', 'Complete Spanish course and practice daily');
      await page.fill('input[name="measurable"]', 'Pass B2 level certification');
      await page.fill('input[name="achievable"]', 'Study 1 hour daily with app and tutor');
      await page.fill('input[name="relevant"]', 'Need Spanish for business trip to Madrid');
      await page.fill('input[name="timebound"]', '6 months');
      
      // Set priority and deadline
      await page.selectOption('select[name="priority"]', 'High');
      await page.fill('input[name="deadline"]', '2024-12-31');
      
      // Submit
      await page.click('button[type="submit"]');
      
      // Verify success
      await expect(page.locator('text=Goal created successfully')).toBeVisible();
      await expect(page.locator('text=Learn Spanish')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.click('text=New Goal');
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Check validation messages
      await expect(page.locator('text=Title is required')).toBeVisible();
      await expect(page.locator('text=Category is required')).toBeVisible();
    });

    test('should auto-save draft while typing', async ({ page }) => {
      await page.click('text=New Goal');
      
      // Type in title
      await page.fill('input[name="title"]', 'Draft Goal');
      
      // Wait for auto-save
      await page.waitForTimeout(2000);
      
      // Refresh page
      await page.reload();
      
      // Check if draft is restored
      await page.click('text=New Goal');
      await expect(page.locator('input[name="title"]')).toHaveValue('Draft Goal');
    });

    test('should suggest goal templates', async ({ page }) => {
      await page.click('text=New Goal');
      await page.click('text=Use Template');
      
      // Select a template
      await page.click('text=Fitness Goal Template');
      
      // Verify template fields are populated
      await expect(page.locator('select[name="category"]')).toHaveValue('Health');
      await expect(page.locator('input[name="measurable"]')).not.toBeEmpty();
    });
  });

  test.describe('Goal List View', () => {
    test('should display all goals', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      
      // Wait for goals to load
      await page.waitForSelector('[data-testid="goal-card"]');
      
      // Verify goals are displayed
      const goalCards = page.locator('[data-testid="goal-card"]');
      await expect(goalCards).toHaveCount(5);
    });

    test('should filter goals by category', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      
      // Apply filter
      await page.selectOption('select[name="categoryFilter"]', 'Personal');
      
      // Verify filtered results
      const goalCards = page.locator('[data-testid="goal-card"]:visible');
      const count = await goalCards.count();
      expect(count).toBeGreaterThan(0);
      
      // Check all visible goals have correct category
      for (let i = 0; i < count; i++) {
        await expect(goalCards.nth(i).locator('[data-category]')).toHaveAttribute('data-category', 'Personal');
      }
    });

    test('should sort goals by priority', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      
      // Sort by priority
      await page.selectOption('select[name="sortBy"]', 'priority');
      
      // Verify high priority goals appear first
      const firstGoal = page.locator('[data-testid="goal-card"]').first();
      await expect(firstGoal.locator('[data-priority]')).toHaveAttribute('data-priority', 'High');
    });

    test('should search goals by keyword', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      
      // Search for a specific goal
      await page.fill('input[name="search"]', 'Spanish');
      
      // Verify search results
      await expect(page.locator('[data-testid="goal-card"]:has-text("Spanish")')).toBeVisible();
    });
  });

  test.describe('Goal Details and Editing', () => {
    test('should view goal details', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      
      // Click on first goal
      await page.locator('[data-testid="goal-card"]').first().click();
      
      // Verify details page
      await expect(page).toHaveURL(/\/goals\/[\w-]+/);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="goal-progress"]')).toBeVisible();
    });

    test('should edit goal information', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      await page.locator('[data-testid="goal-card"]').first().click();
      
      // Click edit button
      await page.click('button[aria-label="Edit goal"]');
      
      // Update title
      await page.fill('input[name="title"]', 'Updated Goal Title');
      
      // Save changes
      await page.click('button[text="Save Changes"]');
      
      // Verify update
      await expect(page.locator('text=Goal updated successfully')).toBeVisible();
      await expect(page.locator('h1')).toHaveText('Updated Goal Title');
    });

    test('should update goal progress', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      await page.locator('[data-testid="goal-card"]').first().click();
      
      // Update progress slider
      const slider = page.locator('input[type="range"][name="progress"]');
      await slider.fill('75');
      
      // Save progress
      await page.click('button[text="Update Progress"]');
      
      // Verify update
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('75%');
    });

    test('should add milestones to goal', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      await page.locator('[data-testid="goal-card"]').first().click();
      
      // Add milestone
      await page.click('button[text="Add Milestone"]');
      await page.fill('input[name="milestoneName"]', 'Complete Chapter 1');
      await page.fill('input[name="milestoneDate"]', '2024-07-01');
      await page.click('button[text="Add"]');
      
      // Verify milestone added
      await expect(page.locator('text=Complete Chapter 1')).toBeVisible();
    });
  });

  test.describe('Goal Deletion', () => {
    test('should delete a goal with confirmation', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      
      // Click delete on first goal
      await page.locator('[data-testid="goal-card"]').first().hover();
      await page.click('button[aria-label="Delete goal"]');
      
      // Confirm deletion
      await expect(page.locator('text=Are you sure you want to delete this goal?')).toBeVisible();
      await page.click('button[text="Delete"]');
      
      // Verify deletion
      await expect(page.locator('text=Goal deleted successfully')).toBeVisible();
    });

    test('should cancel goal deletion', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      
      const initialCount = await page.locator('[data-testid="goal-card"]').count();
      
      // Start deletion
      await page.locator('[data-testid="goal-card"]').first().hover();
      await page.click('button[aria-label="Delete goal"]');
      
      // Cancel deletion
      await page.click('button[text="Cancel"]');
      
      // Verify goal still exists
      await expect(page.locator('[data-testid="goal-card"]')).toHaveCount(initialCount);
    });
  });

  test.describe('Goal Analytics', () => {
    test('should display goal statistics', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals/analytics`);
      
      // Verify analytics components
      await expect(page.locator('[data-testid="total-goals"]')).toBeVisible();
      await expect(page.locator('[data-testid="completed-goals"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="goals-by-category-chart"]')).toBeVisible();
    });

    test('should show goal completion trends', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals/analytics`);
      
      // Check trend chart
      await expect(page.locator('[data-testid="completion-trend-chart"]')).toBeVisible();
      
      // Interact with chart
      await page.hover('[data-testid="completion-trend-chart"]');
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    });
  });

  test.describe('Goal Sharing and Collaboration', () => {
    test('should share goal with team member', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      await page.locator('[data-testid="goal-card"]').first().click();
      
      // Click share button
      await page.click('button[aria-label="Share goal"]');
      
      // Add collaborator
      await page.fill('input[name="collaboratorEmail"]', 'colleague@example.com');
      await page.click('button[text="Send Invitation"]');
      
      // Verify invitation sent
      await expect(page.locator('text=Invitation sent to colleague@example.com')).toBeVisible();
    });

    test('should comment on shared goal', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals/shared/123`);
      
      // Add comment
      await page.fill('textarea[name="comment"]', 'Great progress on this goal!');
      await page.click('button[text="Post Comment"]');
      
      // Verify comment posted
      await expect(page.locator('text=Great progress on this goal!')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load goals list within 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/goals`);
      await page.waitForSelector('[data-testid="goal-card"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('should handle large number of goals efficiently', async ({ page }) => {
      // Mock 100 goals
      const manyGoals = Array.from({ length: 100 }, () => ({
        id: faker.string.uuid(),
        ...generateGoalData()
      }));

      await page.route('**/api/goals', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(manyGoals)
        });
      });

      await page.goto(`${BASE_URL}/goals`);
      
      // Verify pagination or virtualization
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be navigable with keyboard only', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      
      // Tab to first goal
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Open goal with Enter
      await page.keyboard.press('Enter');
      
      // Verify navigation worked
      await expect(page).toHaveURL(/\/goals\/[\w-]+/);
    });

    test('should announce goal updates to screen readers', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`);
      
      // Check for ARIA live regions
      await expect(page.locator('[aria-live="polite"]')).toBeAttached();
      
      // Create a goal and verify announcement
      await page.click('text=New Goal');
      await page.fill('input[name="title"]', 'Accessible Goal');
      await page.click('button[type="submit"]');
      
      // Check for success announcement
      await expect(page.locator('[aria-live="polite"]')).toContainText('Goal created successfully');
    });
  });
});