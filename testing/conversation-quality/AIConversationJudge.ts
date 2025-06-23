/**
 * AI Conversation Judge - Core component for LLM-validates-LLM system
 * Evaluates PersonalEA conversation quality using OpenAI
 */

import axios from 'axios';
import { 
  ConversationQualityMetrics, 
  ConversationData, 
  AIJudgeResponse,
  ChatMessage,
  QualityCriterion
} from './ConversationQualityMetrics.js';

export class AIConversationJudge {
  private apiKey: string;
  private model: string;
  private judgmentPromptTemplate: string;

  constructor(apiKey: string, model: string = 'gpt-4') {
    this.apiKey = apiKey;
    this.model = model;
    this.judgmentPromptTemplate = this.buildJudgmentPrompt();
  }

  /**
   * Main evaluation method - judges a complete conversation
   */
  async evaluateConversation(conversationData: ConversationData): Promise<AIJudgeResponse> {
    console.log(`🧠 AI Judge: Evaluating conversation ${conversationData.conversationId}`);
    
    try {
      const prompt = this.constructEvaluationPrompt(conversationData);
      const response = await this.callOpenAI(prompt);
      const judgeResponse = this.parseJudgeResponse(response);
      
      console.log(`✅ Evaluation complete. Overall quality: ${judgeResponse.metrics.goalImprovement.toFixed(2)}`);
      return judgeResponse;
      
    } catch (error) {
      console.error('❌ AI Judge evaluation failed:', error);
      throw new Error(`Conversation evaluation failed: ${error.message}`);
    }
  }

  /**
   * Quick quality check for ongoing conversations
   */
  async quickQualityCheck(
    originalGoal: string,
    currentMessages: ChatMessage[],
    partialGoal?: any
  ): Promise<{ quality: number; alerts: string[]; suggestions: string[] }> {
    
    const prompt = `
    QUICK QUALITY CHECK for ongoing PersonalEA conversation:
    
    Original Goal: "${originalGoal}"
    Messages so far: ${currentMessages.length}
    Latest exchanges:
    ${currentMessages.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')}
    
    Rate 0-1 the current conversation quality and provide:
    1. Overall quality score
    2. Any immediate alerts (user disengagement, confusion, resistance)
    3. Quick suggestions for improvement
    
    Return JSON: {
      "quality": 0.75,
      "alerts": ["User seems confused about measurable criteria"],
      "suggestions": ["Ask for specific numbers or metrics", "Provide concrete examples"]
    }
    `;

    try {
      const response = await this.callOpenAI(prompt, 200);
      return JSON.parse(response);
    } catch (error) {
      console.error('Quick quality check failed:', error);
      return {
        quality: 0.5,
        alerts: ['Quality check system unavailable'],
        suggestions: ['Continue with standard conversation flow']
      };
    }
  }

  /**
   * Batch evaluate multiple conversations for testing
   */
  async batchEvaluate(conversations: ConversationData[]): Promise<AIJudgeResponse[]> {
    console.log(`🔄 Batch evaluating ${conversations.length} conversations...`);
    
    const results: AIJudgeResponse[] = [];
    
    // Process in batches of 3 to avoid rate limiting
    for (let i = 0; i < conversations.length; i += 3) {
      const batch = conversations.slice(i, i + 3);
      const batchPromises = batch.map(conv => this.evaluateConversation(conv));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Brief pause between batches
        if (i + 3 < conversations.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Batch ${Math.floor(i/3) + 1} failed:`, error);
        // Continue with remaining batches
      }
    }
    
    console.log(`✅ Batch evaluation complete: ${results.length}/${conversations.length} successful`);
    return results;
  }

  /**
   * Generate conversation improvement suggestions
   */
  async generateImprovementSuggestions(
    conversationData: ConversationData,
    currentMetrics: ConversationQualityMetrics
  ): Promise<string[]> {
    
    const prompt = `
    IMPROVEMENT ANALYSIS for PersonalEA conversation:
    
    Current Quality Scores:
    - Goal Improvement: ${currentMetrics.goalImprovement}
    - Naturalness: ${currentMetrics.conversationNaturalness}
    - User Satisfaction: ${currentMetrics.userSatisfactionPrediction}
    - SMART Fulfillment: ${currentMetrics.smartCriteriaFulfillment}
    
    Conversation Pattern:
    Original: "${conversationData.originalGoal}"
    Final: "${conversationData.finalGoal.title}"
    
    Key Issues Identified:
    ${currentMetrics.reasoning}
    
    Provide 5 specific, actionable improvements for future similar conversations:
    
    Return as JSON array: ["suggestion 1", "suggestion 2", ...]
    `;

    try {
      const response = await this.callOpenAI(prompt, 300);
      return JSON.parse(response);
    } catch (error) {
      console.error('Improvement suggestions failed:', error);
      return [
        'Continue monitoring conversation engagement',
        'Ask more clarifying questions',
        'Provide specific examples for SMART criteria',
        'Acknowledge user input more frequently',
        'Focus on one SMART criterion at a time'
      ];
    }
  }

  /**
   * Construct the full evaluation prompt
   */
  private constructEvaluationPrompt(conversationData: ConversationData): string {
    const messageHistory = conversationData.messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `
    ${this.judgmentPromptTemplate}
    
    CONVERSATION TO EVALUATE:
    ========================
    
    Original Goal: "${conversationData.originalGoal}"
    
    Final Goal Generated:
    Title: "${conversationData.finalGoal.title}"
    Confidence: ${conversationData.finalGoal.confidence}
    
    Complete Conversation:
    ${messageHistory}
    
    Conversation Context:
    - Total messages: ${conversationData.messages.length}
    - Session duration: ${conversationData.context?.sessionDuration || 'unknown'} minutes
    - Components covered: ${conversationData.context?.componentsCovered?.join(', ') || 'unknown'}
    
    User Profile:
    ${conversationData.userProfile ? JSON.stringify(conversationData.userProfile, null, 2) : 'Not provided'}
    
    PROVIDE YOUR DETAILED EVALUATION:
    `;
  }

  /**
   * Build the core judgment prompt template
   */
  private buildJudgmentPrompt(): string {
    return `
    You are an expert AI conversation judge for PersonalEA, a goal refinement system. Your job is to evaluate how well AI-human conversations help users improve their goals according to SMART criteria.

    EVALUATION FRAMEWORK:
    
    1. GOAL IMPROVEMENT (0-1): How much better is the final goal vs original?
       - 0.9-1.0: Dramatically clearer, specific, actionable
       - 0.7-0.8: Significantly improved with clear direction
       - 0.5-0.6: Moderate improvement, some clarity gained
       - 0.3-0.4: Minor improvement, still vague
       - 0.0-0.2: No meaningful improvement or worse

    2. CONVERSATION NATURALNESS (0-1): How natural and engaging was the flow?
       - 0.9-1.0: Smooth, natural, feels like talking to expert coach
       - 0.7-0.8: Good flow with minor awkward moments
       - 0.5-0.6: Acceptable but somewhat robotic
       - 0.3-0.4: Awkward, forced, or confusing
       - 0.0-0.2: Very poor conversational flow

    3. USER SATISFACTION PREDICTION (0-1): Would the user feel satisfied?
       - 0.9-1.0: User likely delighted with outcome and process
       - 0.7-0.8: User satisfied, would recommend to others
       - 0.5-0.6: User okay with result, neutral experience
       - 0.3-0.4: User somewhat disappointed
       - 0.0-0.2: User frustrated or unsatisfied

    4. SMART CRITERIA FULFILLMENT (0-1): How well does final goal meet SMART?
       - 0.9-1.0: Excellent SMART goal, ready for action
       - 0.7-0.8: Good SMART goal, minor gaps
       - 0.5-0.6: Decent attempt, some SMART elements
       - 0.3-0.4: Poor SMART implementation
       - 0.0-0.2: Not SMART at all

    RESPONSE FORMAT - Return ONLY valid JSON:
    {
      "metrics": {
        "goalImprovement": 0.85,
        "conversationNaturalness": 0.78,
        "userSatisfactionPrediction": 0.82,
        "smartCriteriaFulfillment": 0.71,
        "breakdown": {
          "specific": {"score": 0.8, "improvement": 0.9, "reasoning": "Goal became much more specific...", "evidence": ["User said: ..."]},
          "measurable": {"score": 0.7, "improvement": 0.6, "reasoning": "Some metrics added...", "evidence": ["Assistant asked for numbers..."]},
          "achievable": {"score": 0.8, "improvement": 0.7, "reasoning": "Realistic scope established...", "evidence": ["User agreed to timeline..."]},
          "relevant": {"score": 0.9, "improvement": 0.8, "reasoning": "Strong personal connection...", "evidence": ["User expressed passion..."]},
          "timeBound": {"score": 0.6, "improvement": 0.8, "reasoning": "Timeline added but could be more specific...", "evidence": ["6 months mentioned..."]}
        },
        "confidence": 0.85,
        "reasoning": "Overall strong conversation with good user engagement. Goal improved significantly from vague to actionable. Main weakness was measurable criteria could be more specific.",
        "timestamp": "${new Date().toISOString()}",
        "conversationLength": 0,
        "engagementLevel": 0.8,
        "insightGeneration": 0.7,
        "resistanceHandling": 0.6,
        "actionabilityScore": 0.8
      },
      "recommendations": {
        "whatWorkedWell": ["Natural conversation flow", "Good clarifying questions", "User felt heard"],
        "areasForImprovement": ["More specific metrics needed", "Timeline could be clearer"],
        "suggestedOptimizations": ["Ask for specific numbers earlier", "Provide metric examples"]
      },
      "conversationPatterns": {
        "strongPatterns": ["Collaborative questioning", "Building on user input", "Acknowledging concerns"],
        "weakPatterns": ["Rushing through measurable criteria", "Not confirming understanding"]
      },
      "predictedOutcome": {
        "goalAchievementLikelihood": 0.75,
        "followUpNeeded": true,
        "riskFactors": ["Timeline might be too aggressive", "Metrics not clearly defined"]
      }
    }
    `;
  }

  /**
   * Call OpenAI API with conversation evaluation prompt
   */
  private async callOpenAI(prompt: string, maxTokens: number = 1000): Promise<string> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert conversation quality judge. Always return valid JSON in the exact format specified.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Parse and validate the AI judge response
   */
  private parseJudgeResponse(response: string): AIJudgeResponse {
    try {
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (!parsed.metrics || !parsed.recommendations) {
        throw new Error('Missing required fields in judge response');
      }

      // Set conversation length from context if available
      if (parsed.metrics) {
        parsed.metrics.timestamp = new Date();
      }

      return parsed as AIJudgeResponse;
      
    } catch (error) {
      console.error('Failed to parse judge response:', error);
      console.error('Raw response:', response);
      throw new Error(`Invalid judge response format: ${error.message}`);
    }
  }
}