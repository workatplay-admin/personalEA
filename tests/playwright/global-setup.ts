import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright Global Setup...');
  
  // Verify environment
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required for testing');
  }

  // Wait for services to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Check backend API
    console.log('🔍 Verifying backend API...');
    await page.goto('http://localhost:3000/health');
    const healthResponse = await page.textContent('pre');
    console.log('✅ Backend API health:', healthResponse);

    // Check frontend
    console.log('🔍 Verifying frontend...');
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    const title = await page.title();
    console.log('✅ Frontend title:', title);

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;