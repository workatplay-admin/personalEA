import { test, expect, Page } from '@playwright/test';
import { GoalStrategyPage } from './page-objects/GoalStrategyPage';

interface ConversationScenario {
  id: string;
  name: string;
  goalText: string;
  userPersona: string;
  expectedQualities: string[];
  qualityThresholds: {
    naturalness: number;
    helpfulness: number;
    goalImprovement: number;
  };
}

const conversationScenarios: ConversationScenario[] = [
  {
    id: 'learning_python',
    name: 'Python Learning Goal',
    goalText: 'I want to learn Python programming',
    userPersona: 'beginner_developer',
    expectedQualities: [
      'Breaks down learning into specific steps',
      'Suggests concrete milestones',
      'Provides realistic timeline',
      'Offers practical resources'
    ],
    qualityThresholds: {
      naturalness: 0.8,
      helpfulness: 0.85,
      goalImprovement: 0.9
    }
  },
  {
    id: 'business_growth',
    name: 'Business Growth Goal',
    goalText: 'Grow my startup and get more customers',
    userPersona: 'entrepreneur',
    expectedQualities: [
      'Focuses on measurable metrics',
      'Suggests specific growth strategies',
      'Considers market factors',
      'Includes timeline and milestones'
    ],
    qualityThresholds: {
      naturalness: 0.75,
      helpfulness: 0.8,
      goalImprovement: 0.85
    }
  },
  {
    id: 'fitness_marathon',
    name: 'Marathon Training Goal',
    goalText: 'I want to run a marathon someday',
    userPersona: 'fitness_beginner',
    expectedQualities: [
      'Addresses fitness level progression',
      'Suggests training schedule',
      'Considers safety and health',
      'Provides specific timeline'
    ],
    qualityThresholds: {
      naturalness: 0.8,
      helpfulness: 0.8,
      goalImprovement: 0.85
    }
  },
  {
    id: 'career_change',
    name: 'Career Transition Goal',
    goalText: 'I want to change careers from marketing to tech',
    userPersona: 'career_changer',
    expectedQualities: [
      'Acknowledges career transition challenges',
      'Suggests skill development path',
      'Provides realistic timeline',
      'Addresses financial considerations'
    ],
    qualityThresholds: {
      naturalness: 0.75,
      helpfulness: 0.85,
      goalImprovement: 0.9
    }
  }
];

test.describe('Conversation Quality Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure fresh start for each test
    await page.goto('/');
  });

  for (const scenario of conversationScenarios) {
    test(`${scenario.name} - Complete Conversation Flow`, async ({ page }) => {
      const goalPage = new GoalStrategyPage(page);
      const testResults = {
        scenario: scenario.id,
        timestamp: new Date(),
        steps: [],
        conversationAnalysis: null,
        screenshots: []
      };

      console.log(`\n🧪 Testing: ${scenario.name}`);
      console.log(`📝 Goal: "${scenario.goalText}"`);
      console.log(`👤 Persona: ${scenario.userPersona}`);

      try {
        // Step 1: Load and validate page
        console.log('📄 Step 1: Loading page...');
        await goalPage.waitForPageLoad();
        
        const pageValidation = await goalPage.validatePageStructure();
        testResults.steps.push({
          step: 'page_load',
          success: pageValidation.hasTitle && pageValidation.hasContent,
          details: pageValidation
        });

        await goalPage.getPageScreenshot(`${scenario.id}-01-initial`);

        // Step 2: Configure API key
        console.log('🔑 Step 2: Configuring API...');
        const apiKey = process.env.OPENAI_API_KEY || '';
        const apiConfigured = await goalPage.configureApiKey(apiKey);
        
        testResults.steps.push({
          step: 'api_config',
          success: apiConfigured,
          details: { apiKeyProvided: apiKey.length > 0 }
        });

        if (apiConfigured) {
          await goalPage.getPageScreenshot(`${scenario.id}-02-api-configured`);
        }

        // Step 3: Enter and submit goal
        console.log('📝 Step 3: Entering goal...');
        await goalPage.enterGoal(scenario.goalText);
        await goalPage.getPageScreenshot(`${scenario.id}-03-goal-entered`);
        
        await goalPage.submitGoal();
        await goalPage.getPageScreenshot(`${scenario.id}-04-goal-submitted`);

        testResults.steps.push({
          step: 'goal_input',
          success: true,
          details: { goalText: scenario.goalText }
        });

        // Step 4: Wait for SMART goal generation
        console.log('⏳ Step 4: Waiting for SMART goal generation...');
        const smartGoalResult = await goalPage.waitForSmartGoalGeneration(30000);
        
        testResults.steps.push({
          step: 'smart_generation',
          success: smartGoalResult.visible,
          details: smartGoalResult
        });

        await goalPage.getPageScreenshot(`${scenario.id}-05-smart-generated`);

        // Step 5: Analyze initial response quality
        const initialAnalysis = await analyzeGoalQuality(
          scenario.goalText,
          smartGoalResult.title,
          smartGoalResult.confidence,
          scenario
        );

        testResults.steps.push({
          step: 'initial_analysis',
          success: initialAnalysis.meetsThreshold,
          details: initialAnalysis
        });

        // Step 6: Test conversation refinement (if available)
        console.log('💬 Step 6: Testing conversation refinement...');
        const refinementStarted = await goalPage.startChatRefinement(
          "Can you help me make this more specific and add a realistic timeline?"
        );

        if (refinementStarted) {
          await page.waitForTimeout(5000); // Allow time for AI response
          await goalPage.getPageScreenshot(`${scenario.id}-06-chat-refinement`);
          
          const conversationHistory = await goalPage.getConversationHistory();
          const conversationAnalysis = await analyzeConversationQuality(
            conversationHistory,
            scenario
          );
          
          testResults.conversationAnalysis = conversationAnalysis;
          testResults.steps.push({
            step: 'conversation_refinement',
            success: conversationAnalysis.overallQuality > scenario.qualityThresholds.naturalness,
            details: conversationAnalysis
          });
        } else {
          testResults.steps.push({
            step: 'conversation_refinement',
            success: false,
            details: { error: 'Chat interface not available' }
          });
        }

        // Step 7: Final quality assessment
        const finalAssessment = assessOverallConversationQuality(testResults, scenario);
        
        console.log('📊 Final Assessment:');
        console.log(`   Quality Score: ${(finalAssessment.overallScore * 100).toFixed(1)}%`);
        console.log(`   Meets Thresholds: ${finalAssessment.meetsAllThresholds ? '✅' : '❌'}`);
        console.log(`   Goal Improvement: ${finalAssessment.goalImprovement ? '✅' : '❌'}`);

        // Save detailed test results
        await saveTestResults(testResults, scenario.id);

        // Assert success based on quality thresholds
        expect(finalAssessment.meetsAllThresholds, 
          `Conversation quality below thresholds. Score: ${finalAssessment.overallScore}`
        ).toBeTruthy();

        expect(smartGoalResult.visible, 
          'SMART goal should be generated and visible'
        ).toBeTruthy();

        expect(smartGoalResult.confidence, 
          'Generated goal should have reasonable confidence'
        ).toBeGreaterThan(30);

      } catch (error) {
        console.error(`❌ Test failed for ${scenario.name}:`, error);
        await goalPage.getPageScreenshot(`${scenario.id}-error`);
        
        testResults.steps.push({
          step: 'error',
          success: false,
          details: { error: error.message }
        });

        await saveTestResults(testResults, scenario.id);
        throw error;
      }
    });
  }
});

// Helper function to analyze goal quality
async function analyzeGoalQuality(
  originalGoal: string,
  smartGoal: string,
  confidence: number,
  scenario: ConversationScenario
) {
  const analysis = {
    goalImprovement: 0,
    specificity: 0,
    clarity: 0,
    confidence: confidence / 100,
    meetsThreshold: false
  };

  // Basic quality analysis
  if (smartGoal && smartGoal.length > originalGoal.length) {
    analysis.goalImprovement = 0.7; // Goal was enhanced
  }

  if (smartGoal && (smartGoal.includes('by') || smartGoal.includes('within'))) {
    analysis.specificity = 0.8; // Has timeline elements
  }

  if (confidence > 50) {
    analysis.clarity = confidence / 100;
  }

  const avgScore = (analysis.goalImprovement + analysis.specificity + analysis.clarity) / 3;
  analysis.meetsThreshold = avgScore >= scenario.qualityThresholds.goalImprovement;

  return analysis;
}

// Helper function to analyze conversation quality
async function analyzeConversationQuality(
  messages: any[],
  scenario: ConversationScenario
) {
  const analysis = {
    messageCount: messages.length,
    naturalness: 0,
    helpfulness: 0,
    engagement: 0,
    overallQuality: 0,
    strengths: [],
    weaknesses: []
  };

  if (messages.length >= 2) {
    // Basic conversation analysis
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    if (assistantMessages.length > 0) {
      const avgLength = assistantMessages.reduce((sum, m) => sum + m.content.length, 0) / assistantMessages.length;
      
      // Naturalness: based on response length and variety
      analysis.naturalness = Math.min(avgLength / 200, 1.0);
      
      // Helpfulness: based on specific keywords and content
      const helpfulKeywords = ['specific', 'measurable', 'timeline', 'steps', 'plan'];
      const helpfulnessScore = assistantMessages.reduce((score, msg) => {
        const matchCount = helpfulKeywords.filter(keyword => 
          msg.content.toLowerCase().includes(keyword)
        ).length;
        return score + (matchCount / helpfulKeywords.length);
      }, 0) / assistantMessages.length;
      
      analysis.helpfulness = helpfulnessScore;
      
      // Engagement: based on questions and interactive elements
      const questionCount = assistantMessages.reduce((count, msg) => 
        count + (msg.content.split('?').length - 1), 0
      );
      analysis.engagement = Math.min(questionCount / 2, 1.0);
    }
  }

  analysis.overallQuality = (analysis.naturalness + analysis.helpfulness + analysis.engagement) / 3;

  // Identify strengths and weaknesses
  if (analysis.naturalness >= 0.8) analysis.strengths.push('Natural conversation flow');
  if (analysis.helpfulness >= 0.8) analysis.strengths.push('Helpful and specific guidance');
  if (analysis.engagement >= 0.7) analysis.strengths.push('Good user engagement');

  if (analysis.naturalness < 0.6) analysis.weaknesses.push('Conversation feels scripted');
  if (analysis.helpfulness < 0.6) analysis.weaknesses.push('Lacks specific guidance');
  if (analysis.engagement < 0.5) analysis.weaknesses.push('Low user engagement');

  return analysis;
}

// Helper function to assess overall conversation quality
function assessOverallConversationQuality(testResults: any, scenario: ConversationScenario) {
  const assessment = {
    overallScore: 0,
    goalImprovement: false,
    conversationQuality: false,
    meetsAllThresholds: false,
    details: {}
  };

  // Check if goal was improved
  const smartGenStep = testResults.steps.find(s => s.step === 'smart_generation');
  if (smartGenStep && smartGenStep.success) {
    assessment.goalImprovement = true;
    assessment.overallScore += 0.4;
  }

  // Check conversation quality
  if (testResults.conversationAnalysis) {
    const convQuality = testResults.conversationAnalysis.overallQuality;
    assessment.conversationQuality = convQuality >= scenario.qualityThresholds.naturalness;
    assessment.overallScore += convQuality * 0.6;
  } else {
    // If no conversation, base on initial goal generation quality
    const initialAnalysis = testResults.steps.find(s => s.step === 'initial_analysis');
    if (initialAnalysis && initialAnalysis.details) {
      assessment.overallScore += initialAnalysis.details.confidence * 0.6;
    }
  }

  assessment.meetsAllThresholds = assessment.overallScore >= 0.75;
  assessment.details = {
    steps: testResults.steps.map(s => ({ step: s.step, success: s.success })),
    conversationAnalysis: testResults.conversationAnalysis
  };

  return assessment;
}

// Helper function to save test results
async function saveTestResults(results: any, scenarioId: string) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const resultsDir = 'test-results/conversation-quality';
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const filename = `${resultsDir}/${scenarioId}-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`📄 Test results saved to: ${filename}`);
  } catch (error) {
    console.log('Warning: Could not save test results:', error.message);
  }
}