const { chromium } = require('playwright');

async function diagnoseUserError() {
  console.log('🔍 DIAGNOSING USER ERROR - EXACT REPLICATION\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const startTime = Date.now();
  let apiCallStartTime = 0;
  let apiCallEndTime = 0;
  
  // Track all network activity
  page.on('request', request => {
    if (request.url().includes('/goals/translate')) {
      apiCallStartTime = Date.now();
      console.log(`📤 API CALL STARTED at ${apiCallStartTime - startTime}ms`);
      console.log(`   URL: ${request.url()}`);
      console.log(`   Headers: ${JSON.stringify(request.headers())}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/goals/translate')) {
      apiCallEndTime = Date.now();
      const duration = apiCallEndTime - apiCallStartTime;
      console.log(`📥 API RESPONSE at ${apiCallEndTime - startTime}ms (took ${duration}ms)`);
      console.log(`   Status: ${response.status()}`);
    }
  });
  
  page.on('requestfailed', request => {
    if (request.url().includes('/api/')) {
      console.log(`❌ REQUEST FAILED: ${request.url()}`);
      console.log(`   Error: ${request.failure()?.errorText}`);
    }
  });
  
  // Capture all console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('error') || text.includes('Error') || text.includes('failed')) {
      console.log(`📝 Console: ${text}`);
    }
  });
  
  try {
    // Check if we're in Codespaces
    const isCodespaces = process.env.CODESPACES === 'true';
    let url = 'http://localhost:5174/';
    
    if (isCodespaces) {
      const codespaceName = process.env.CODESPACE_NAME;
      url = `https://${codespaceName}-5174.app.github.dev/`;
      console.log(`🌐 Running in Codespaces: ${url}`);
    }
    
    console.log('📱 Loading app...');
    await page.goto(url, { waitUntil: 'networkidle' });
    console.log('✅ App loaded\n');
    
    // Take initial screenshot
    await page.screenshot({ path: 'diagnose-1-initial.png' });
    
    // Click Continue
    console.log('🖱️ Clicking Continue...');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(1000);
    
    // Enter goal
    console.log('✍️ Entering goal...');
    await page.fill('textarea', 'Learn to play guitar');
    await page.screenshot({ path: 'diagnose-2-goal-entered.png' });
    
    // Click Transform and wait for either success or error
    console.log('🚀 Clicking Transform...');
    const transformTime = Date.now();
    await page.click('button:has-text("Transform into SMART Goal")');
    
    console.log('⏳ Waiting for result...\n');
    
    // Wait for either success or error
    const result = await Promise.race([
      page.waitForSelector('text=SMART Goal', { timeout: 35000 }).then(() => 'success'),
      page.waitForSelector('text=Translation Failed', { timeout: 35000 }).then(() => 'error'),
      page.waitForSelector('text=Network error', { timeout: 35000 }).then(() => 'network-error'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 35000))
    ]);
    
    const resultTime = Date.now() - transformTime;
    console.log(`\n📊 RESULT: ${result.toUpperCase()} after ${resultTime}ms`);
    
    // Take final screenshot
    await page.screenshot({ path: 'diagnose-3-final-state.png' });
    
    if (result === 'error' || result === 'network-error') {
      console.log('\n❌❌❌ ERROR DETECTED - CAPTURING ERROR STATE');
      
      // Get the exact error message
      const errorText = await page.textContent('body');
      if (errorText.includes('Translation Failed')) {
        console.log('Found "Translation Failed" message');
      }
      if (errorText.includes('Network error')) {
        console.log('Found "Network error" message');
      }
      
      // Check if there's a specific error element
      const errorElement = await page.$('[class*="error"], [class*="Error"], text=Translation Failed, text=Network error');
      if (errorElement) {
        const text = await errorElement.textContent();
        console.log(`Error element text: "${text}"`);
      }
      
      // Check loading state
      const loadingElement = await page.$('[class*="loading"], [class*="Loading"], text=Loading');
      if (loadingElement) {
        console.log('Found loading element still visible');
      }
    }
    
    console.log('\n📋 TIMING SUMMARY:');
    console.log(`   App load: ${transformTime - startTime}ms`);
    console.log(`   API call duration: ${apiCallEndTime - apiCallStartTime}ms`);
    console.log(`   Total wait time: ${resultTime}ms`);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

diagnoseUserError().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});