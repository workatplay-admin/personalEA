import { test, expect, Page } from '@playwright/test';
import { GoalInputPage } from '../page-objects/GoalInputPage';
import { SmartGoalPage } from '../page-objects/SmartGoalPage';
import { MilestonesPage } from '../page-objects/MilestonesPage';
import { WBSPage } from '../page-objects/WBSPage';
import { EstimationPage } from '../page-objects/EstimationPage';
import { ApiConfigPage } from '../page-objects/ApiConfigPage';

test.describe('Keyboard Navigation and Accessibility', () => {
  let page: Page;
  let goalInputPage: GoalInputPage;
  let smartGoalPage: SmartGoalPage;
  let milestonesPage: MilestonesPage;
  let wbsPage: WBSPage;
  let estimationPage: EstimationPage;
  let apiConfigPage: ApiConfigPage;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    goalInputPage = new GoalInputPage(page);
    smartGoalPage = new SmartGoalPage(page);
    milestonesPage = new MilestonesPage(page);
    wbsPage = new WBSPage(page);
    estimationPage = new EstimationPage(page);
    apiConfigPage = new ApiConfigPage(page);

    await page.goto('/');
    await apiConfigPage.configureApi(process.env.OPENAI_API_KEY || 'test-key', 'http://localhost:3001');
  });

  test('Complete workflow using keyboard only', async () => {
    // Tab to goal input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Type goal
    await page.keyboard.type('I want to learn React development');
    
    // Tab to submit button and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Wait for SMART goal
    await smartGoalPage.assertSmartGoalDisplayed();
    
    // Navigate through SMART goal details with arrow keys
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Continue with Enter key
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Verify milestones page is accessible
    await milestonesPage.assertMilestonesDisplayVisible();
  });

  test('Focus management and tab order', async () => {
    // Get all focusable elements
    const focusableElements = await page.locator('button, input, textarea, a, [tabindex]:not([tabindex="-1"])').all();
    
    // Verify tab order by pressing Tab and checking active element
    for (let i = 0; i < focusableElements.length; i++) {
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeTruthy();
    }
    
    // Test reverse tab order
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+Tab');
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeTruthy();
    }
  });

  test('Screen reader announcements', async () => {
    // Monitor ARIA live regions
    const liveRegions = await page.locator('[aria-live]').all();
    expect(liveRegions.length).toBeGreaterThan(0);
    
    // Enter goal and submit
    await goalInputPage.enterGoal('Build a mobile app');
    await goalInputPage.clickSubmit();
    
    // Check for loading announcements
    const loadingAnnouncement = await page.locator('[aria-live="polite"]:has-text("Loading"), [aria-busy="true"]').count();
    expect(loadingAnnouncement).toBeGreaterThan(0);
    
    // Check for completion announcements
    await smartGoalPage.assertSmartGoalDisplayed();
    const completionAnnouncement = await page.locator('[aria-live]:has-text("complete"), [aria-live]:has-text("ready")').count();
    expect(completionAnnouncement).toBeGreaterThan(0);
  });

  test('Keyboard shortcuts', async () => {
    // Test common shortcuts
    await goalInputPage.enterGoal('Test goal for shortcuts');
    
    // Ctrl+A to select all
    await page.keyboard.press('Control+A');
    await page.keyboard.type('New goal text');
    await goalInputPage.assertGoalInputHasValue('New goal text');
    
    // Escape key to close modals/dialogs
    const dialog = page.locator('[role="dialog"], .modal');
    if (await dialog.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });

  test('Focus trapping in modals', async () => {
    // Trigger a modal if available
    const modalTrigger = page.locator('button:has-text("Help"), button:has-text("Info"), button:has-text("Settings")');
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();
      
      // Verify focus is trapped within modal
      const modal = page.locator('[role="dialog"], .modal');
      await expect(modal).toBeVisible();
      
      // Tab through modal elements
      const modalFocusableElements = await modal.locator('button, input, textarea, a, [tabindex]:not([tabindex="-1"])').count();
      
      for (let i = 0; i < modalFocusableElements + 2; i++) {
        await page.keyboard.press('Tab');
        const activeElement = await page.evaluate(() => {
          const active = document.activeElement;
          const modal = active?.closest('[role="dialog"], .modal');
          return modal !== null;
        });
        expect(activeElement).toBe(true);
      }
    }
  });

  test('Keyboard navigation with form validation', async () => {
    // Try to submit empty form with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Check for validation message
    const validationMessage = page.locator('[role="alert"], .error-message, [aria-invalid="true"]');
    await expect(validationMessage).toBeVisible();
    
    // Fix validation error
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.type('Valid goal text');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Verify submission proceeds
    await smartGoalPage.assertSmartGoalDisplayed();
  });

  test('Skip links functionality', async () => {
    // Focus on skip link (usually first focusable element)
    await page.keyboard.press('Tab');
    
    const skipLink = page.locator('a:has-text("Skip to content"), a:has-text("Skip to main")');
    if (await skipLink.isVisible()) {
      await page.keyboard.press('Enter');
      
      // Verify focus moved to main content
      const activeElement = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.closest('main, [role="main"], #main-content') !== null;
      });
      expect(activeElement).toBe(true);
    }
  });

  test('Keyboard navigation in complex components', async () => {
    // Navigate to milestones after creating SMART goal
    await goalInputPage.submitGoal('Create an online course');
    await smartGoalPage.clickContinue();
    
    // Generate milestones
    await milestonesPage.clickGenerateMilestones();
    await milestonesPage.assertMilestonesGenerated();
    
    // Navigate through milestones with arrow keys
    const milestones = await page.locator('[data-testid="milestone-item"]').all();
    if (milestones.length > 0) {
      // Focus first milestone
      await milestones[0].focus();
      
      // Arrow down through milestones
      for (let i = 1; i < Math.min(milestones.length, 3); i++) {
        await page.keyboard.press('ArrowDown');
        const focusedIndex = await page.evaluate(() => {
          const focused = document.activeElement;
          const milestones = Array.from(document.querySelectorAll('[data-testid="milestone-item"]'));
          return milestones.indexOf(focused as Element);
        });
        expect(focusedIndex).toBe(i);
      }
    }
  });
});