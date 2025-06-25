const puppeteer = require('puppeteer');

async function testApiKeyEntry() {
  console.log('🔑 Testing API Key Entry and Workflow Progression');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`Browser: ${msg.text()}`));
  page.on('pageerror', error => console.error(`Page error: ${error.message}`));
  
  try {
    // Load the app
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to enter a dummy API key
    console.log('Attempting to enter API key...');
    
    const apiKeyEntered = await page.evaluate(() => {
      // Look for API key input field
      const apiKeyInput = document.querySelector('input[type="password"]') ||
                         document.querySelector('input[placeholder*="API"]') ||
                         document.querySelector('input[placeholder*="key"]');
      
      if (apiKeyInput) {
        // Enter a dummy API key (we'll use environment key anyway)
        apiKeyInput.value = 'sk-dummy-key-for-testing';
        apiKeyInput.dispatchEvent(new Event('input', { bubbles: true }));
        apiKeyInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('API key entered');
        return true;
      }
      
      console.log('API key input not found');
      return false;
    });
    
    if (apiKeyEntered) {
      console.log('API key entered successfully');
      
      // Look for and click the Configure API button
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const configureClicked = await page.evaluate(() => {
        const configureButton = Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent?.includes('Configure') ||
          btn.textContent?.includes('Save') ||
          btn.textContent?.includes('Next') ||
          btn.textContent?.includes('Continue')
        );
        
        if (configureButton && !configureButton.disabled) {
          configureButton.click();
          console.log('Configure button clicked:', configureButton.textContent);
          return true;
        }
        
        console.log('Configure button not found or disabled');
        return false;
      });
      
      if (configureClicked) {
        console.log('Configure button clicked, waiting for progression...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if we progressed to the next step
        const newState = await page.evaluate(() => {
          return {
            currentStep: document.querySelector('[data-step]')?.getAttribute('data-step') || 'unknown',
            bodyText: document.body.textContent?.substring(0, 300) || '',
            hasGoalInput: !!document.querySelector('input[placeholder*="goal"]') ||
                         !!document.querySelector('textarea[placeholder*="goal"]'),
            hasTransformButton: Array.from(document.querySelectorAll('button')).some(btn => 
              btn.textContent?.includes('Transform') ||
              btn.textContent?.includes('SMART') ||
              btn.textContent?.includes('Generate')
            )
          };
        });
        
        console.log('New state after API configuration:', newState);
        
        if (newState.hasGoalInput) {
          console.log('SUCCESS: Goal input is now available!');
          
          // Try to enter a goal and transform it
          const goalAndTransform = await page.evaluate(() => {
            const goalInput = document.querySelector('input[placeholder*="goal"]') ||
                             document.querySelector('textarea[placeholder*="goal"]');
            
            if (goalInput) {
              goalInput.value = 'I want to learn TypeScript and build a web application';
              goalInput.dispatchEvent(new Event('input', { bubbles: true }));
              goalInput.dispatchEvent(new Event('change', { bubbles: true }));
              
              // Wait a bit then try to find and click transform button
              setTimeout(() => {
                const transformButton = Array.from(document.querySelectorAll('button')).find(btn => 
                  btn.textContent?.includes('Transform') ||
                  btn.textContent?.includes('SMART') ||
                  btn.textContent?.includes('Generate')
                );
                
                if (transformButton && !transformButton.disabled) {
                  transformButton.click();
                  console.log('Transform button clicked!');
                  return true;
                }
                return false;
              }, 1000);
              
              return true;
            }
            return false;
          });
          
          if (goalAndTransform) {
            console.log('Goal entered and transform attempted!');
            
            // Wait for potential API call
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            // Check for results
            const finalResults = await page.evaluate(() => {
              const bodyText = document.body.textContent?.toLowerCase() || '';
              const hasSmartContent = bodyText.includes('specific') ||
                                    bodyText.includes('measurable') ||
                                    bodyText.includes('achievable') ||
                                    bodyText.includes('relevant') ||
                                    bodyText.includes('time-bound');
              
              return {
                hasSmartContent,
                hasConfidence: bodyText.includes('confidence'),
                bodyTextSample: bodyText.substring(0, 500)
              };
            });
            
            console.log('Final results:', finalResults);
            
            if (finalResults.hasSmartContent) {
              console.log('🎉 SUCCESS: SMART goal results are displayed!');
              return { status: 'WORKING', details: 'Complete workflow successful' };
            } else {
              console.log('❌ FAIL: No SMART results found');
              return { status: 'PARTIAL', details: 'Workflow progressed but no results' };
            }
          }
        } else {
          console.log('❌ FAIL: Still no goal input after API configuration');
          return { status: 'BLOCKED', details: 'API configuration did not progress workflow' };
        }
      } else {
        console.log('❌ FAIL: Could not click configure button');
        return { status: 'BLOCKED', details: 'Could not click configure button' };
      }
    } else {
      console.log('❌ FAIL: Could not enter API key');
      return { status: 'BLOCKED', details: 'Could not enter API key' };
    }
    
  } catch (error) {
    console.error('API key test failed:', error);
    return { status: 'ERROR', details: error.message };
  } finally {
    await browser.close();
  }
}

// Run the test
testApiKeyEntry()
  .then(result => {
    console.log('\n🔑 API KEY TEST RESULT:', result);
    
    const fs = require('fs');
    fs.writeFileSync('/workspaces/personalEA/api-key-test-results.json', JSON.stringify(result, null, 2));
    
    process.exit(result.status === 'WORKING' ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ API key test script failed:', error);
    process.exit(1);
  });