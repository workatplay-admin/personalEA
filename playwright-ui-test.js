#!/usr/bin/env node

const { chromium } = require('@playwright/test');

(async () => {
  console.log('🧪 Starting Playwright UI Testing...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Monitor network failures
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`   🚨 Failed request: ${response.status()} ${response.url()}`);
    }
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`   🔥 Console error: ${msg.text()}`);
    }
  });
  
  try {
    // Test 1: UI loads correctly
    console.log('1. Testing UI Load...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    
    const title = await page.title();
    if (title.includes('Goal') || title.includes('Strategy')) {
      console.log('   ✅ UI loads correctly');
    } else {
      console.log('   ❌ UI title not found:', title);
    }

    // Test 2: Check for unwanted test buttons
    console.log('\n2. Checking for unwanted buttons...');
    const testButtons = await page.$$eval('button', buttons => 
      buttons.filter(btn => 
        btn.textContent?.includes('🧪 Test Goal Translation') ||
        btn.textContent?.includes('Empty Goal') ||
        btn.textContent?.includes('Test Goal Translation')
      ).length
    );
    
    if (testButtons === 0) {
      console.log('   ✅ No unwanted test buttons found');
    } else {
      console.log(`   ❌ Found ${testButtons} test buttons`);
    }

    // Test 3: Check chat interface loads immediately
    console.log('\n3. Testing immediate chat interface...');
    const chatElements = await page.$$('.chat-interface, [class*="chat"], [class*="message"], .bot-message');
    
    if (chatElements.length > 0) {
      console.log('   ✅ Chat interface loads immediately');
    } else {
      console.log('   ❌ Chat interface not found');
    }

    // Test 4: Check no "Start AI Clarification Chat" button
    console.log('\n4. Checking for start chat button...');
    const startChatButton = await page.$('button:has-text("Start AI Clarification Chat")');
    
    if (!startChatButton) {
      console.log('   ✅ No "Start AI Clarification Chat" button found');
    } else {
      console.log('   ❌ "Start AI Clarification Chat" button still exists');
    }

    // Test 5: Complete flow - API Config -> Goal Input -> SMART Translation
    console.log('\n5. Testing complete flow: API -> Goal -> Chat...');
    
    // Step 1: Configure API Key
    const apiKeyInput = await page.$('input[type="password"]');
    if (apiKeyInput) {
      console.log('   🔑 Step 0: Configuring API key');
      await apiKeyInput.fill(process.env.OPENAI_API_KEY || 'sk-test-key-1234567890abcdef');
      
      // Submit API configuration
      const configButton = await page.$('button:has-text("Save Configuration"), button:has-text("Configure")');
      if (configButton) {
        await configButton.click();
        console.log('   ✅ API configured, moving to goal input...');
        await page.waitForTimeout(2000);
      }
    } else {
      console.log('   ❌ Could not find API key input field');
    }

    // Step 2: Enter Goal  
    const goalInput = await page.$('textarea[id="goal"], textarea');
    if (goalInput) {
      console.log('   📝 Step 1: Found goal input, entering goal');
      await goalInput.fill('I want to be a professional musician');
      console.log('   🎯 Entered goal: "I want to be a professional musician"');
      
      // Submit goal
      const submitButton = await page.$('button:has-text("Transform"), button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        console.log('   ✅ Goal submitted, moving to SMART translation...');
        await page.waitForTimeout(3000);
      }
      
    } else {
      console.log('   ❌ No goal input found after API config');
    }

    // Step 3: Test Chat Interface & Blank Screen Detection
    console.log('\n6. Testing chat interaction and blank screen detection...');
    
    // Wait for chat interface to appear  
    try {
      await page.waitForSelector('.chat-message, .bot-message, [class*="message"], [class*="chat"]', { timeout: 15000 });
      console.log('   ✅ Step 2: Chat interface appeared');
      
      // Check if screen is still visible (not blank)
      const bodyContent = await page.$eval('body', el => el.textContent.trim());
      if (bodyContent.length < 10) {
        console.log('   ❌ Screen appears blank after goal submission');
        await page.screenshot({ path: '/workspaces/personalEA/blank-screen.png' });
        console.log('   📸 Screenshot saved: blank-screen.png');
        return;
      }
      
      console.log('   ✅ Screen has content after goal submission');
      
      // Look for chat input to respond  
      const chatInput = await page.$('input[type="text"], textarea');
      if (chatInput) {
        console.log('   💬 Found chat input field');
        
        // Enter a response to the first question
        await chatInput.fill('I want to perform jazz music in clubs and record albums');
        console.log('   📝 Entered chat response');
        
        // Look for send/submit button more broadly
        const sendButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => 
            btn.textContent?.includes('Send') || 
            btn.textContent?.includes('Submit') ||
            btn.type === 'submit' ||
            btn.textContent?.includes('→') ||
            btn.textContent?.includes('Next')
          );
        });
        
        if (sendButton.asElement()) {
          const buttonText = await sendButton.asElement().textContent();
          console.log(`   🔘 Found send button: "${buttonText}"`);
          await sendButton.asElement().click();
          console.log('   📤 Sent chat response');
          
          // Wait a moment and check for blank screen (THE KEY TEST)
          await page.waitForTimeout(2000);
          
          const bodyContentAfter = await page.$eval('body', el => el.textContent.trim());
          if (bodyContentAfter.length < 10) {
            console.log('   ❌ SCREEN WENT BLANK after chat response!');
            await page.screenshot({ path: '/workspaces/personalEA/blank-screen.png' });
            console.log('   📸 Screenshot saved: blank-screen.png');
          } else {
            console.log('   ✅ Screen still has content after chat response');
            
            // Check for new bot response
            const messages = await page.$$('.chat-message, .bot-message, [class*="message"]');
            console.log(`   💬 Found ${messages.length} chat messages total`);
          }
        } else {
          console.log('   ⚠️  Could not find send button');
          
          // Debug: show all available buttons
          const allButtons = await page.$$eval('button', btns => 
            btns.map(btn => ({ text: btn.textContent?.trim(), type: btn.type, disabled: btn.disabled }))
          );
          console.log('   🔍 Available buttons after chat input:', allButtons);
          
          // Try Enter key as alternative
          console.log('   ⌨️  Trying Enter key instead...');
          await chatInput.press('Enter');
          await page.waitForTimeout(2000);
          
          const bodyContentAfterEnter = await page.$eval('body', el => el.textContent.trim());
          if (bodyContentAfterEnter.length < 10) {
            console.log('   ❌ SCREEN WENT BLANK after Enter key!');
            await page.screenshot({ path: '/workspaces/personalEA/blank-screen.png' });
            console.log('   📸 Screenshot saved: blank-screen.png');
          } else {
            console.log('   ✅ Screen still has content after Enter key');
          }
        }
      } else {
        console.log('   ❌ Could not find chat input field');
      }
      
    } catch (error) {
      console.log('   ❌ Chat interface timeout:', error.message);
    }

    console.log('\n🎉 Playwright testing complete!');
    console.log('💡 System ready for user testing at http://localhost:5174');

  } catch (error) {
    console.log('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();