/**
 * Persona-Based Test Runner for PersonalEA
 * Simulates different user types and evaluates conversation quality
 */

import axios from 'axios';
import { AIConversationJudge } from './AIConversationJudge.ts';
import { 
  ConversationData, 
  TestScenario, 
  UserProfile, 
  ChatMessage,
  BatchTestResults,
  ConversationQualityMetrics
} from './ConversationQualityMetrics.ts';

export class PersonaTestRunner {
  private judge: AIConversationJudge;
  private personalEAApiUrl: string;
  private apiKey: string;

  constructor(apiKey: string, personalEAApiUrl: string = 'http://localhost:3000') {
    this.judge = new AIConversationJudge(apiKey);
    this.personalEAApiUrl = personalEAApiUrl;
    this.apiKey = apiKey;
  }

  /**
   * Run a complete test scenario with a specific persona
   */
  async runPersonaTestScenario(scenario: TestScenario): Promise<{
    scenarioId: string;
    passed: boolean;
    metrics: ConversationQualityMetrics;
    conversationData: ConversationData;
    deviations: string[];
  }> {
    console.log(`🎭 Running persona test: ${scenario.name}`);
    console.log(`👤 Persona: ${scenario.userPersona.responsePatterns.join(', ')}`);
    
    try {
      // Simulate the conversation
      const conversationData = await this.simulateConversation(scenario);
      
      // Evaluate with AI judge
      const judgeResponse = await this.judge.evaluateConversation(conversationData);
      
      // Check if it meets success criteria
      const passed = this.checkSuccessCriteria(judgeResponse.metrics, scenario);
      
      // Identify deviations from expected behavior
      const deviations = this.analyzeDeviations(judgeResponse, scenario);
      
      console.log(`${passed ? '✅' : '❌'} Scenario: ${scenario.name} - Quality: ${judgeResponse.metrics.goalImprovement.toFixed(2)}`);
      
      return {
        scenarioId: scenario.id,
        passed,
        metrics: judgeResponse.metrics,
        conversationData,
        deviations
      };
      
    } catch (error) {
      console.error(`❌ Scenario ${scenario.name} failed:`, error);
      throw new Error(`Test scenario failed: ${error.message}`);
    }
  }

  /**
   * Run a batch of test scenarios
   */
  async runTestSuite(scenarios: TestScenario[]): Promise<BatchTestResults> {
    console.log(`🚀 Running test suite with ${scenarios.length} scenarios`);
    
    const testSuiteId = `suite-${Date.now()}`;
    const results = [];
    
    for (const scenario of scenarios) {
      try {
        const result = await this.runPersonaTestScenario(scenario);
        results.push(result);
        
        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Scenario ${scenario.id} failed:`, error);
        // Continue with other scenarios
      }
    }
    
    // Calculate aggregate metrics
    const aggregateMetrics = this.calculateAggregateMetrics(results);
    
    // Generate insights
    const insights = await this.generateTestInsights(results);
    
    const batchResults: BatchTestResults = {
      testSuiteId,
      timestamp: new Date(),
      scenarios: results,
      aggregateMetrics,
      insights
    };
    
    console.log(`📊 Test suite complete: ${aggregateMetrics.passRate.toFixed(1)}% pass rate`);
    return batchResults;
  }

  /**
   * Simulate a conversation between PersonalEA and a persona
   */
  private async simulateConversation(scenario: TestScenario): Promise<ConversationData> {
    const conversationId = `conv-${Date.now()}-${scenario.id}`;
    const messages: ChatMessage[] = [];
    const startTime = Date.now();
    
    // Step 1: Initial goal translation
    console.log(`   💬 Starting conversation with goal: "${scenario.initialGoal}"`);
    
    const goalResponse = await this.callPersonalEAAPI('/api/v1/goals/translate', {
      raw_goal: scenario.initialGoal
    });
    
    if (!goalResponse.success) {
      throw new Error(`Goal translation failed: ${goalResponse.error}`);
    }
    
    messages.push({
      role: 'user',
      content: scenario.initialGoal,
      timestamp: new Date(),
      metadata: { component: 'initial' }
    });
    
    let currentGoal = goalResponse.data;
    let conversationRound = 0;
    const maxRounds = scenario.maxRounds || 5;
    
    // Step 2: Simulate conversation rounds based on persona
    while (conversationRound < maxRounds) {
      console.log(`   🔄 Conversation round ${conversationRound + 1}`);
      
      // Get question from PersonalEA
      const questionResponse = await this.callPersonalEAAPI('/api/v1/goals/component-question', {
        goalTitle: currentGoal.title,
        componentKey: this.getNextComponent(conversationRound),
        goalContext: currentGoal
      });
      
      if (!questionResponse.success) {
        break; // End conversation if API fails
      }
      
      const assistantQuestion = questionResponse.data.question;
      messages.push({
        role: 'assistant',
        content: assistantQuestion,
        timestamp: new Date(),
        metadata: { component: this.getNextComponent(conversationRound) }
      });
      
      // Generate persona-appropriate response
      const userResponse = await this.generatePersonaResponse(
        assistantQuestion, 
        scenario.userPersona,
        conversationRound,
        scenario.mockUserResponses
      );
      
      messages.push({
        role: 'user',
        content: userResponse,
        timestamp: new Date(),
        metadata: { 
          component: this.getNextComponent(conversationRound),
          sentiment: this.classifyResponseSentiment(userResponse, scenario.userPersona)
        }
      });
      
      // Update goal with clarification
      const clarificationResponse = await this.callPersonalEAAPI(`/api/v1/goals/${currentGoal.id}/clarify`, {
        clarifications: { [this.getNextComponent(conversationRound)]: userResponse },
        goalContext: currentGoal,
        conversationHistory: messages.slice(-4) // Recent context
      });
      
      if (clarificationResponse.success) {
        currentGoal = clarificationResponse.data;
        
        // Add AI feedback to conversation
        if (clarificationResponse.aiFeedback) {
          messages.push({
            role: 'assistant',
            content: clarificationResponse.aiFeedback,
            timestamp: new Date(),
            metadata: { component: 'feedback' }
          });
        }
      }
      
      conversationRound++;
      
      // Check if conversation should end based on persona behavior
      if (this.shouldEndConversation(userResponse, scenario.userPersona, conversationRound)) {
        break;
      }
    }
    
    const sessionDuration = Math.round((Date.now() - startTime) / 1000 / 60); // minutes
    
    return {
      conversationId,
      originalGoal: scenario.initialGoal,
      finalGoal: {
        title: currentGoal.title,
        criteria: currentGoal.criteria,
        confidence: currentGoal.confidence
      },
      messages,
      userProfile: scenario.userPersona,
      context: {
        sessionDuration,
        componentsCovered: [...new Set(messages.map(m => m.metadata?.component).filter(Boolean))],
        clarificationRounds: conversationRound,
        userInitiatedQuestions: messages.filter(m => m.role === 'user' && m.content.includes('?')).length,
        systemGuidanceInstances: messages.filter(m => m.role === 'assistant' && m.metadata?.component === 'feedback').length
      }
    };
  }

  /**
   * Generate persona-appropriate responses
   */
  private async generatePersonaResponse(
    question: string, 
    persona: UserProfile, 
    round: number,
    mockResponses?: string[]
  ): Promise<string> {
    
    // Use mock responses if provided (for deterministic testing)
    if (mockResponses && mockResponses[round]) {
      return mockResponses[round];
    }
    
    // Generate response based on persona characteristics
    const responsePrompt = `
    You are simulating a user with these characteristics:
    - Response patterns: ${persona.responsePatterns.join(', ')}
    - Communication style: ${persona.preferences.communicationStyle}
    - Detail level preference: ${persona.preferences.detailLevel}
    - Experience: ${persona.experience}
    
    The AI coach asked: "${question}"
    
    Respond as this user would, staying in character. Keep response under 100 words.
    
    Examples by persona:
    - Collaborative: "That's a great question! I think..."
    - Resistant: "I'm not sure why that matters..." 
    - Detailed: "Well, there are several aspects to consider..."
    - Vague: "I guess... maybe..."
    `;
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: responsePrompt }],
          temperature: 0.7,
          max_tokens: 100
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content;
      
    } catch (error) {
      console.error('Persona response generation failed:', error);
      // Fallback response based on persona
      return this.getFallbackResponse(persona, round);
    }
  }

  /**
   * Helper methods
   */
  private getNextComponent(round: number): string {
    const components = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'];
    return components[round % components.length];
  }

  private classifyResponseSentiment(response: string, persona: UserProfile): 'positive' | 'neutral' | 'negative' | 'resistant' {
    if (persona.responsePatterns.includes('resistant')) return 'resistant';
    if (response.toLowerCase().includes('great') || response.toLowerCase().includes('yes')) return 'positive';
    if (response.toLowerCase().includes('not sure') || response.toLowerCase().includes('maybe')) return 'negative';
    return 'neutral';
  }

  private shouldEndConversation(response: string, persona: UserProfile, round: number): boolean {
    // Resistant users might quit early
    if (persona.responsePatterns.includes('resistant') && round > 2) {
      return response.toLowerCase().includes('enough') || response.toLowerCase().includes('done');
    }
    return false;
  }

  private getFallbackResponse(persona: UserProfile, round: number): string {
    if (persona.responsePatterns.includes('collaborative')) {
      return "That makes sense. Let me think about that...";
    } else if (persona.responsePatterns.includes('resistant')) {
      return "I'm not sure this is really necessary.";
    } else {
      return "Okay, I'll try to answer that.";
    }
  }

  private async callPersonalEAAPI(endpoint: string, data: any): Promise<any> {
    const response = await axios.post(
      `${this.personalEAApiUrl}${endpoint}`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-API-Key': this.apiKey
        },
        timeout: 30000
      }
    );
    
    return response.data;
  }

  private checkSuccessCriteria(metrics: ConversationQualityMetrics, scenario: TestScenario): boolean {
    const thresholds = scenario.minimumQualityThresholds;
    
    return (
      metrics.goalImprovement >= thresholds.goalImprovement &&
      metrics.conversationNaturalness >= thresholds.conversationNaturalness &&
      metrics.userSatisfactionPrediction >= thresholds.userSatisfactionPrediction &&
      metrics.smartCriteriaFulfillment >= thresholds.smartCriteriaFulfillment
    );
  }

  private analyzeDeviations(judgeResponse: any, scenario: TestScenario): string[] {
    const deviations: string[] = [];
    const metrics = judgeResponse.metrics;
    const thresholds = scenario.minimumQualityThresholds;
    
    if (metrics.goalImprovement < thresholds.goalImprovement) {
      deviations.push(`Goal improvement below threshold: ${metrics.goalImprovement} < ${thresholds.goalImprovement}`);
    }
    
    if (metrics.conversationNaturalness < thresholds.conversationNaturalness) {
      deviations.push(`Conversation not natural enough: ${metrics.conversationNaturalness} < ${thresholds.conversationNaturalness}`);
    }
    
    return deviations;
  }

  private calculateAggregateMetrics(results: any[]): any {
    const validResults = results.filter(r => r.metrics);
    
    if (validResults.length === 0) {
      return {
        averageGoalImprovement: 0,
        averageUserSatisfaction: 0,
        passRate: 0,
        totalConversations: 0
      };
    }
    
    return {
      averageGoalImprovement: validResults.reduce((sum, r) => sum + r.metrics.goalImprovement, 0) / validResults.length,
      averageUserSatisfaction: validResults.reduce((sum, r) => sum + r.metrics.userSatisfactionPrediction, 0) / validResults.length,
      passRate: (results.filter(r => r.passed).length / results.length) * 100,
      totalConversations: results.length
    };
  }

  private async generateTestInsights(results: any[]): Promise<any> {
    // Analyze patterns in test results
    const passedTests = results.filter(r => r.passed);
    const failedTests = results.filter(r => !r.passed);
    
    return {
      bestPerformingPatterns: this.extractPatterns(passedTests, 'strong'),
      worstPerformingPatterns: this.extractPatterns(failedTests, 'weak'),
      emergentBehaviors: this.identifyEmergentBehaviors(results),
      systemRecommendations: this.generateSystemRecommendations(results)
    };
  }

  private extractPatterns(results: any[], type: 'strong' | 'weak'): string[] {
    // Extract common patterns from successful/failed tests
    return ['Pattern analysis would be implemented here'];
  }

  private identifyEmergentBehaviors(results: any[]): string[] {
    return ['Emergent behavior analysis would be implemented here'];
  }

  private generateSystemRecommendations(results: any[]): string[] {
    return ['System recommendations would be generated here'];
  }
}