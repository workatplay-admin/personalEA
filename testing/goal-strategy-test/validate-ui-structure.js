import { chromium } from 'playwright';

async function validateUIStructure() {
  console.log('🔍 Validating UI Structure and Test IDs...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the app
    console.log('1️⃣ Navigating to app...');
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    // Check step indicators
    console.log('2️⃣ Checking step indicators...');
    const step1 = page.locator('[data-testid="step-1"]');
    if (await step1.isVisible()) {
      console.log('✅ Step 1 indicator found');
    } else {
      console.log('❌ Step 1 indicator missing');
    }
    
    // Check API configuration form
    console.log('3️⃣ Checking API configuration...');
    const apiForm = page.locator('[data-testid="api-config-form"]');
    if (await apiForm.isVisible()) {
      console.log('✅ API config form found');
      
      // Enter API key and proceed
      const apiKeyInput = page.locator('input[placeholder*="API"], input[type="password"]');
      if (await apiKeyInput.isVisible()) {
        await apiKeyInput.fill(process.env.OPENAI_API_KEY || 'test-key');
        
        const continueButton = page.locator('button:has-text("Continue"), button:has-text("Configure")');
        if (await continueButton.isVisible()) {
          await continueButton.click();
          await page.waitForTimeout(1000);
          console.log('✅ API configuration completed');
        }
      }
    }
    
    // Check goal input elements
    console.log('4️⃣ Checking goal input elements...');
    
    // Goal input form
    const goalForm = page.locator('[data-testid="goal-input-form"]');
    if (await goalForm.isVisible()) {
      console.log('✅ Goal input form found');
    } else {
      console.log('❌ Goal input form missing');
    }
    
    // Goal textarea
    const goalTextarea = page.locator('[data-testid="goal-input-textarea"]');
    if (await goalTextarea.isVisible()) {
      console.log('✅ Goal textarea found');
    } else {
      console.log('❌ Goal textarea missing');
    }
    
    // Submit button
    const submitButton = page.locator('[data-testid="submit-goal-button"]');
    if (await submitButton.isVisible()) {
      console.log('✅ Submit button found');
    } else {
      console.log('❌ Submit button missing');
    }
    
    // Character count
    const charCount = page.locator('[data-testid="character-count"]');
    if (await charCount.isVisible()) {
      console.log('✅ Character count found');
    } else {
      console.log('❌ Character count missing');
    }
    
    // Example goals
    const exampleGoals = page.locator('[data-testid="example-goals"]');
    if (await exampleGoals.isVisible()) {
      console.log('✅ Example goals section found');
    } else {
      console.log('❌ Example goals section missing');
    }
    
    // Test goal input flow
    console.log('5️⃣ Testing goal input flow...');
    await goalTextarea.fill('I want to learn web development');
    
    // Check if clear button appears
    const clearButton = page.locator('[data-testid="clear-goal-button"]');
    if (await clearButton.isVisible()) {
      console.log('✅ Clear button appears after text input');
    } else {
      console.log('❌ Clear button missing after text input');
    }
    
    // Check character count updates
    const charCountText = await charCount.textContent();
    if (charCountText && charCountText.includes('29')) {
      console.log('✅ Character count updates correctly');
    } else {
      console.log('❌ Character count not updating');
    }
    
    // Test example goal click
    console.log('6️⃣ Testing example goal click...');
    const firstExample = page.locator('[data-testid="example-goal-0"]');
    if (await firstExample.isVisible()) {
      await firstExample.click();
      const updatedValue = await goalTextarea.inputValue();
      if (updatedValue.includes('promoted')) {
        console.log('✅ Example goal click updates textarea');
      } else {
        console.log('❌ Example goal click not working');
      }
    }
    
    console.log('\n✅ UI STRUCTURE VALIDATION COMPLETE');
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
  } finally {
    await browser.close();
  }
}

// Run the validation
validateUIStructure().catch(console.error);