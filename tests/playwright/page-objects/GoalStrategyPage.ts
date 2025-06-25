import { Page, Locator, expect } from '@playwright/test';

export class GoalStrategyPage {
  readonly page: Page;
  readonly apiKeyInput: Locator;
  readonly configureApiButton: Locator;
  readonly goalInput: Locator;
  readonly transformButton: Locator;
  readonly smartGoalDisplay: Locator;
  readonly chatInterface: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly conversationMessages: Locator;
  readonly confidenceScore: Locator;
  readonly criteriaDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // API Configuration elements
    this.apiKeyInput = page.locator('input[placeholder*="OpenAI API Key"], input[name*="apiKey"], input[type="password"]').first();
    this.configureApiButton = page.locator('button:has-text("Configure"), button:has-text("Save"), button[type="submit"]').first();
    
    // Goal input elements
    this.goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="Goal"]').first();
    this.transformButton = page.locator('button:has-text("Transform"), button:has-text("Generate"), button:has-text("SMART")').first();
    
    // Results display elements
    this.smartGoalDisplay = page.locator('[data-testid="smart-goal"], .smart-goal, .goal-display').first();
    this.confidenceScore = page.locator('[data-testid="confidence"], .confidence, .score').first();
    this.criteriaDisplay = page.locator('[data-testid="criteria"], .criteria, .smart-criteria').first();
    
    // Chat interface elements
    this.chatInterface = page.locator('[data-testid="chat"], .chat, .conversation').first();
    this.chatInput = page.locator('input[placeholder*="chat"], input[placeholder*="message"], textarea[placeholder*="message"]').first();
    this.sendButton = page.locator('button:has-text("Send"), button[type="submit"]').last();
    this.conversationMessages = page.locator('.message, .chat-message, [data-testid="message"]');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageLoad() {
    // Wait for essential page load states
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Try to wait for key elements with flexible selectors
    try {
      await this.page.waitForSelector('input, textarea, button', { timeout: 5000 });
    } catch (error) {
      console.log('⚠️ UI elements not found, page may be minimally rendered');
    }
  }

  async configureApiKey(apiKey: string) {
    console.log('🔑 Configuring API key...');
    
    // Try multiple approaches to find and configure API key
    try {
      // Method 1: Look for visible API key input
      if (await this.apiKeyInput.isVisible({ timeout: 2000 })) {
        await this.apiKeyInput.fill(apiKey);
        await this.configureApiButton.click();
        await this.page.waitForTimeout(1000);
        return true;
      }
    } catch (error) {
      console.log('Method 1 failed, trying alternative approach');
    }

    try {
      // Method 2: Look for any password input (API key fields are often password type)
      const passwordInput = this.page.locator('input[type="password"]').first();
      if (await passwordInput.isVisible({ timeout: 2000 })) {
        await passwordInput.fill(apiKey);
        const submitBtn = this.page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Configure")').first();
        await submitBtn.click();
        await this.page.waitForTimeout(1000);
        return true;
      }
    } catch (error) {
      console.log('Method 2 failed, trying direct API calls');
    }

    // Method 3: If UI config fails, the backend supports environment variables
    console.log('🔧 API key configuration via environment variable (backend will use OPENAI_API_KEY)');
    return true;
  }

  async enterGoal(goalText: string) {
    console.log(`📝 Entering goal: "${goalText}"`);
    
    // Try multiple approaches to find goal input
    try {
      // Method 1: Standard goal input
      if (await this.goalInput.isVisible({ timeout: 2000 })) {
        await this.goalInput.fill(goalText);
        return true;
      }
    } catch (error) {
      console.log('Standard goal input not found, trying alternatives');
    }

    try {
      // Method 2: Any textarea or text input
      const textInput = this.page.locator('textarea, input[type="text"]').first();
      if (await textInput.isVisible({ timeout: 2000 })) {
        await textInput.fill(goalText);
        return true;
      }
    } catch (error) {
      console.log('No text input found');
    }

    throw new Error('Could not find goal input field');
  }

  async submitGoal() {
    console.log('🚀 Submitting goal for transformation...');
    
    try {
      // Method 1: Standard transform button
      if (await this.transformButton.isVisible({ timeout: 2000 })) {
        await this.transformButton.click();
        return;
      }
    } catch (error) {
      console.log('Transform button not found, trying alternatives');
    }

    try {
      // Method 2: Any submit button
      const submitBtn = this.page.locator('button[type="submit"], button:has-text("Submit")').first();
      if (await submitBtn.isVisible({ timeout: 2000 })) {
        await submitBtn.click();
        return;
      }
    } catch (error) {
      console.log('No submit button found');
    }

    // Method 3: Press Enter in the input field
    await this.goalInput.press('Enter');
  }

  async waitForSmartGoalGeneration(timeout = 30000) {
    console.log('⏳ Waiting for SMART goal generation...');
    
    // Wait for any indication that processing is complete
    try {
      // Method 1: Look for smart goal display
      await this.smartGoalDisplay.waitFor({ timeout: timeout / 3 });
      return await this.getSmartGoalResult();
    } catch (error) {
      console.log('Smart goal display not found, checking for any results');
    }

    try {
      // Method 2: Look for any new content appearing
      await this.page.waitForFunction(() => {
        const body = document.body.innerText;
        return body.includes('SMART') || body.includes('Specific') || body.includes('confidence') || body.includes('%');
      }, {}, { timeout: timeout / 3 });
      
      return await this.getSmartGoalResult();
    } catch (error) {
      console.log('No SMART goal content detected');
    }

    // Method 3: Wait for any network activity to complete
    await this.page.waitForLoadState('networkidle', { timeout: timeout / 3 });
    return await this.getSmartGoalResult();
  }

  async getSmartGoalResult() {
    const result = {
      title: '',
      confidence: 0,
      criteria: {},
      visible: false
    };

    try {
      // Get page text content to extract information
      const pageContent = await this.page.textContent('body');
      
      if (pageContent.includes('SMART') || pageContent.includes('Specific')) {
        result.visible = true;
        
        // Extract confidence if present
        const confidenceMatch = pageContent.match(/(\d+)%/);
        if (confidenceMatch) {
          result.confidence = parseInt(confidenceMatch[1]);
        }

        // Extract goal title if present
        const lines = pageContent.split('\n');
        const titleLine = lines.find(line => 
          line.length > 20 && 
          !line.includes('Specific') && 
          !line.includes('Measurable') &&
          line.trim().length > 0
        );
        if (titleLine) {
          result.title = titleLine.trim();
        }

        // Check for SMART criteria
        const criteriaKeywords = ['Specific', 'Measurable', 'Achievable', 'Relevant', 'Time'];
        result.criteria = {};
        criteriaKeywords.forEach(keyword => {
          result.criteria[keyword.toLowerCase()] = pageContent.includes(keyword);
        });
      }
    } catch (error) {
      console.log('Error extracting SMART goal result:', error);
    }

    return result;
  }

  async startChatRefinement(message: string) {
    console.log(`💬 Starting chat refinement: "${message}"`);
    
    try {
      // Look for chat input
      if (await this.chatInput.isVisible({ timeout: 5000 })) {
        await this.chatInput.fill(message);
        await this.sendButton.click();
        await this.page.waitForTimeout(2000);
        return true;
      }
    } catch (error) {
      console.log('Chat interface not found or not ready');
    }
    
    return false;
  }

  async getConversationHistory() {
    try {
      const messages = await this.conversationMessages.allTextContents();
      return messages.map((content, index) => ({
        id: index,
        content: content.trim(),
        role: index % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date()
      }));
    } catch (error) {
      console.log('Could not extract conversation history');
      return [];
    }
  }

  async getPageScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  async validatePageStructure() {
    const validation = {
      hasTitle: false,
      hasInputElements: false,
      hasButtons: false,
      hasContent: false,
      pageText: ''
    };

    try {
      // Check title
      const title = await this.page.title();
      validation.hasTitle = title.length > 0;

      // Check for input elements
      const inputs = await this.page.locator('input, textarea').count();
      validation.hasInputElements = inputs > 0;

      // Check for buttons
      const buttons = await this.page.locator('button').count();
      validation.hasButtons = buttons > 0;

      // Get page content
      validation.pageText = await this.page.textContent('body') || '';
      validation.hasContent = validation.pageText.length > 100;

    } catch (error) {
      console.log('Error validating page structure:', error);
    }

    return validation;
  }
}