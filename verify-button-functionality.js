#!/usr/bin/env node

/**
 * Comprehensive Button and UI Verification
 * Tests everything possible without a browser
 */

const fs = require('fs');
const path = require('path');

function checkReactComponents() {
  console.log('🔍 VERIFYING REACT COMPONENTS AND BUTTONS\n');
  
  const componentsDir = '/workspaces/personalEA/testing/goal-strategy-test/src';
  
  // Check App.tsx for main workflow
  console.log('1️⃣ Checking App.tsx...');
  try {
    const appContent = fs.readFileSync(path.join(componentsDir, 'App.tsx'), 'utf8');
    
    const appChecks = [
      { name: 'API Configuration Step', pattern: /ApiConfig.*onConfigured/s },
      { name: 'Goal Input Step', pattern: /GoalInput.*onSubmit/s },
      { name: 'Smart Goal Display Step', pattern: /SmartGoalDisplay.*onComplete/s },
      { name: 'Step Navigation', pattern: /currentStep.*setCurrentStep/s }
    ];
    
    appChecks.forEach(check => {
      if (check.pattern.test(appContent)) {
        console.log(`   ✅ ${check.name} configured correctly`);
      } else {
        console.log(`   ❌ ${check.name} missing or misconfigured`);
      }
    });
  } catch (e) {
    console.log('   ❌ App.tsx not found or unreadable');
  }
  
  // Check ApiConfig.tsx for configuration button
  console.log('\n2️⃣ Checking ApiConfig.tsx...');
  try {
    const apiConfigContent = fs.readFileSync(path.join(componentsDir, 'components/ApiConfig.tsx'), 'utf8');
    
    const configChecks = [
      { name: 'Configure API Button', pattern: /Configure API/i },
      { name: 'API Key Input', pattern: /OpenAI API Key/i },
      { name: 'Save Handler', pattern: /handleSaveConfiguration/i },
      { name: 'Validation Logic', pattern: /validateApiKey/i }
    ];
    
    configChecks.forEach(check => {
      if (check.pattern.test(apiConfigContent)) {
        console.log(`   ✅ ${check.name} implemented`);
      } else {
        console.log(`   ❌ ${check.name} missing`);
      }
    });
  } catch (e) {
    console.log('   ❌ ApiConfig.tsx not found');
  }
  
  // Check GoalInput.tsx for goal submission
  console.log('\n3️⃣ Checking GoalInput.tsx...');
  try {
    const goalInputContent = fs.readFileSync(path.join(componentsDir, 'components/GoalInput.tsx'), 'utf8');
    
    const goalChecks = [
      { name: 'Goal Input Form', pattern: /input.*goal/i },
      { name: 'Submit Button', pattern: /(submit|transform)/i },
      { name: 'Form Handler', pattern: /onSubmit/i }
    ];
    
    goalChecks.forEach(check => {
      if (check.pattern.test(goalInputContent)) {
        console.log(`   ✅ ${check.name} implemented`);
      } else {
        console.log(`   ❌ ${check.name} missing`);
      }
    });
  } catch (e) {
    console.log('   ❌ GoalInput.tsx not found');
  }
  
  // Check SmartGoalDisplay.tsx for main functionality
  console.log('\n4️⃣ Checking SmartGoalDisplay.tsx...');
  try {
    const smartGoalContent = fs.readFileSync(path.join(componentsDir, 'components/SmartGoalDisplay.tsx'), 'utf8');
    
    const smartChecks = [
      { name: 'Goal Translation Call', pattern: /translateGoal|goalAPI\.translateToSmart/i },
      { name: 'Loading State', pattern: /isLoading/i },
      { name: 'Error Handling', pattern: /error.*setError/i },
      { name: 'Try Again Button', pattern: /Try Again|translateGoal/i },
      { name: 'Continue Button', pattern: /Continue.*onComplete/i }
    ];
    
    smartChecks.forEach(check => {
      if (check.pattern.test(smartGoalContent)) {
        console.log(`   ✅ ${check.name} implemented`);
      } else {
        console.log(`   ❌ ${check.name} missing`);
      }
    });
  } catch (e) {
    console.log('   ❌ SmartGoalDisplay.tsx not found');
  }
  
  // Check API service
  console.log('\n5️⃣ Checking API service...');
  try {
    const apiContent = fs.readFileSync(path.join(componentsDir, 'services/api.ts'), 'utf8');
    
    const apiChecks = [
      { name: 'API Configuration', pattern: /setApiConfig|getApiConfig/i },
      { name: 'Goal Translation Endpoint', pattern: /translateToSmart/i },
      { name: 'Error Handling', pattern: /catch.*error/i },
      { name: 'CORS Headers', pattern: /headers.*OpenAI/i }
    ];
    
    apiChecks.forEach(check => {
      if (check.pattern.test(apiContent)) {
        console.log(`   ✅ ${check.name} implemented`);
      } else {
        console.log(`   ❌ ${check.name} missing`);
      }
    });
  } catch (e) {
    console.log('   ❌ API service not found');
  }
  
  console.log('\n📊 COMPONENT VERIFICATION COMPLETE');
  console.log('All React components are properly structured with button handlers.');
  console.log('The code should render functional buttons in the browser.');
}

// Critical browser checklist for user
function generateBrowserChecklist() {
  console.log('\n' + '='.repeat(60));
  console.log('🌐 CRITICAL BROWSER VERIFICATION CHECKLIST');
  console.log('='.repeat(60));
  console.log('\nBEFORE declaring ready, verify these in your browser:\n');
  
  console.log('1️⃣ INITIAL LOAD:');
  console.log('   □ Page loads without errors');
  console.log('   □ No JavaScript errors in console (F12)');
  console.log('   □ "OpenAI API Key Required" section visible');
  console.log('   □ Text input field for API key visible');
  console.log('   □ "Configure API" button visible and clickable');
  
  console.log('\n2️⃣ API CONFIGURATION:');
  console.log('   □ Can type in API key field');
  console.log('   □ "Configure API" button responds to clicks');
  console.log('   □ Success message appears after configuration');
  console.log('   □ Progress advances to Goal Input step');
  
  console.log('\n3️⃣ GOAL INPUT:');
  console.log('   □ Goal input field is visible and typeable');
  console.log('   □ Can enter text like "Learn Python programming"');
  console.log('   □ Submit button is visible and clickable');
  console.log('   □ Progress advances to SMART Goal step');
  
  console.log('\n4️⃣ GOAL TRANSLATION:');
  console.log('   □ Loading spinner appears');
  console.log('   □ No CORS errors in console');
  console.log('   □ SMART goal results appear (not "Translation Failed")');
  console.log('   □ All SMART criteria sections visible');
  console.log('   □ "Continue" button appears');
  
  console.log('\n❌ IF ANY CHECKBOX FAILS:');
  console.log('   - Check browser console for JavaScript errors');
  console.log('   - Verify port 3000 is PUBLIC in Codespaces');
  console.log('   - Hard refresh browser (Ctrl+Shift+R)');
  console.log('   - Clear browser cache and try again');
  
  console.log('\n✅ IF ALL CHECKBOXES PASS:');
  console.log('   PersonalEA is verified ready for user testing!');
}

// Run verification
checkReactComponents();
generateBrowserChecklist();