#!/usr/bin/env node

const puppeteer = require('puppeteer');

class UITester {
  constructor() {
    this.results = {
      serverHealth: false,
      uiLoads: false,
      noUnwantedButtons: false,
      goalTranslation: false,
      chatFlow: false,
      overallPass: false
    };
  }

  async runTests() {
    console.log('🧪 Starting Automated UI Testing...\n');

    try {
      // Test 1: Server Health
      console.log('1. Testing Server Health...');
      const healthResponse = await fetch('http://localhost:3000/health');
      const healthData = await healthResponse.json();
      
      if (healthData.status === 'OK') {
        console.log('   ✅ API Server healthy');
        this.results.serverHealth = true;
      } else {
        console.log('   ❌ API Server unhealthy');
        return this.reportResults();
      }

      // Test 2: UI Loads
      console.log('\n2. Testing UI Load...');
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
      const page = await browser.newPage();
      
      await page.goto('http://localhost:5174', { waitUntil: 'networkidle0', timeout: 10000 });
      const title = await page.title();
      
      if (title.includes('Goal & Strategy Service Testing')) {
        console.log('   ✅ UI loads correctly');
        this.results.uiLoads = true;
      } else {
        console.log('   ❌ UI title wrong:', title);
      }

      // Test 3: Check for unwanted buttons
      console.log('\n3. Checking for unwanted buttons...');
      const testButtons = await page.$$eval('button', buttons => 
        buttons.map(btn => btn.textContent?.trim()).filter(text => 
          text?.includes('Test Goal Translation') || 
          text?.includes('🧪') ||
          text?.includes('Empty Goal')
        )
      );
      
      if (testButtons.length === 0) {
        console.log('   ✅ No unwanted test buttons found');
        this.results.noUnwantedButtons = true;
      } else {
        console.log('   ❌ Found unwanted buttons:', testButtons);
      }

      // Test 4: Goal Translation Flow
      console.log('\n4. Testing Goal Translation...');
      
      // Navigate to API config if needed - simplified approach
      try {
        // Check if we need to configure API
        const apiInput = await page.$('input[placeholder*="OpenAI"], input[placeholder*="API"]');
        if (apiInput) {
          await apiInput.type(process.env.OPENAI_API_KEY || 'test-key');
          
          // Look for save button
          const saveButton = await page.evaluateHandle(() => {
            return Array.from(document.querySelectorAll('button')).find(btn => 
              btn.textContent?.includes('Save') || btn.textContent?.includes('Configure')
            );
          });
          if (saveButton.asElement()) {
            await saveButton.asElement().click();
            await page.waitForTimeout(1000);
          }
        }
      } catch (e) {
        console.log('   ℹ️  No API config needed or already configured');
      }

      // Enter goal
      const goalInput = await page.$('textarea, input[type="text"]');
      if (goalInput) {
        await goalInput.type('I want to be a racecar driver');
        
        // Look for analyze button
        const analyzeButton = await page.evaluateHandle(() => {
          return Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent?.includes('Analyze') || btn.textContent?.includes('Translate')
          );
        });
        
        if (analyzeButton.asElement()) {
          await analyzeButton.asElement().click();
          
          // Wait for response with timeout
          try {
            await page.waitForSelector('[data-testid="smart-goal"], .chat-message, .bot-message', { timeout: 15000 });
            console.log('   ✅ Goal translation response received');
            this.results.goalTranslation = true;
          } catch (error) {
            console.log('   ❌ Goal translation timed out or failed');
          }
        } else {
          console.log('   ❌ Could not find analyze button');
        }
      } else {
        console.log('   ❌ Could not find goal input field');
      }

      // Test 5: Chat Flow
      console.log('\n5. Testing Chat Flow...');
      const chatInterface = await page.$('.chat-interface, [class*="chat"], [class*="message"]');
      if (chatInterface) {
        console.log('   ✅ Chat interface found');
        
        // Look for racing-specific content
        const pageContent = await page.content();
        if (pageContent.includes('racing') || pageContent.includes('Specific') || pageContent.includes('measurable')) {
          console.log('   ✅ Chat contains relevant content');
          this.results.chatFlow = true;
        } else {
          console.log('   ❌ Chat content not relevant');
        }
      } else {
        console.log('   ❌ Chat interface not found');
      }

      await browser.close();
      
    } catch (error) {
      console.log('❌ Testing error:', error.message);
    }

    this.reportResults();
  }

  reportResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`Server Health:      ${this.results.serverHealth ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`UI Loads:           ${this.results.uiLoads ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`No Unwanted Buttons:${this.results.noUnwantedButtons ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Goal Translation:   ${this.results.goalTranslation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Chat Flow:          ${this.results.chatFlow ? '✅ PASS' : '❌ FAIL'}`);
    
    const passCount = Object.values(this.results).filter(r => r === true).length;
    this.results.overallPass = passCount >= 4; // Need at least 4/5 to pass
    
    console.log(`\nOverall Status:     ${this.results.overallPass ? '✅ PASS' : '❌ FAIL'} (${passCount}/5)`);
    
    if (!this.results.overallPass) {
      console.log('\n🚨 Issues found - fix before user testing');
    } else {
      console.log('\n🎉 Ready for user testing at http://localhost:5174');
    }
  }
}

// Run tests
new UITester().runTests();