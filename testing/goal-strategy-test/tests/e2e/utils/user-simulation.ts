import { Page, expect } from '@playwright/test';

/**
 * Utility class for simulating realistic user behavior
 */
export class UserSimulation {
  constructor(private page: Page) {}

  /**
   * Simulate typing like a real user with realistic delays
   */
  async humanTypeText(selector: string, text: string, options?: {
    delay?: number;
    clearFirst?: boolean;
  }) {
    const element = this.page.locator(selector);
    
    if (options?.clearFirst) {
      await element.clear();
    }
    
    // Simulate human typing speed (100-300ms between keystrokes)
    const delay = options?.delay || this.randomDelay(100, 300);
    
    for (const char of text) {
      await element.type(char, { delay });
      
      // Occasionally pause longer (thinking time)
      if (Math.random() < 0.1) {
        await this.page.waitForTimeout(this.randomDelay(500, 1500));
      }
    }
  }

  /**
   * Simulate mouse movement and clicking like a human
   */
  async humanClick(selector: string, options?: {
    position?: { x: number; y: number };
    delay?: number;
  }) {
    const element = this.page.locator(selector);
    
    // Move to element first
    await element.hover();
    
    // Brief pause before clicking
    await this.page.waitForTimeout(options?.delay || this.randomDelay(200, 800));
    
    // Click with optional position
    if (options?.position) {
      await element.click({ position: options.position });
    } else {
      await element.click();
    }
  }

  /**
   * Simulate reading behavior - pause and scroll
   */
  async humanReadContent(selector: string, options?: {
    readingSpeed?: number; // words per minute
    scrollPause?: number;
  }) {
    const element = this.page.locator(selector);
    const content = await element.textContent();
    
    if (content) {
      const wordCount = content.split(' ').length;
      const readingSpeed = options?.readingSpeed || 200; // average reading speed
      const readingTime = (wordCount / readingSpeed) * 60 * 1000; // convert to ms
      
      // Scroll through content
      await element.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(options?.scrollPause || 500);
      
      // Wait for reading time
      await this.page.waitForTimeout(Math.min(readingTime, 10000)); // cap at 10 seconds
    }
  }

  /**
   * Simulate form interaction patterns
   */
  async humanFormInteraction(formSelector: string, fields: Array<{
    selector: string;
    value: string;
    type?: 'input' | 'textarea' | 'select';
  }>) {
    for (const field of fields) {
      // Focus on field
      await this.page.locator(field.selector).focus();
      await this.page.waitForTimeout(this.randomDelay(300, 800));
      
      // Fill field
      switch (field.type) {
        case 'textarea':
          await this.humanTypeText(field.selector, field.value, { clearFirst: true });
          break;
        case 'select':
          await this.page.locator(field.selector).selectOption(field.value);
          break;
        default:
          await this.humanTypeText(field.selector, field.value, { clearFirst: true });
      }
      
      // Pause between fields
      await this.page.waitForTimeout(this.randomDelay(500, 1200));
    }
  }

  /**
   * Simulate browsing behavior - random scrolling and pauses
   */
  async humanBrowsing(duration: number = 5000) {
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime) {
      const action = Math.random();
      
      if (action < 0.3) {
        // Scroll down
        await this.page.mouse.wheel(0, this.randomDelay(100, 400));
      } else if (action < 0.6) {
        // Scroll up
        await this.page.mouse.wheel(0, -this.randomDelay(100, 400));
      } else {
        // Just pause and "read"
        await this.page.waitForTimeout(this.randomDelay(1000, 3000));
      }
      
      await this.page.waitForTimeout(this.randomDelay(200, 1000));
    }
  }

  /**
   * Simulate user confusion/hesitation
   */
  async simulateHesitation() {
    // Random pause as if user is thinking
    await this.page.waitForTimeout(this.randomDelay(2000, 5000));
    
    // Maybe move mouse around a bit
    for (let i = 0; i < 3; i++) {
      await this.page.mouse.move(
        Math.random() * 800,
        Math.random() * 600
      );
      await this.page.waitForTimeout(this.randomDelay(300, 800));
    }
  }

  /**
   * Simulate error recovery behavior
   */
  async simulateErrorRecovery(errorSelector: string) {
    // User notices error
    await this.page.locator(errorSelector).waitFor({ state: 'visible' });
    await this.humanReadContent(errorSelector);
    
    // Pause as user thinks about what to do
    await this.simulateHesitation();
    
    // Look for retry or back buttons
    const retryButton = this.page.locator('button:has-text("Retry")');
    const backButton = this.page.locator('button:has-text("Back")');
    
    if (await retryButton.isVisible()) {
      await this.humanClick('button:has-text("Retry")');
    } else if (await backButton.isVisible()) {
      await this.humanClick('button:has-text("Back")');
    }
  }

  /**
   * Generate random delay within range
   */
  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Simulate realistic user journey with interruptions
   */
  async simulateRealUserJourney(steps: Array<{
    action: () => Promise<void>;
    description: string;
    pauseAfter?: number;
  }>) {
    for (const [index, step] of steps.entries()) {
      console.log(`Step ${index + 1}: ${step.description}`);
      
      // Occasional hesitation before action
      if (Math.random() < 0.2) {
        await this.simulateHesitation();
      }
      
      // Execute the step
      await step.action();
      
      // Pause after action
      const pauseTime = step.pauseAfter || this.randomDelay(500, 2000);
      await this.page.waitForTimeout(pauseTime);
      
      // Occasional distraction (user looks away, etc.)
      if (Math.random() < 0.1) {
        await this.page.waitForTimeout(this.randomDelay(3000, 8000));
      }
    }
  }

  /**
   * Validate user experience metrics
   */
  async validateUserExperience(): Promise<{
    loadTime: number;
    interactionTime: number;
    errorCount: number;
    accessibilityScore: number;
  }> {
    // Measure page load performance
    const navigationTiming = await this.page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: timing.loadEventEnd - timing.loadEventStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        firstPaint: timing.responseEnd - timing.requestStart
      };
    });

    // Count errors in console
    let errorCount = 0;
    this.page.on('pageerror', () => errorCount++);
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') errorCount++;
    });

    // Basic accessibility checks
    const accessibilityScore = await this.checkBasicAccessibility();

    return {
      loadTime: navigationTiming.loadTime,
      interactionTime: navigationTiming.domContentLoaded,
      errorCount,
      accessibilityScore
    };
  }

  /**
   * Basic accessibility validation
   */
  private async checkBasicAccessibility(): Promise<number> {
    let score = 100;
    
    // Check for alt text on images
    const images = await this.page.locator('img').count();
    const imagesWithAlt = await this.page.locator('img[alt]').count();
    if (images > 0 && imagesWithAlt < images) {
      score -= 10;
    }
    
    // Check for form labels
    const inputs = await this.page.locator('input, textarea, select').count();
    const labeledInputs = await this.page.locator('input[aria-label], textarea[aria-label], select[aria-label], input[aria-labelledby], textarea[aria-labelledby], select[aria-labelledby]').count();
    if (inputs > 0 && labeledInputs < inputs) {
      score -= 10;
    }
    
    // Check for heading hierarchy
    const h1Count = await this.page.locator('h1').count();
    if (h1Count !== 1) {
      score -= 5;
    }
    
    // Check for focus indicators
    const focusableElements = await this.page.locator('button, input, select, textarea, a[href]').count();
    // This is a simplified check - in real scenarios you'd test actual focus visibility
    
    return Math.max(score, 0);
  }

  /**
   * Simulate mobile user behavior
   */
  async simulateMobileUser() {
    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    
    // Simulate touch interactions
    await this.page.addInitScript(() => {
      // Override mouse events to simulate touch
      Object.defineProperty(window, 'ontouchstart', { value: true });
    });
  }

  /**
   * Simulate slow network conditions
   */
  async simulateSlowNetwork() {
    // Simulate 3G network
    await this.page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      await route.continue();
    });
  }
}