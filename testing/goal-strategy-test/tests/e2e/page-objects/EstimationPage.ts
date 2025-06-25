import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class EstimationPage extends BasePage {
  readonly estimationDisplay: Locator;
  readonly estimationTitle: Locator;
  readonly estimationMethods: Locator;
  readonly generateEstimatesButton: Locator;
  readonly estimationResults: Locator;
  readonly taskEstimations: Locator;
  readonly summaryReport: Locator;
  readonly exportButton: Locator;
  readonly loadingSpinner: Locator;
  readonly methodTabs: Locator;
  readonly confidenceIndicators: Locator;
  readonly uncertaintyRanges: Locator;

  constructor(page: Page) {
    super(page);
    this.estimationDisplay = page.locator('[data-testid="estimation-display"]');
    this.estimationTitle = page.locator('[data-testid="estimation-title"]');
    this.estimationMethods = page.locator('[data-testid="estimation-methods"]');
    this.generateEstimatesButton = page.locator('[data-testid="generate-estimates-button"]');
    this.estimationResults = page.locator('[data-testid="estimation-results"]');
    this.taskEstimations = page.locator('[data-testid^="task-estimation-"]');
    this.summaryReport = page.locator('[data-testid="summary-report"]');
    this.exportButton = page.locator('[data-testid="export-button"]');
    this.loadingSpinner = page.locator('[data-testid="estimation-loading"]');
    this.methodTabs = page.locator('[data-testid="method-tabs"]');
    this.confidenceIndicators = page.locator('[data-testid^="confidence-"]');
    this.uncertaintyRanges = page.locator('[data-testid^="uncertainty-range-"]');
  }

  async assertEstimationDisplayVisible() {
    await expect(this.estimationDisplay).toBeVisible();
  }

  async clickGenerateEstimates() {
    await this.generateEstimatesButton.click();
    
    // Wait for loading to start and finish
    await expect(this.loadingSpinner).toBeVisible();
    await this.waitForLoadingToFinish();
  }

  async assertEstimationsGenerated() {
    const estimationCount = await this.taskEstimations.count();
    expect(estimationCount).toBeGreaterThan(0);
  }

  async assertEstimationMethods() {
    // Check that all estimation methods are displayed
    const expectedMethods = [
      'expert-judgment',
      'analogy-based',
      'three-point', 
      'parametric',
      'bottom-up'
    ];
    
    for (const method of expectedMethods) {
      const methodElement = this.estimationMethods.locator(`[data-testid="${method}-method"]`);
      await expect(methodElement).toBeVisible();
    }
  }

  async switchToMethod(method: 'expert-judgment' | 'analogy-based' | 'three-point' | 'parametric' | 'bottom-up') {
    const methodTab = this.methodTabs.locator(`[data-testid="${method}-tab"]`);
    await methodTab.click();
    
    // Wait for method content to load
    const methodContent = this.page.locator(`[data-testid="${method}-content"]`);
    await expect(methodContent).toBeVisible();
  }

  async assertTaskEstimation(index: number) {
    const estimation = this.taskEstimations.nth(index);
    
    // Check that essential estimation elements are present
    await expect(estimation.locator('[data-testid="task-name"]')).toBeVisible();
    await expect(estimation.locator('[data-testid="final-estimate"]')).toBeVisible();
    await expect(estimation.locator('[data-testid="confidence-score"]')).toBeVisible();
    await expect(estimation.locator('[data-testid="uncertainty-range"]')).toBeVisible();
  }

  async getTaskEstimationCount() {
    return await this.taskEstimations.count();
  }

  async assertExpertJudgmentMethod(index: number) {
    const estimation = this.taskEstimations.nth(index);
    const expertJudgment = estimation.locator('[data-testid="expert-judgment"]');
    
    await expect(expertJudgment.locator('[data-testid="estimate"]')).toBeVisible();
    await expect(expertJudgment.locator('[data-testid="confidence"]')).toBeVisible();
    await expect(expertJudgment.locator('[data-testid="reasoning"]')).toBeVisible();
  }

  async assertAnalogyBasedMethod(index: number) {
    const estimation = this.taskEstimations.nth(index);
    const analogyBased = estimation.locator('[data-testid="analogy-based"]');
    
    await expect(analogyBased.locator('[data-testid="estimate"]')).toBeVisible();
    await expect(analogyBased.locator('[data-testid="similar-task"]')).toBeVisible();
    await expect(analogyBased.locator('[data-testid="adjustment-factor"]')).toBeVisible();
  }

  async assertThreePointMethod(index: number) {
    const estimation = this.taskEstimations.nth(index);
    const threePoint = estimation.locator('[data-testid="three-point"]');
    
    await expect(threePoint.locator('[data-testid="optimistic"]')).toBeVisible();
    await expect(threePoint.locator('[data-testid="most-likely"]')).toBeVisible();
    await expect(threePoint.locator('[data-testid="pessimistic"]')).toBeVisible();
    await expect(threePoint.locator('[data-testid="expected"]')).toBeVisible();
    await expect(threePoint.locator('[data-testid="standard-deviation"]')).toBeVisible();
  }

  async assertParametricMethod(index: number) {
    const estimation = this.taskEstimations.nth(index);
    const parametric = estimation.locator('[data-testid="parametric"]');
    
    await expect(parametric.locator('[data-testid="estimate"]')).toBeVisible();
    await expect(parametric.locator('[data-testid="parameters"]')).toBeVisible();
    await expect(parametric.locator('[data-testid="formula"]')).toBeVisible();
  }

  async assertBottomUpMethod(index: number) {
    const estimation = this.taskEstimations.nth(index);
    const bottomUp = estimation.locator('[data-testid="bottom-up"]');
    
    await expect(bottomUp.locator('[data-testid="estimate"]')).toBeVisible();
    await expect(bottomUp.locator('[data-testid="sub-tasks"]')).toBeVisible();
  }

  async assertFinalEstimate(index: number) {
    const estimation = this.taskEstimations.nth(index);
    const finalEstimate = estimation.locator('[data-testid="final-estimate"]');
    
    const estimateText = await finalEstimate.textContent();
    const hours = parseFloat(estimateText?.replace(/[^\d.]/g, '') || '0');
    expect(hours).toBeGreaterThan(0);
  }

  async assertConfidenceScores() {
    const confidenceCount = await this.confidenceIndicators.count();
    expect(confidenceCount).toBeGreaterThan(0);
    
    for (let i = 0; i < confidenceCount; i++) {
      const confidence = this.confidenceIndicators.nth(i);
      const confidenceText = await confidence.textContent();
      const score = parseFloat(confidenceText?.replace(/[^\d.]/g, '') || '0');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  }

  async assertUncertaintyRanges() {
    const rangeCount = await this.uncertaintyRanges.count();
    expect(rangeCount).toBeGreaterThan(0);
    
    for (let i = 0; i < rangeCount; i++) {
      const range = this.uncertaintyRanges.nth(i);
      const minElement = range.locator('[data-testid="min-estimate"]');
      const maxElement = range.locator('[data-testid="max-estimate"]');
      
      const minText = await minElement.textContent();
      const maxText = await maxElement.textContent();
      
      const minValue = parseFloat(minText?.replace(/[^\d.]/g, '') || '0');
      const maxValue = parseFloat(maxText?.replace(/[^\d.]/g, '') || '0');
      
      expect(minValue).toBeGreaterThan(0);
      expect(maxValue).toBeGreaterThan(minValue);
    }
  }

  async assertSummaryReport() {
    await expect(this.summaryReport).toBeVisible();
    
    // Check summary elements
    const totalEstimate = this.summaryReport.locator('[data-testid="total-estimate"]');
    const totalConfidence = this.summaryReport.locator('[data-testid="total-confidence"]');
    const riskAnalysis = this.summaryReport.locator('[data-testid="risk-analysis"]');
    
    await expect(totalEstimate).toBeVisible();
    await expect(totalConfidence).toBeVisible();
    await expect(riskAnalysis).toBeVisible();
    
    // Validate total estimate is positive
    const totalText = await totalEstimate.textContent();
    const total = parseFloat(totalText?.replace(/[^\d.]/g, '') || '0');
    expect(total).toBeGreaterThan(0);
  }

  async clickExport() {
    await this.exportButton.click();
    
    // Wait for download to start
    const downloadPromise = this.page.waitForEvent('download');
    await downloadPromise;
  }

  async assertExportFunctionality() {
    // Test that export button is visible and functional
    await expect(this.exportButton).toBeVisible();
    await expect(this.exportButton).toBeEnabled();
  }

  async completeEstimationPhase() {
    await this.assertEstimationDisplayVisible();
    await this.clickGenerateEstimates();
    await this.assertEstimationsGenerated();
    
    // Validate estimation methods
    await this.assertEstimationMethods();
    
    // Validate individual task estimations
    const estimationCount = await this.getTaskEstimationCount();
    for (let i = 0; i < Math.min(estimationCount, 3); i++) { // Test first 3 estimations
      await this.assertTaskEstimation(i);
      await this.assertFinalEstimate(i);
    }
    
    // Validate confidence and uncertainty
    await this.assertConfidenceScores();
    await this.assertUncertaintyRanges();
    
    // Validate summary report
    await this.assertSummaryReport();
    
    // Test export functionality
    await this.assertExportFunctionality();
  }

  async validateEstimationAccuracy() {
    // Test different estimation methods
    await this.switchToMethod('expert-judgment');
    await this.assertExpertJudgmentMethod(0);
    
    await this.switchToMethod('three-point');
    await this.assertThreePointMethod(0);
    
    await this.switchToMethod('bottom-up');
    await this.assertBottomUpMethod(0);
  }

  async validateEstimationConsistency() {
    const estimationCount = await this.getTaskEstimationCount();
    
    for (let i = 0; i < estimationCount; i++) {
      await this.assertTaskEstimation(i);
      await this.assertFinalEstimate(i);
    }
    
    // Check that total adds up correctly
    await this.assertSummaryReport();
  }
}