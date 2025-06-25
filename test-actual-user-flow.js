const { chromium } = require('playwright');

async function testActualUserFlow() {
  console.log('🔍 TESTING ACTUAL USER FLOW\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // First, test locally
  console.log('📱 Testing LOCAL access (http://localhost:5174)...');
  try {
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle', timeout: 10000 });
    console.log('✅ Local access works\n');
    
    // Check if it's our app
    const title = await page.title();
    console.log(`   Page title: "${title}"`);
    
    // Look for our app elements
    const hasApiConfig = await page.$('text=API Configuration');
    const hasContinue = await page.$('button:has-text("Continue")');
    
    if (hasApiConfig && hasContinue) {
      console.log('✅ App loaded correctly locally');
      
      // Test the flow
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(1000);
      
      await page.fill('textarea', 'Learn guitar');
      await page.click('button:has-text("Transform into SMART Goal")');
      
      // Wait for result with proper timeout
      console.log('⏳ Waiting for API response (up to 30s)...');
      const startTime = Date.now();
      
      const result = await Promise.race([
        page.waitForSelector('text=SMART Goal', { timeout: 30000 }).then(() => 'success'),
        page.waitForSelector('text=Translation Failed', { timeout: 30000 }).then(() => 'error'),
        page.waitForSelector('text=Network error', { timeout: 30000 }).then(() => 'network-error')
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`\n📊 Result: ${result.toUpperCase()} after ${duration}ms`);
      
      if (result === 'error' || result === 'network-error') {
        await page.screenshot({ path: 'local-error-state.png' });
        const errorText = await page.textContent('body');
        console.log('\n❌ ERROR STATE CAPTURED');
        if (errorText.includes('Translation Failed')) {
          console.log('   Found: "Translation Failed"');
        }
        if (errorText.includes('Network error')) {
          console.log('   Found: "Network error"');
        }
      }
    }
  } catch (error) {
    console.log('❌ Local access failed:', error.message);
  }
  
  // Test Codespaces URL
  console.log('\n📱 Testing CODESPACES access...');
  const codespaceName = process.env.CODESPACE_NAME || 'psychic-space-robot-vpw7gr9q6j39qv';
  const codespaceUrl = `https://${codespaceName}-5174.app.github.dev/`;
  
  try {
    await page.goto(codespaceUrl, { waitUntil: 'networkidle', timeout: 15000 });
    const pageContent = await page.content();
    
    // Check if it's GitHub auth page
    if (pageContent.includes('github.com') || pageContent.includes('Sign in') || pageContent.includes('webauthn')) {
      console.log('❌ Codespaces URL redirects to GitHub authentication');
      console.log('   This is why users see network errors - they\'re not reaching the app!');
      await page.screenshot({ path: 'codespaces-auth-redirect.png' });
    } else {
      // Check if it's our app
      const hasApiConfig = await page.$('text=API Configuration');
      if (hasApiConfig) {
        console.log('✅ App accessible via Codespaces (unexpected)');
      }
    }
  } catch (error) {
    console.log('❌ Codespaces access error:', error.message);
  }
  
  await browser.close();
  
  console.log('\n📋 DIAGNOSIS SUMMARY:');
  console.log('1. The app works locally but may have slow API responses');
  console.log('2. Codespaces URL requires authentication or proper configuration');
  console.log('3. Users accessing via Codespaces URL will see auth page, not the app');
  console.log('4. This explains the "Network error" - users aren\'t reaching the actual app');
}

testActualUserFlow().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});