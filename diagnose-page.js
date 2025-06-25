const { chromium } = require('playwright');

async function diagnosePage() {
  console.log('🔍 DIAGNOSTIC TEST - What is actually on the page?\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newContext().then(ctx => ctx.newPage());
  
  try {
    console.log('📱 Navigating to: https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev/\n');
    
    await page.goto('https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Get page title
    const title = await page.title();
    console.log(`📄 Page Title: "${title}"`);
    
    // Get page URL (in case of redirect)
    const currentUrl = page.url();
    console.log(`🔗 Current URL: ${currentUrl}`);
    
    // Get all visible text
    const bodyText = await page.textContent('body');
    const cleanText = bodyText.replace(/\s+/g, ' ').trim().substring(0, 500);
    console.log(`\n📝 Page Content Preview:\n${cleanText}...\n`);
    
    // Look for common elements
    console.log('🔍 Looking for common elements:');
    
    const elements = [
      { selector: 'h1', name: 'H1 headings' },
      { selector: 'button', name: 'Buttons' },
      { selector: 'input', name: 'Input fields' },
      { selector: 'textarea', name: 'Textareas' },
      { selector: 'form', name: 'Forms' },
      { selector: '.btn-primary', name: 'Primary buttons' },
      { selector: '[data-target*="webauthn"]', name: 'WebAuthn elements' },
      { selector: 'iframe', name: 'Iframes' }
    ];
    
    for (const elem of elements) {
      const count = await page.locator(elem.selector).count();
      if (count > 0) {
        console.log(`   ${elem.name}: ${count} found`);
        
        // Get text of first few elements
        for (let i = 0; i < Math.min(3, count); i++) {
          const text = await page.locator(elem.selector).nth(i).textContent().catch(() => 'no text');
          if (text && text.trim()) {
            console.log(`      - "${text.trim().substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
          }
        }
      }
    }
    
    // Check if it's a GitHub auth page
    const isGitHubAuth = await page.locator('text=Sign in to GitHub').count() > 0;
    const isPasskey = await page.locator('text=passkey').count() > 0;
    
    if (isGitHubAuth) {
      console.log('\n⚠️ This appears to be a GitHub authentication page');
    }
    if (isPasskey) {
      console.log('\n⚠️ This appears to be a passkey/WebAuthn authentication page');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'diagnostic-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved as diagnostic-screenshot.png');
    
    // Check for our app specifically
    console.log('\n🔍 Checking for Goal Strategy App elements:');
    const appElements = [
      'Goal & Strategy',
      'API Configuration',
      'Transform',
      'SMART Goal',
      'Enter your goal'
    ];
    
    for (const text of appElements) {
      const found = await page.locator(`text="${text}"`).count() > 0;
      console.log(`   "${text}": ${found ? '✅ Found' : '❌ Not found'}`);
    }
    
    // Check iframe content if any
    const iframes = await page.locator('iframe').count();
    if (iframes > 0) {
      console.log(`\n🖼️ Found ${iframes} iframe(s)`);
      for (let i = 0; i < iframes; i++) {
        const frame = page.frames()[i + 1]; // +1 because first frame is main page
        if (frame) {
          const frameUrl = frame.url();
          console.log(`   Iframe ${i + 1} URL: ${frameUrl}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  } finally {
    await browser.close();
  }
}

diagnosePage();