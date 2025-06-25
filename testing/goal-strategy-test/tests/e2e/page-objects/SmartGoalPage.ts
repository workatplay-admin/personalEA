import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SmartGoalPage extends BasePage {
  readonly smartGoalDisplay: Locator;
  readonly smartGoalTitle: Locator;
  readonly specificCriterion: Locator;
  readonly measurableCriterion: Locator;
  readonly achievableCriterion: Locator;
  readonly relevantCriterion: Locator;
  readonly timeBoundCriterion: Locator;
  readonly confidenceScore: Locator;
  readonly clarificationQuestions: Locator;
  readonly continueButton: Locator;
  readonly refineButton: Locator;
  readonly chatInterface: Locator;
  readonly chatInput: Locator;
  readonly chatSendButton: Locator;
  readonly chatMessages: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.smartGoalDisplay = page.locator('[data-testid="smart-goal-display"]');
    this.smartGoalTitle = page.locator('[data-testid="smart-goal-title"]');
    this.specificCriterion = page.locator('[data-testid="specific-criterion"]');
    this.measurableCriterion = page.locator('[data-testid="measurable-criterion"]');
    this.achievableCriterion = page.locator('[data-testid="achievable-criterion"]');
    this.relevantCriterion = page.locator('[data-testid="relevant-criterion"]');
    this.timeBoundCriterion = page.locator('[data-testid="timebound-criterion"]');
    this.confidenceScore = page.locator('[data-testid="confidence-score"]');
    this.clarificationQuestions = page.locator('[data-testid="clarification-questions"]');
    this.continueButton = page.locator('[data-testid="continue-button"]');
    this.refineButton = page.locator('[data-testid="refine-button"]');
    
    // Chat interface elements
    this.chatInterface = page.locator('[data-testid="chat-interface"]');
    this.chatInput = page.locator('[data-testid="chat-input"]');
    this.chatSendButton = page.locator('[data-testid="chat-send-button"]');
    this.chatMessages = page.locator('[data-testid="chat-messages"]');
    this.loadingIndicator = page.locator('[data-testid="chat-loading"]');
  }

  async assertSmartGoalDisplayed() {
    await expect(this.smartGoalDisplay).toBeVisible();
  }

  async assertSmartGoalTitle(expectedTitle: string) {
    await expect(this.smartGoalTitle).toContainText(expectedTitle);
  }

  async assertAllCriteriaPresent() {
    await expect(this.specificCriterion).toBeVisible();
    await expect(this.measurableCriterion).toBeVisible();
    await expect(this.achievableCriterion).toBeVisible();
    await expect(this.relevantCriterion).toBeVisible();
    await expect(this.timeBoundCriterion).toBeVisible();
  }

  async assertCriterionValue(criterion: 'specific' | 'measurable' | 'achievable' | 'relevant' | 'timebound', expectedValue: string) {
    const locatorMap = {
      specific: this.specificCriterion,
      measurable: this.measurableCriterion,
      achievable: this.achievableCriterion,
      relevant: this.relevantCriterion,
      timebound: this.timeBoundCriterion
    };
    
    await expect(locatorMap[criterion]).toContainText(expectedValue);
  }

  async assertConfidenceScore(minScore: number = 0.5) {
    const scoreText = await this.confidenceScore.textContent();
    const score = parseFloat(scoreText?.replace(/[^\d.]/g, '') || '0');
    expect(score).toBeGreaterThanOrEqual(minScore);
  }

  async assertClarificationQuestionsPresent() {
    await expect(this.clarificationQuestions).toBeVisible();
    const questionCount = await this.clarificationQuestions.locator('li').count();
    expect(questionCount).toBeGreaterThan(0);
  }

  async clickContinue() {
    await this.continueButton.click();
    await this.waitForStepToBeActive(3);
  }

  async clickRefine() {
    await this.refineButton.click();
    await expect(this.chatInterface).toBeVisible();
  }

  async sendChatMessage(message: string) {
    await this.chatInput.fill(message);
    await this.chatSendButton.click();
    
    // Wait for loading indicator
    await expect(this.loadingIndicator).toBeVisible();
    await expect(this.loadingIndicator).toBeHidden();
  }

  async assertChatMessageSent(message: string) {
    const userMessage = this.chatMessages.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toContainText(message);
  }

  async assertChatResponseReceived() {
    const aiMessage = this.chatMessages.locator('[data-testid="ai-message"]').last();
    await expect(aiMessage).toBeVisible();
  }

  async getChatMessagesCount() {
    return await this.chatMessages.locator('[data-testid="user-message"], [data-testid="ai-message"]').count();
  }

  async assertRefinedGoalUpdated() {
    // Wait for the goal to be updated after refinement
    await this.page.waitForTimeout(1000);
    await expect(this.smartGoalDisplay).toBeVisible();
  }

  async completeSmartGoalPhase() {
    await this.assertSmartGoalDisplayed();
    await this.assertAllCriteriaPresent();
    await this.clickContinue();
  }

  async refineGoalWithChat(refinementMessage: string) {
    await this.clickRefine();
    await this.sendChatMessage(refinementMessage);
    await this.assertChatResponseReceived();
    await this.assertRefinedGoalUpdated();
  }
}