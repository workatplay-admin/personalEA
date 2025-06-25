const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Verifying CSP fix for API configuration...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (text.includes('🔧')) {
      console.log('🔧 Frontend Log:', text);
    }
  });
  
  // Log successful requests
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`✅ API Request: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    const url = 'https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev/';
    console.log(`\n📱 Opening browser to: ${url}\n`);
    
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for React to initialize
    await page.waitForTimeout(2000);
    
    // Check current state
    const hasConfigButton = await page.locator('button:has-text("Configure API")').count() > 0;
    const hasContinueButton = await page.locator('button:has-text("Continue")').count() > 0;
    const hasGoalInput = await page.locator('textarea[placeholder*="goal"]').count() > 0;
    
    console.log('\n📊 UI State:');
    console.log(`   Configure API button: ${hasConfigButton ? '✅ Visible' : '❌ Not visible'}`);
    console.log(`   Continue button: ${hasContinueButton ? '✅ Visible' : '❌ Not visible'}`);
    console.log(`   Goal input field: ${hasGoalInput ? '✅ Visible' : '❌ Not visible'}`);
    
    if (hasConfigButton) {
      console.log('\n❌ ISSUE: App is showing Configure API button instead of auto-configuring');
      console.log('   This suggests the environment check or auto-configuration is failing\n');
    } else if (hasContinueButton) {
      console.log('\n✅ SUCCESS: App has auto-configured with backend environment!');
      console.log('   The CSP fix is working - frontend successfully connected to backend\n');
      
      // Test clicking Continue
      await page.locator('button:has-text("Continue")').click();
      await page.waitForTimeout(1000);
      
      const afterContinue = await page.locator('textarea[placeholder*="goal"]').count() > 0;
      if (afterContinue) {
        console.log('✅ Workflow test: Successfully progressed to goal input screen\n');
      }
    } else if (hasGoalInput) {
      console.log('\n✅ App is already on the goal input screen');
    }
    
    // Test a full goal translation workflow
    if (await page.locator('textarea[placeholder*="goal"]').count() > 0) {
      console.log('🧪 Testing goal translation workflow...\n');
      
      await page.fill('textarea[placeholder*="goal"]', 'Learn to play guitar in 6 months');
      await page.click('button:has-text("Transform")');
      
      // Wait for API response
      await page.waitForTimeout(3000);
      
      // Check for results
      const hasResults = await page.locator('text=SMART Goal').count() > 0;
      if (hasResults) {
        console.log('✅ Goal translation successful! The complete workflow is functional.\n');
        await page.screenshot({ path: 'success-goal-translation.png' });
      } else {
        console.log('❌ Goal translation did not produce visible results\n');
        await page.screenshot({ path: 'failed-goal-translation.png' });
      }
    }
    
    console.log('📋 Console log summary:');
    const errorLogs = consoleLogs.filter(log => log.type === 'error');
    const warningLogs = consoleLogs.filter(log => log.type === 'warning');
    console.log(`   Errors: ${errorLogs.length}`);
    console.log(`   Warnings: ${warningLogs.length}`);
    
    if (errorLogs.length > 0) {
      console.log('\n❌ Console errors detected:');
      errorLogs.forEach(log => console.log(`   - ${log.text}`));
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    await browser.close();
    console.log('\n✅ Browser test completed');
  }
})();