#!/usr/bin/env node

/**
 * Frontend Integration Test for PersonalEA Goal Translation App
 * Uses Playwright to test the actual user interface and workflow
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test Configuration
const FRONTEND_URL = 'http://localhost:5174';
const TEST_TIMEOUT = 30000;

console.log('🌐 PersonalEA Frontend Integration Test');
console.log('======================================');

/**
 * Test 1: App Loading and UI Elements
 */
async function testAppLoading(page) {
  console.log('\n1️⃣ Testing App Loading...');
  
  try {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check if React app has loaded
    const title = await page.title();
    console.log('✅ Page Title:', title);
    
    // Check for key UI elements
    const hasApiConfig = await page.locator('[data-testid="api-config"], .api-config, [class*="api"], [class*="config"]').count() > 0;
    const hasGoalInput = await page.locator('input[type="text"], textarea, [placeholder*="goal" i]').count() > 0;
    const hasButton = await page.locator('button').count() > 0;
    
    console.log('✅ API Config Section:', hasApiConfig ? 'Found' : 'Not Found');
    console.log('✅ Goal Input Field:', hasGoalInput ? 'Found' : 'Not Found');  
    console.log('✅ Buttons Present:', hasButton ? 'Found' : 'Not Found');
    
    return { 
      loaded: true, 
      title, 
      hasApiConfig, 
      hasGoalInput, 
      hasButton 
    };
    
  } catch (error) {
    console.error('❌ App Loading Failed:', error.message);
    return { loaded: false, error: error.message };
  }
}

/**
 * Test 2: Auto-Configuration Check
 */
async function testAutoConfiguration(page) {
  console.log('\n2️⃣ Testing Auto-Configuration...');
  
  try {
    // Wait a bit for any auto-configuration to happen
    await page.waitForTimeout(3000);
    
    // Check if there are any configuration-related messages or UI
    const configMessages = await page.locator('text=configured, text=API key, text=environment').allTextContents();
    const hasAutoConfig = configMessages.length > 0;
    
    console.log('✅ Auto-Configuration:', hasAutoConfig ? 'Working' : 'Not Detected');
    
    if (configMessages.length > 0) {
      console.log('   Messages:', configMessages.slice(0,2).join(', '));
    }
    
    return { autoConfigDetected: hasAutoConfig, messages: configMessages };
    
  } catch (error) {
    console.error('❌ Auto-Configuration Test Failed:', error.message);
    return { autoConfigDetected: false, error: error.message };
  }
}

/**
 * Test 3: Goal Input and Transform Button
 */
async function testGoalTransform(page) {
  console.log('\n3️⃣ Testing Goal Transform...');
  
  try {
    // Find input field
    const goalInput = page.locator('input[type="text"], textarea').first();
    await goalInput.waitFor({ timeout: 5000 });
    
    // Clear and enter test goal
    await goalInput.clear();
    await goalInput.fill('I want to learn JavaScript this year');
    console.log('✅ Goal Input: Text entered successfully');
    
    // Find transform/submit button
    const transformButton = page.locator('button').filter({ hasText: /transform|submit|translate|go/i }).first();
    const genericButton = page.locator('button').first();
    
    let buttonToClick = null;
    
    if (await transformButton.count() > 0) {
      buttonToClick = transformButton;
      console.log('✅ Transform Button: Found specific transform button');
    } else if (await genericButton.count() > 0) {
      buttonToClick = genericButton;
      console.log('✅ Transform Button: Using generic button');
    } else {
      throw new Error('No clickable button found');
    }
    
    // Click the button and wait for response
    const buttonText = await buttonToClick.textContent();
    console.log('   Button Text:', buttonText?.trim());
    
    await buttonToClick.click();
    console.log('✅ Transform Button: Clicked successfully');
    
    // Wait for any response or changes
    await page.waitForTimeout(3000);
    
    // Check for results or error messages
    const hasResults = await page.locator('[class*="result"], [class*="smart"], [class*="goal"], [class*="output"]').count() > 0;
    const hasError = await page.locator('[class*="error"], [class*="alert"], text=error').count() > 0;
    
    console.log('✅ Transform Result:', hasResults ? 'Results Displayed' : hasError ? 'Error Detected' : 'No Clear Result');
    
    return { 
      inputWorking: true, 
      buttonWorking: true, 
      hasResults, 
      hasError,
      buttonText 
    };
    
  } catch (error) {
    console.error('❌ Goal Transform Failed:', error.message);
    return { inputWorking: false, buttonWorking: false, error: error.message };
  }
}

/**
 * Test 4: Network Activity Check
 */
async function testNetworkActivity(page) {
  console.log('\n4️⃣ Testing Network Activity...');
  
  try {
    const responses = [];
    
    // Monitor network requests
    page.on('response', response => {
      if (response.url().includes('api') || response.url().includes('goal')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Trigger a goal transformation
    const goalInput = page.locator('input[type="text"], textarea').first();
    if (await goalInput.count() > 0) {
      await goalInput.clear();
      await goalInput.fill('Test network activity');
      
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(2000);
      }
    }
    
    console.log('✅ Network Requests:', responses.length > 0 ? `${responses.length} detected` : 'None detected');
    
    if (responses.length > 0) {
      responses.forEach(resp => {
        console.log(`   ${resp.status} - ${resp.url}`);
      });
    }
    
    return { networkActive: responses.length > 0, responses };
    
  } catch (error) {
    console.error('❌ Network Activity Test Failed:', error.message);
    return { networkActive: false, error: error.message };
  }
}

/**
 * Generate Frontend Report
 */
function generateFrontendReport(results) {
  console.log('\n📊 FRONTEND INTEGRATION REPORT');
  console.log('==============================');
  
  const tests = [
    { name: 'App Loading', passed: results.loading?.loaded || false },
    { name: 'UI Elements Present', passed: (results.loading?.hasGoalInput && results.loading?.hasButton) || false },
    { name: 'Auto Configuration', passed: results.autoConfig?.autoConfigDetected || false },
    { name: 'Goal Input Working', passed: results.transform?.inputWorking || false },
    { name: 'Transform Button Working', passed: results.transform?.buttonWorking || false },
    { name: 'Network Activity', passed: results.network?.networkActive || false }
  ];
  
  const passedCount = tests.filter(t => t.passed).length;
  const totalCount = tests.length;
  
  console.log(`✅ Frontend Tests Passed: ${passedCount}/${totalCount}`);
  console.log(`📈 Success Rate: ${Math.round((passedCount/totalCount) * 100)}%`);
  
  const frontendStatus = passedCount >= 5 ? 'FULLY_WORKING' : passedCount >= 3 ? 'MOSTLY_WORKING' : 'NOT_WORKING';
  console.log(`🎯 Frontend Status: ${frontendStatus}`);
  
  console.log('\nDetailed Results:');
  tests.forEach(test => {
    console.log(`- ${test.name}: ${test.passed ? '✅' : '❌'}`);
  });
  
  // Additional details
  if (results.loading?.title) {
    console.log(`\n📄 Page Title: "${results.loading.title}"`);
  }
  
  if (results.transform?.buttonText) {
    console.log(`🔘 Button Text: "${results.transform.buttonText}"`);
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    frontendResults: results,
    summary: {
      totalTests: totalCount,
      passedTests: passedCount,
      successRate: Math.round((passedCount/totalCount) * 100),
      frontendStatus
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'frontend-integration-results.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n💾 Frontend report saved to: frontend-integration-results.json');
  
  return frontendStatus;
}

/**
 * Main Frontend Test Execution
 */
async function runFrontendTests() {
  console.log('🚀 Starting frontend integration tests...\n');
  
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
    
    const results = {
      loading: await testAppLoading(page),
      autoConfig: await testAutoConfiguration(page),
      transform: await testGoalTransform(page),
      network: await testNetworkActivity(page)
    };
    
    const frontendStatus = generateFrontendReport(results);
    
    console.log('\n🏁 Frontend Integration Test Complete!');
    
    return frontendStatus;
    
  } catch (error) {
    console.error('💥 Frontend Test Failed:', error.message);
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
    const status = await runFrontendTests();
    process.exit(status === 'NOT_WORKING' ? 1 : 0);
  } catch (error) {
    console.error('💥 Fatal Error:', error.message);
    process.exit(1);
  }
}

main();