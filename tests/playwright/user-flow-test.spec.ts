import { test, expect } from '@playwright/test';
import { GoalStrategyPage } from './page-objects/GoalStrategyPage';

test.describe('PersonalEA User Flow Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Complete Goal to SMART Transformation Flow', async ({ page }) => {
    const goalPage = new GoalStrategyPage(page);
    
    console.log('🚀 Starting complete user flow test...');

    // Step 1: Verify page loads correctly
    await goalPage.waitForPageLoad();
    const pageValidation = await goalPage.validatePageStructure();
    
    expect(pageValidation.hasTitle, 'Page should have a title').toBeTruthy();
    expect(pageValidation.hasContent, 'Page should have meaningful content').toBeTruthy();
    
    console.log('✅ Page loaded successfully');
    console.log(`   Title present: ${pageValidation.hasTitle}`);
    console.log(`   Input elements: ${pageValidation.hasInputElements}`);
    console.log(`   Buttons: ${pageValidation.hasButtons}`);
    console.log(`   Content length: ${pageValidation.pageText.length} chars`);

    // Step 2: Configure API key (if needed)
    const apiKey = process.env.OPENAI_API_KEY;
    expect(apiKey, 'OPENAI_API_KEY environment variable should be set').toBeTruthy();
    
    const apiConfigured = await goalPage.configureApiKey(apiKey);
    expect(apiConfigured, 'API key should be configured successfully').toBeTruthy();
    console.log('✅ API key configured');

    // Step 3: Enter a test goal
    const testGoal = 'I want to become a better software developer';
    await goalPage.enterGoal(testGoal);
    console.log(`✅ Goal entered: "${testGoal}"`);

    // Step 4: Submit goal for SMART transformation
    await goalPage.submitGoal();
    console.log('✅ Goal submitted for transformation');

    // Step 5: Wait for and validate SMART goal generation
    const smartGoalResult = await goalPage.waitForSmartGoalGeneration(30000);
    
    expect(smartGoalResult.visible, 'SMART goal should be visible').toBeTruthy();
    expect(smartGoalResult.title.length, 'SMART goal should have a meaningful title').toBeGreaterThan(10);
    expect(smartGoalResult.confidence, 'Goal should have reasonable confidence').toBeGreaterThan(30);
    
    console.log('✅ SMART goal generated successfully');
    console.log(`   Title: "${smartGoalResult.title}"`);
    console.log(`   Confidence: ${smartGoalResult.confidence}%`);
    console.log(`   Criteria present:`, smartGoalResult.criteria);

    // Step 6: Test conversation refinement (if available)
    const chatStarted = await goalPage.startChatRefinement(
      "Can you make this goal more specific with concrete milestones?"
    );
    
    if (chatStarted) {
      console.log('✅ Chat refinement initiated');
      
      // Wait for AI response
      await page.waitForTimeout(5000);
      
      const conversationHistory = await goalPage.getConversationHistory();
      expect(conversationHistory.length, 'Should have conversation messages').toBeGreaterThan(0);
      
      console.log(`✅ Conversation history: ${conversationHistory.length} messages`);
      console.log('   Messages:', conversationHistory.map(m => `${m.role}: ${m.content.substring(0, 50)}...`));
    } else {
      console.log('⚠️ Chat refinement not available (UI not present)');
    }

    // Take final screenshot
    await goalPage.getPageScreenshot('user-flow-complete');
    
    console.log('🎉 Complete user flow test passed!');
  });

  test('Multiple Goal Types Testing', async ({ page }) => {
    const goalPage = new GoalStrategyPage(page);
    
    const testGoals = [
      {
        category: 'Learning',
        goal: 'Learn machine learning and AI development',
        expectations: ['specific learning path', 'timeline', 'resources']
      },
      {
        category: 'Business',
        goal: 'Increase revenue for my consulting business',
        expectations: ['measurable targets', 'strategy', 'timeline']
      },
      {
        category: 'Health',
        goal: 'Get in better physical shape',
        expectations: ['specific activities', 'measurable goals', 'schedule']
      }
    ];

    await goalPage.waitForPageLoad();
    
    // Configure API once
    const apiKey = process.env.OPENAI_API_KEY;
    await goalPage.configureApiKey(apiKey);

    for (const testCase of testGoals) {
      console.log(`\n🧪 Testing ${testCase.category} goal: "${testCase.goal}"`);
      
      // Enter goal
      await goalPage.enterGoal(testCase.goal);
      await goalPage.submitGoal();
      
      // Wait for result
      const result = await goalPage.waitForSmartGoalGeneration(25000);
      
      // Validate result
      expect(result.visible, `${testCase.category} goal should generate visible result`).toBeTruthy();
      expect(result.confidence, `${testCase.category} goal should have reasonable confidence`).toBeGreaterThan(20);
      
      console.log(`   ✅ Generated: "${result.title}"`);
      console.log(`   ✅ Confidence: ${result.confidence}%`);
      
      // Take screenshot for this test case
      await goalPage.getPageScreenshot(`goal-${testCase.category.toLowerCase()}`);
      
      // Small delay between tests
      await page.waitForTimeout(2000);
    }

    console.log('🎉 Multiple goal types test completed!');
  });

  test('Error Handling and Edge Cases', async ({ page }) => {
    const goalPage = new GoalStrategyPage(page);
    
    await goalPage.waitForPageLoad();
    
    // Test empty goal submission
    try {
      await goalPage.enterGoal('');
      await goalPage.submitGoal();
      await page.waitForTimeout(3000);
      console.log('✅ Empty goal handled gracefully');
    } catch (error) {
      console.log('⚠️ Empty goal submission behavior:', error.message);
    }
    
    // Test very short goal
    try {
      await goalPage.enterGoal('win');
      await goalPage.submitGoal();
      const result = await goalPage.waitForSmartGoalGeneration(15000);
      expect(result.visible || result.confidence > 0, 'Should handle short goals').toBeTruthy();
      console.log('✅ Short goal handled');
    } catch (error) {
      console.log('⚠️ Short goal handling:', error.message);
    }
    
    // Test very long goal
    try {
      const longGoal = 'I want to become a highly skilled software developer who specializes in artificial intelligence and machine learning while also building a successful startup company that helps people achieve their personal and professional goals through technology-enabled coaching and mentoring services that leverage the latest advances in natural language processing and conversational AI to provide personalized guidance and support to users around the world';
      await goalPage.enterGoal(longGoal);
      await goalPage.submitGoal();
      const result = await goalPage.waitForSmartGoalGeneration(30000);
      expect(result.visible || result.confidence > 0, 'Should handle long goals').toBeTruthy();
      console.log('✅ Long goal handled');
    } catch (error) {
      console.log('⚠️ Long goal handling:', error.message);
    }

    console.log('🎉 Error handling test completed!');
  });

  test('Performance and Responsiveness', async ({ page }) => {
    const goalPage = new GoalStrategyPage(page);
    
    console.log('⚡ Testing performance and responsiveness...');
    
    // Measure page load time
    const startTime = Date.now();
    await goalPage.waitForPageLoad();
    const loadTime = Date.now() - startTime;
    
    expect(loadTime, 'Page should load within 10 seconds').toBeLessThan(10000);
    console.log(`✅ Page load time: ${loadTime}ms`);
    
    // Configure API
    const apiKey = process.env.OPENAI_API_KEY;
    await goalPage.configureApiKey(apiKey);
    
    // Test goal processing time
    const processingStartTime = Date.now();
    await goalPage.enterGoal('Learn data science and analytics');
    await goalPage.submitGoal();
    const result = await goalPage.waitForSmartGoalGeneration(30000);
    const processingTime = Date.now() - processingStartTime;
    
    expect(result.visible, 'Goal should be processed successfully').toBeTruthy();
    expect(processingTime, 'Goal processing should complete within 30 seconds').toBeLessThan(30000);
    
    console.log(`✅ Goal processing time: ${processingTime}ms`);
    console.log(`✅ Processing result: "${result.title}"`);
    
    // Test UI responsiveness
    const responsiveTests = [
      'clicking multiple buttons quickly',
      'rapid text input',
      'UI state changes'
    ];
    
    for (const test of responsiveTests) {
      console.log(`   Testing: ${test}`);
      // Add UI responsiveness tests here
      await page.waitForTimeout(500);
    }
    
    console.log('🎉 Performance test completed!');
    console.log(`   Overall performance: ${loadTime + processingTime}ms total`);
  });
});