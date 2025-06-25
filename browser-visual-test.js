const { chromium } = require('playwright');

async function visualTest() {
  console.log('🎬 VISUAL BROWSER TEST - COMPLETE USER FLOW\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000  // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  console.log('📱 Opening app...');
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(2000);
  
  console.log('🖱️ Clicking Continue...');
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(1500);
  
  console.log('✍️ Entering goal...');
  const goal = 'I want to learn Spanish and become conversational within 6 months';
  await page.fill('textarea', goal);
  await page.waitForTimeout(1000);
  
  console.log('🚀 Clicking Transform...');
  await page.click('button:has-text("Transform into SMART Goal")');
  
  console.log('⏳ Waiting for results...');
  await page.waitForSelector('text=SMART Goal Generated', { timeout: 30000 });
  
  console.log('✅ SUCCESS! Goal transformed successfully!');
  console.log('\n📸 Taking final screenshot...');
  await page.screenshot({ path: 'successful-flow-complete.png' });
  
  await page.waitForTimeout(5000);  // Keep browser open for 5 seconds
  
  await browser.close();
  console.log('\n✨ Visual test completed!');
}

visualTest().catch(err => {
  console.error('❌ Visual test failed:', err);
  process.exit(1);
});