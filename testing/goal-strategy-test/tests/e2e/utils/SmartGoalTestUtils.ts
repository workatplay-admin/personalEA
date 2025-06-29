import { Page, expect } from '@playwright/test';

export class SmartGoalTestUtils {
  constructor(private page: Page) {}

  async navigateToApp() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async enterGoal(goalText: string) {
    await this.page.fill('textarea[placeholder*="Enter your goal"], input[placeholder*="Enter your goal"]', goalText);
  }

  async submitGoal() {
    await this.page.click('button:has-text("Transform to SMART Goal"), button:has-text("Submit")');
  }

  async getComponentScore(component: string): Promise<number> {
    // Look for score indicators by component name
    const scoreElement = await this.page.locator(`[data-component="${component}"] .score, .${component}-score, text=/${component}/i >> .. >> text=/%/`).first();
    const scoreText = await scoreElement.textContent();
    
    if (!scoreText) return 0;
    
    // Extract percentage from text like "85%" or "Score: 85%"
    const match = scoreText.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  async getAllComponentScores(): Promise<Record<string, number>> {
    const components = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'];
    const scores: Record<string, number> = {};
    
    for (const component of components) {
      scores[component] = await this.getComponentScore(component);
    }
    
    return scores;
  }
}