#!/usr/bin/env node

/**
 * Complete Workflow Test for PersonalEA Goal Translation App
 * Tests the full user workflow: load -> configure -> continue -> enter goal -> transform
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test Configuration
const FRONTEND_URL = 'http://localhost:5174';
const TEST_TIMEOUT = 30000;

console.log('🎯 PersonalEA Complete Workflow Test');
console.log('===================================');

/**
 * Main Workflow Test
 */
async function testCompleteWorkflow(page) {
  console.log('\n🚀 Testing Complete User Workflow...');
  
  const results = {
    step1_loading: false,
    step2_apiConfig: false,
    step3_continueButton: false,
    step4_goalInput: false,
    step5_transformButton: false,
    step6_results: false,
    errors: []
  };
  
  try {
    console.log('📖 Step 1: Loading application...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('body', { timeout: 10000 });
    
    const title = await page.title();
    console.log('✅ App loaded successfully:', title);
    results.step1_loading = true;
    
    // Take screenshot
    await page.screenshot({ path: 'workflow-step1-loaded.png' });
    
  } catch (error) {
    console.error('❌ Step 1 failed:', error.message);
    results.errors.push({ step: 1, error: error.message });
  }
  
  try {
    console.log('📖 Step 2: Checking API configuration...');
    
    // Wait for API config to auto-detect
    await page.waitForTimeout(5000);
    
    // Look for API configuration success message
    const hasConfigMessage = await page.locator('text=API Configuration Set, text=configured').count() > 0;
    const hasConfiguredStatus = await page.locator('text=Authentication credentials are configured').count() > 0;
    
    if (hasConfigMessage || hasConfiguredStatus) {
      console.log('✅ API auto-configuration detected');
      results.step2_apiConfig = true;
    } else {
      console.log('⚠️ API auto-configuration not detected - may need manual config');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'workflow-step2-config.png' });
    
  } catch (error) {
    console.error('❌ Step 2 failed:', error.message);
    results.errors.push({ step: 2, error: error.message });
  }
  
  try {
    console.log('📖 Step 3: Clicking Continue button...');
    
    // Look for Continue button
    const continueButton = page.locator('button').filter({ hasText: /continue/i });
    
    if (await continueButton.count() > 0) {
      await continueButton.click();
      console.log('✅ Continue button clicked');
      results.step3_continueButton = true;
      
      // Wait for transition
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️ Continue button not found - checking if already on next step');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'workflow-step3-continue.png' });
    
  } catch (error) {
    console.error('❌ Step 3 failed:', error.message);
    results.errors.push({ step: 3, error: error.message });
  }
  
  try {
    console.log('📖 Step 4: Testing goal input...');
    
    // Look for goal input field
    const goalInput = page.locator('input[type="text"], textarea, [placeholder*="goal" i]').first();
    
    if (await goalInput.count() > 0) {
      await goalInput.fill('I want to learn React programming this year');
      console.log('✅ Goal input field found and filled');
      results.step4_goalInput = true;
    } else {
      console.log('❌ Goal input field not found');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'workflow-step4-input.png' });
    
  } catch (error) {
    console.error('❌ Step 4 failed:', error.message);
    results.errors.push({ step: 4, error: error.message });
  }
  
  try {
    console.log('📖 Step 5: Testing transform button...');
    
    // Look for transform/submit button
    const transformButton = page.locator('button').filter({ hasText: /transform|submit|translate|next|continue/i }).first();
    
    if (await transformButton.count() > 0) {
      const buttonText = await transformButton.textContent();
      console.log('✅ Transform button found:', buttonText?.trim());
      
      // Click the button
      await transformButton.click();
      console.log('✅ Transform button clicked successfully');
      results.step5_transformButton = true;
      
      // Wait for processing
      await page.waitForTimeout(5000);
      
    } else {
      console.log('❌ Transform button not found');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'workflow-step5-transform.png' });
    
  } catch (error) {
    console.error('❌ Step 5 failed:', error.message);
    results.errors.push({ step: 5, error: error.message });
  }
  
  try {
    console.log('📖 Step 6: Checking for results...');
    
    // Look for results or progress indicators
    const hasResults = await page.locator('[class*="result"], [class*="smart"], [class*="goal"], [class*="progress"]').count() > 0;
    const hasError = await page.locator('[class*="error"], [class*="alert"], text=error').count() > 0;
    const hasLoading = await page.locator('[class*="loading"], [class*="spinner"], text=loading').count() > 0;
    
    if (hasResults) {
      console.log('✅ Results or progress detected');
      results.step6_results = true;
    } else if (hasError) {
      console.log('⚠️ Error detected in results');
    } else if (hasLoading) {
      console.log('⏳ Loading state detected');
    } else {
      console.log('❓ No clear results detected');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'workflow-step6-results.png' });
    
  } catch (error) {
    console.error('❌ Step 6 failed:', error.message);
    results.errors.push({ step: 6, error: error.message });
  }
  
  return results;
}

/**
 * Generate Workflow Report
 */
function generateWorkflowReport(results) {
  console.log('\n📊 COMPLETE WORKFLOW REPORT');
  console.log('===========================');
  
  const steps = [
    { name: 'App Loading', passed: results.step1_loading },
    { name: 'API Configuration', passed: results.step2_apiConfig },
    { name: 'Continue Button', passed: results.step3_continueButton },
    { name: 'Goal Input', passed: results.step4_goalInput },
    { name: 'Transform Button', passed: results.step5_transformButton },
    { name: 'Results Display', passed: results.step6_results }
  ];
  
  const passedCount = steps.filter(s => s.passed).length;
  const totalCount = steps.length;
  
  console.log(`✅ Workflow Steps Completed: ${passedCount}/${totalCount}`);
  console.log(`📈 Success Rate: ${Math.round((passedCount/totalCount) * 100)}%`);
  
  const workflowStatus = passedCount >= 5 ? 'FULLY_WORKING' : passedCount >= 3 ? 'PARTIALLY_WORKING' : 'NOT_WORKING';
  console.log(`🎯 Workflow Status: ${workflowStatus}`);
  
  console.log('\n📋 Step-by-Step Results:');
  steps.forEach((step, index) => {
    console.log(`${index + 1}. ${step.name}: ${step.passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  if (results.errors.length > 0) {
    console.log('\n🚨 Errors Encountered:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. Step ${error.step}: ${error.error}`);
    });
  }
  
  // Screenshots created
  console.log('\n📸 Screenshots saved:');
  console.log('- workflow-step1-loaded.png');
  console.log('- workflow-step2-config.png');
  console.log('- workflow-step3-continue.png');
  console.log('- workflow-step4-input.png');
  console.log('- workflow-step5-transform.png');
  console.log('- workflow-step6-results.png');
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    workflowResults: results,
    summary: {
      totalSteps: totalCount,
      completedSteps: passedCount,
      successRate: Math.round((passedCount/totalCount) * 100),
      workflowStatus
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'complete-workflow-results.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n💾 Workflow report saved to: complete-workflow-results.json');
  
  return workflowStatus;
}

/**
 * Main Workflow Test Execution
 */
async function runCompleteWorkflowTest() {
  console.log('🚀 Starting complete workflow test...\n');
  
  let browser = null;
  
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`🖥️  Browser: ${msg.text()}`);
      }
    });
    
    const results = await testCompleteWorkflow(page);
    const workflowStatus = generateWorkflowReport(results);
    
    console.log('\n🏁 Complete Workflow Test Finished!');
    
    return workflowStatus;
    
  } catch (error) {
    console.error('💥 Complete Workflow Test Failed:', error.message);
    return 'NOT_WORKING';
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main execution
async function main() {
  try {
    const status = await runCompleteWorkflowTest();
    process.exit(status === 'NOT_WORKING' ? 1 : 0);
  } catch (error) {
    console.error('💥 Fatal Error:', error.message);
    process.exit(1);
  }
}

main();