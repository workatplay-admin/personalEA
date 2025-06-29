import { test, expect, type Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';

// Helper functions
async function mockAuthEndpoints(page: Page) {
  await page.route('**/api/auth/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-jwt-token',
          user: {
            id: '123',
            email: 'test@example.com',
            name: 'Test User'
          }
        })
      });
    } else if (url.includes('/register')) {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'User registered successfully',
          userId: faker.string.uuid()
        })
      });
    } else if (url.includes('/logout')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Logged out successfully' })
      });
    }
  });
}

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await page.goto(BASE_URL);
  });

  test.describe('Login Flow', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      // Navigate to login
      await page.click('text=Login');
      
      // Fill in credentials
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify successful login
      await expect(page.locator('text=Welcome, Test User')).toBeVisible();
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.route('**/api/auth/login', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid credentials' })
        });
      });

      await page.click('text=Login');
      await page.fill('input[name="email"]', 'wrong@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'password123');
      
      // Check for HTML5 validation
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toHaveAttribute('type', 'email');
      
      // Try to submit
      await page.click('button[type="submit"]');
      
      // Verify form validation
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await page.route('**/api/auth/login', async (route) => {
        await route.abort('failed');
      });

      await page.click('text=Login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Network error. Please try again.')).toBeVisible();
    });
  });

  test.describe('Registration Flow', () => {
    test('should successfully register new user', async ({ page }) => {
      const email = faker.internet.email();
      
      await page.click('text=Sign Up');
      await page.fill('input[name="name"]', faker.person.fullName());
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Registration successful')).toBeVisible();
      await expect(page).toHaveURL(`${BASE_URL}/login`);
    });

    test('should validate password requirements', async ({ page }) => {
      await page.click('text=Sign Up');
      
      // Test weak password
      await page.fill('input[name="password"]', '123');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    });

    test('should ensure passwords match', async ({ page }) => {
      await page.click('text=Sign Up');
      
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Passwords do not match')).toBeVisible();
    });
  });

  test.describe('Logout Flow', () => {
    test('should successfully logout', async ({ page }) => {
      // First login
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Wait for dashboard
      await page.waitForURL(`${BASE_URL}/dashboard`);
      
      // Logout
      await page.click('button[aria-label="User menu"]');
      await page.click('text=Logout');
      
      await expect(page).toHaveURL(BASE_URL);
      await expect(page.locator('text=Login')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should redirect to login when session expires', async ({ page }) => {
      // Simulate expired session
      await page.route('**/api/user/profile', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Session expired' })
        });
      });

      await page.goto(`${BASE_URL}/dashboard`);
      
      await expect(page).toHaveURL(`${BASE_URL}/login`);
      await expect(page.locator('text=Session expired. Please login again.')).toBeVisible();
    });

    test('should persist session across page refreshes', async ({ page }) => {
      // Login
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.waitForURL(`${BASE_URL}/dashboard`);
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
      await expect(page.locator('text=Welcome, Test User')).toBeVisible();
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should send password reset email', async ({ page }) => {
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Reset email sent' })
        });
      });

      await page.click('text=Login');
      await page.click('text=Forgot password?');
      
      await page.fill('input[name="email"]', 'test@example.com');
      await page.click('button[text="Send Reset Email"]');
      
      await expect(page.locator('text=Reset email sent to test@example.com')).toBeVisible();
    });
  });

  test.describe('Social Authentication', () => {
    test('should login with Google', async ({ page }) => {
      await page.route('**/api/auth/google', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'google-jwt-token',
            user: {
              id: '456',
              email: 'google@example.com',
              name: 'Google User',
              provider: 'google'
            }
          })
        });
      });

      await page.click('text=Login');
      await page.click('button[aria-label="Sign in with Google"]');
      
      // In real scenario, this would open OAuth popup
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.click('text=Login');
      
      // Tab through form elements
      await page.keyboard.press('Tab'); // Focus email
      await page.keyboard.type('test@example.com');
      
      await page.keyboard.press('Tab'); // Focus password
      await page.keyboard.type('password123');
      
      await page.keyboard.press('Tab'); // Focus submit button
      await page.keyboard.press('Enter');
      
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.click('text=Login');
      
      await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-label', 'Email address');
      await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-label', 'Password');
      await expect(page.locator('button[type="submit"]')).toHaveAttribute('aria-label', 'Sign in');
    });
  });

  test.describe('Visual Regression', () => {
    test('login page should match visual snapshot', async ({ page }) => {
      await page.click('text=Login');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('login-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('registration page should match visual snapshot', async ({ page }) => {
      await page.click('text=Sign Up');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('registration-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });
});