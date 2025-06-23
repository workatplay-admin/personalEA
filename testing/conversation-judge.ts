import axios from 'axios';

export interface ConversationQualityMetrics {
  goalImprovement: number;          // 0-1 score
  conversationNaturalness: number;  // 0-1 score  
  userSatisfactionPrediction: number; // 0-1 score
  smartCriteriaFulfillment: number;   // 0-1 score
  overallScore?: number;              // Computed average
  reasoning?: {
    goalImprovement: string;
    conversationNaturalness: string;
    userSatisfactionPrediction: string;
    smartCriteriaFulfillment: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface Goal {
  title: string;
  description?: string;
  specific?: string;
  measurable?: string;
  achievable?: string;
  relevant?: string;
  timeBound?: string;
}

export class AIConversationJudge {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string = 'http://localhost:3002/api/v1/orchestrate', apiKey?: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  async evaluateConversation(
    originalGoal: string,
    conversationHistory: ChatMessage[],
    finalGoal: Goal
  ): Promise<ConversationQualityMetrics> {
    
    const prompt = `
    Evaluate this goal improvement conversation:
    
    Original: "${originalGoal}"
    Final Goal: "${finalGoal.title}"
    ${finalGoal.description ? `Description: "${finalGoal.description}"` : ''}
    
    SMART Criteria:
    - Specific: ${finalGoal.specific || 'Not defined'}
    - Measurable: ${finalGoal.measurable || 'Not defined'}
    - Achievable: ${finalGoal.achievable || 'Not defined'}
    - Relevant: ${finalGoal.relevant || 'Not defined'}
    - Time-bound: ${finalGoal.timeBound || 'Not defined'}
    
    Conversation History:
    ${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
    
    Rate 0-1 on:
    1. Goal Improvement: How much better is the final vs original?
    2. Conversation Quality: Natural, helpful, engaging?  
    3. User Experience: Would user feel satisfied?
    4. SMART Fulfillment: Does final goal meet SMART criteria?
    
    Return JSON with scores and detailed reasoning for each score.
    Format:
    {
      "goalImprovement": 0.8,
      "conversationNaturalness": 0.9,
      "userSatisfactionPrediction": 0.85,
      "smartCriteriaFulfillment": 0.7,
      "reasoning": {
        "goalImprovement": "The final goal is significantly more specific...",
        "conversationNaturalness": "The conversation flowed naturally...",
        "userSatisfactionPrediction": "User would likely feel guided...",
        "smartCriteriaFulfillment": "4 out of 5 SMART criteria are well-defined..."
      }
    }
    `;
    
    try {
      const response = await this.callJudgeAI(prompt);
      const metrics = this.parseJudgeResponse(response);
      metrics.overallScore = this.calculateOverallScore(metrics);
      return metrics;
    } catch (error) {
      console.error('Error evaluating conversation:', error);
      throw error;
    }
  }

  private async callJudgeAI(prompt: string): Promise<any> {
    try {
      const response = await axios.post(this.apiUrl, {
        conversationId: `judge-${Date.now()}`,
        userInput: prompt,
        context: {
          messages: [],
          data: {},
          profile: { role: 'ai_judge' }
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data || error.message);
      }
      throw error;
    }
  }

  private parseJudgeResponse(response: any): ConversationQualityMetrics {
    try {
      if (response.message) {
        const jsonMatch = response.message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            goalImprovement: Math.max(0, Math.min(1, parsed.goalImprovement || 0)),
            conversationNaturalness: Math.max(0, Math.min(1, parsed.conversationNaturalness || 0)),
            userSatisfactionPrediction: Math.max(0, Math.min(1, parsed.userSatisfactionPrediction || 0)),
            smartCriteriaFulfillment: Math.max(0, Math.min(1, parsed.smartCriteriaFulfillment || 0)),
            reasoning: parsed.reasoning
          };
        }
      }
    } catch (error) {
      console.error('Error parsing judge response:', error);
    }

    return {
      goalImprovement: 0.5,
      conversationNaturalness: 0.5,
      userSatisfactionPrediction: 0.5,
      smartCriteriaFulfillment: 0.5,
      reasoning: {
        goalImprovement: "Unable to parse AI response",
        conversationNaturalness: "Unable to parse AI response",
        userSatisfactionPrediction: "Unable to parse AI response",
        smartCriteriaFulfillment: "Unable to parse AI response"
      }
    };
  }

  private calculateOverallScore(metrics: ConversationQualityMetrics): number {
    const scores = [
      metrics.goalImprovement,
      metrics.conversationNaturalness,
      metrics.userSatisfactionPrediction,
      metrics.smartCriteriaFulfillment
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  async generateDetailedReport(
    originalGoal: string,
    conversationHistory: ChatMessage[],
    finalGoal: Goal,
    metrics: ConversationQualityMetrics
  ): Promise<string> {
    const report = `
# AI Conversation Quality Report

## Summary
- **Original Goal**: "${originalGoal}"
- **Final Goal**: "${finalGoal.title}"
- **Overall Score**: ${(metrics.overallScore! * 100).toFixed(1)}%

## Detailed Metrics

### Goal Improvement: ${(metrics.goalImprovement * 100).toFixed(1)}%
${metrics.reasoning?.goalImprovement || 'No detailed reasoning available'}

### Conversation Naturalness: ${(metrics.conversationNaturalness * 100).toFixed(1)}%
${metrics.reasoning?.conversationNaturalness || 'No detailed reasoning available'}

### User Satisfaction Prediction: ${(metrics.userSatisfactionPrediction * 100).toFixed(1)}%
${metrics.reasoning?.userSatisfactionPrediction || 'No detailed reasoning available'}

### SMART Criteria Fulfillment: ${(metrics.smartCriteriaFulfillment * 100).toFixed(1)}%
${metrics.reasoning?.smartCriteriaFulfillment || 'No detailed reasoning available'}

## Conversation Analysis
- **Total Messages**: ${conversationHistory.length}
- **User Messages**: ${conversationHistory.filter(m => m.role === 'user').length}
- **Assistant Messages**: ${conversationHistory.filter(m => m.role === 'assistant').length}

## Recommendation
${this.generateRecommendation(metrics)}
`;

    return report;
  }

  private generateRecommendation(metrics: ConversationQualityMetrics): string {
    const overallScore = metrics.overallScore || 0;
    
    if (overallScore >= 0.8) {
      return "Excellent conversation quality. The AI successfully guided the user to a well-defined SMART goal.";
    } else if (overallScore >= 0.6) {
      return "Good conversation quality with room for improvement. Consider enhancing the weakest scoring areas.";
    } else if (overallScore >= 0.4) {
      return "Moderate conversation quality. Significant improvements needed in goal refinement and user engagement.";
    } else {
      return "Poor conversation quality. Major overhaul needed in conversation flow and goal improvement process.";
    }
  }
}