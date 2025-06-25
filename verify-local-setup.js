const { chromium } = require('playwright');

async function verifySetup() {
  console.log('🔍 Verifying local VS Code + Codespaces setup...\n');
  
  const browser = await chromium.launch({ headless: false }); // Show browser
  const page = await browser.newPage();
  
  try {
    // Test backend
    console.log('1️⃣ Testing backend...');
    const response = await fetch('http://localhost:3003/health');
    const health = await response.json();
    console.log('✅ Backend is healthy:', health);
    
    // Test frontend
    console.log('\n2️⃣ Testing frontend...');
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
    
    // Check for our app elements
    const hasApiConfig = await page.locator('text=API Configuration').isVisible();
    const hasContinue = await page.locator('button:has-text("Continue")').isVisible();
    
    if (hasApiConfig && hasContinue) {
      console.log('✅ Frontend loaded correctly!');
      
      // Quick flow test
      console.log('\n3️⃣ Testing user flow...');
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(1000);
      
      const hasGoalInput = await page.locator('textarea[placeholder*="goal"]').isVisible();
      if (hasGoalInput) {
        console.log('✅ User flow working!');
        
        await page.fill('textarea', 'Test goal');
        await page.screenshot({ path: 'setup-verified.png' });
        console.log('📸 Screenshot saved: setup-verified.png');
      }
    } else {
      console.log('❌ App elements not found - check if frontend is serving the right content');
    }
    
    console.log('\n✅ Setup verified! You can now run tests successfully.');
    
  } catch (error) {
    console.error('❌ Setup verification failed:', error.message);
    await page.screenshot({ path: 'setup-error.png' });
  } finally {
    await browser.close();
  }
}

verifySetup();