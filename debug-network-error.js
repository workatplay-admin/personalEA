const { chromium } = require('playwright');

async function debugNetworkError() {
  console.log('🔍 DEBUGGING NETWORK ERROR\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track all network requests and responses
  const networkLog = [];
  
  page.on('request', request => {
    console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
    if (request.url().includes('/api/')) {
      console.log(`   Headers: ${JSON.stringify(request.headers())}`);
      console.log(`   Post Data: ${request.postData()}`);
    }
    networkLog.push({
      type: 'request',
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      postData: request.postData()
    });
  });
  
  page.on('response', response => {
    console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
    if (response.url().includes('/api/')) {
      response.text().then(body => {
        console.log(`   Body: ${body}`);
      }).catch(() => {});
    }
    networkLog.push({
      type: 'response',
      status: response.status(),
      url: response.url()
    });
  });
  
  page.on('requestfailed', request => {
    console.log(`❌ REQUEST FAILED: ${request.url()}`);
    console.log(`   Failure: ${request.failure()?.errorText}`);
    networkLog.push({
      type: 'failed',
      url: request.url(),
      error: request.failure()?.errorText
    });
  });
  
  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });
  
  try {
    // Try localhost first
    console.log('📱 Attempting to load app from localhost:5174...');
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle', timeout: 10000 });
  } catch (error) {
    console.log('❌ Failed to load from localhost, trying Codespaces URL...');
    
    // Get the Codespaces URL
    const { execSync } = require('child_process');
    try {
      const codespaceName = execSync('echo $CODESPACE_NAME').toString().trim();
      const url = `https://${codespaceName}-5174.app.github.dev/`;
      console.log(`📱 Loading from Codespaces URL: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle' });
    } catch (e) {
      console.error('❌ Failed to determine Codespaces URL:', e.message);
      throw e;
    }
  }
  
  console.log('✅ App loaded\n');
  
  // Click Continue
  console.log('🖱️ Clicking Continue...');
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(1000);
  
  // Enter goal
  console.log('✍️ Entering goal...');
  await page.fill('textarea', 'Learn to play guitar');
  await page.waitForTimeout(500);
  
  // Click Transform
  console.log('🚀 Clicking Transform...');
  await page.click('button:has-text("Transform into SMART Goal")');
  
  // Wait for network activity
  console.log('⏳ Waiting for API response...\n');
  await page.waitForTimeout(5000);
  
  // Check for error messages
  const errorText = await page.textContent('body');
  if (errorText.includes('Translation Failed') || errorText.includes('Network error')) {
    console.log('❌❌❌ FOUND ERROR MESSAGE ON PAGE');
    await page.screenshot({ path: 'network-error-debug.png' });
    
    // Get the actual error element
    const errorElement = await page.$('text=Translation Failed');
    if (errorElement) {
      const errorBox = await errorElement.boundingBox();
      console.log('Error element found at:', errorBox);
    }
  }
  
  console.log('\n📊 NETWORK LOG SUMMARY:');
  console.log('='.repeat(50));
  networkLog.forEach(entry => {
    if (entry.url.includes('/api/') || entry.type === 'failed') {
      console.log(entry);
    }
  });
  
  await browser.close();
}

debugNetworkError().catch(err => {
  console.error('❌ Debug script failed:', err);
  process.exit(1);
});