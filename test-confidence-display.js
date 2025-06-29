// Simple test to verify confidence score display fix
const puppeteer = require('puppeteer');

async function testConfidenceDisplay() {
  let browser;
  try {
    console.log('Starting confidence display test...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Navigate to the test app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // Wait for initial load
    await page.waitForSelector('.api-key-input', { timeout: 5000 });
    console.log('✓ Page loaded successfully');
    
    // Set API key
    await page.type('.api-key-input', 'test-api-key');
    await page.click('.set-api-key-button');
    await page.waitForTimeout(1000);
    
    // Enter a vague goal
    console.log('Testing vague goal...');
    await page.type('input[placeholder*="goal"]', 'Learn something');
    await page.click('button[type="submit"]');
    
    // Wait for SMART translation
    await page.waitForSelector('.confidence-score', { timeout: 10000 });
    
    // Check confidence score format
    const confidenceScores = await page.$$eval('.confidence-score', elements => 
      elements.map(el => el.textContent)
    );
    
    console.log('Confidence scores found:', confidenceScores);
    
    // Verify format (should be XX%, not 0.XX%)
    let allCorrect = true;
    for (const score of confidenceScores) {
      if (score.includes('0.') && score.includes('%')) {
        console.error(`❌ Incorrect format found: ${score}`);
        allCorrect = false;
      } else if (score.match(/\d{1,2}%/)) {
        console.log(`✓ Correct format: ${score}`);
      }
    }
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'confidence-display-test.png' });
    
    if (allCorrect) {
      console.log('\n✅ All confidence scores display correctly!');
    } else {
      console.log('\n❌ Some confidence scores have incorrect format');
    }
    
    // Test specific goal for high confidence
    console.log('\nTesting specific goal...');
    await page.reload();
    await page.waitForSelector('.api-key-input', { timeout: 5000 });
    await page.type('.api-key-input', 'test-api-key');
    await page.click('.set-api-key-button');
    await page.waitForTimeout(1000);
    
    await page.type('input[placeholder*="goal"]', 'Complete React tutorial course on Udemy within 30 days by studying 2 hours daily');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('.confidence-score', { timeout: 10000 });
    
    const highConfidenceScores = await page.$$eval('.confidence-score', elements => 
      elements.map(el => el.textContent)
    );
    
    console.log('High confidence scores:', highConfidenceScores);
    
    // Should see scores like 80%, 90%, not 0.8%, 0.9%
    for (const score of highConfidenceScores) {
      const match = score.match(/(\d+)%/);
      if (match && parseInt(match[1]) > 70) {
        console.log(`✓ High confidence displayed correctly: ${score}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testConfidenceDisplay();