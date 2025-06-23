import axios from 'axios';
import { AIConversationJudge, ChatMessage, Goal, ConversationQualityMetrics } from './conversation-judge';

export interface UserPersona {
  name: string;
  description: string;
  responsePatterns: string[];
  successCriteria: string[];
  initialGoalStyle: 'vague' | 'specific' | 'ambitious' | 'modest';
  engagementLevel: 'high' | 'medium' | 'low';
  clarificationNeeds: string[];
}

export interface JourneyResults {
  persona: UserPersona;
  initialGoal: string;
  finalGoal: Goal;
  conversation: ChatMessage[];
  metrics: ConversationQualityMetrics;
  duration: number;
  success: boolean;
  insights: string[];
}

export interface TestSession {
  id: string;
  persona: UserPersona;
  startTime: Date;
  apiUrl: string;
  apiKey: string;
}

export class PersonaTestRunner {
  private apiUrl: string;
  private apiKey: string;
  private judge: AIConversationJudge;

  constructor(apiUrl: string = 'http://localhost:3002/api/v1/chat/completions', apiKey?: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.judge = new AIConversationJudge(apiUrl, apiKey);
  }

  async runPersonaJourney(persona: UserPersona): Promise<JourneyResults> {
    const testSession: TestSession = {
      id: `test-${Date.now()}-${persona.name.replace(/\s+/g, '-').toLowerCase()}`,
      persona,
      startTime: new Date(),
      apiUrl: this.apiUrl,
      apiKey: this.apiKey
    };
    
    try {
      const initialGoal = await this.generatePersonaGoal(persona);
      
      const conversation = await this.simulateConversation(
        testSession,
        initialGoal, 
        persona.responsePatterns
      );
      
      const finalGoal = await this.extractFinalGoal(conversation);
      
      const evaluation = await this.evaluateJourneySuccess(
        initialGoal,
        conversation,
        finalGoal,
        persona.successCriteria
      );
      
      const duration = Date.now() - testSession.startTime.getTime();
      
      return {
        persona,
        initialGoal,
        finalGoal,
        conversation,
        metrics: evaluation.metrics,
        duration,
        success: evaluation.success,
        insights: evaluation.insights
      };
    } catch (error) {
      console.error(`Error running persona journey for ${persona.name}:`, error);
      throw error;
    }
  }

  private async generatePersonaGoal(persona: UserPersona): Promise<string> {
    const goalTemplates = {
      vague: [
        "I want to be more successful",
        "I need to improve my life",
        "I want to achieve something meaningful",
        "I should probably exercise more",
        "I want to learn new things"
      ],
      specific: [
        "I want to lose 20 pounds in 3 months",
        "I need to increase my sales by 30% this quarter",
        "I want to learn Python programming by December",
        "I need to save $5000 for vacation by next summer",
        "I want to run a 5K race in under 25 minutes"
      ],
      ambitious: [
        "I want to build a million-dollar business",
        "I want to become a world-class expert in my field",
        "I need to transform my entire lifestyle",
        "I want to write a bestselling book",
        "I want to revolutionize my industry"
      ],
      modest: [
        "I'd like to read more books",
        "I want to be a bit healthier",
        "I should probably save some money",
        "I want to spend more time with family",
        "I'd like to learn a new hobby"
      ]
    };

    const templates = goalTemplates[persona.initialGoalStyle];
    const baseGoal = templates[Math.floor(Math.random() * templates.length)];
    
    if (persona.name.includes("Entrepreneur")) {
      return baseGoal.replace(/I want to|I need to|I should/, "I want to") + " for my business";
    } else if (persona.name.includes("Student")) {
      return baseGoal + " while maintaining my studies";
    }
    
    return baseGoal;
  }

  private async simulateConversation(
    session: TestSession,
    initialGoal: string,
    responsePatterns: string[]
  ): Promise<ChatMessage[]> {
    const conversation: ChatMessage[] = [];
    let currentContext = initialGoal;
    
    conversation.push({
      role: 'user',
      content: initialGoal,
      timestamp: new Date()
    });

    const maxTurns = 10;
    let turnCount = 0;

    while (turnCount < maxTurns) {
      const assistantResponse = await this.getAssistantResponse(
        session,
        conversation,
        currentContext
      );
      
      conversation.push({
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date()
      });

      if (this.isConversationComplete(assistantResponse)) {
        break;
      }

      const userResponse = await this.generatePersonaResponse(
        session.persona,
        assistantResponse,
        responsePatterns,
        turnCount
      );

      conversation.push({
        role: 'user',
        content: userResponse,
        timestamp: new Date()
      });

      currentContext = userResponse;
      turnCount++;
    }

    return conversation;
  }

  private async getAssistantResponse(
    session: TestSession,
    conversation: ChatMessage[],
    currentContext: string
  ): Promise<string> {
    try {
      const response = await axios.post(this.apiUrl, {
        model: "gpt-3.5-turbo",
        messages: conversation.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error getting assistant response:', error);
      return "I understand you want to improve. Let's work together to make your goal more specific and actionable.";
    }
  }

  private async generatePersonaResponse(
    persona: UserPersona,
    assistantMessage: string,
    responsePatterns: string[],
    turnCount: number
  ): Promise<string> {
    const isQuestionInMessage = assistantMessage.includes('?');
    
    if (isQuestionInMessage) {
      if (persona.engagementLevel === 'low' && turnCount < 2) {
        return this.generateVagueResponse(persona);
      } else if (persona.engagementLevel === 'high') {
        return this.generateDetailedResponse(persona, assistantMessage);
      } else {
        return this.generateModerateResponse(persona, assistantMessage);
      }
    }
    
    return "That makes sense. What else should I consider?";
  }

  private generateVagueResponse(persona: UserPersona): string {
    const vagueResponses = [
      "I'm not really sure",
      "Maybe, I haven't thought about it much",
      "I don't know, what do you think?",
      "Can you help me figure that out?",
      "I guess so"
    ];
    
    return vagueResponses[Math.floor(Math.random() * vagueResponses.length)];
  }

  private generateDetailedResponse(persona: UserPersona, assistantMessage: string): string {
    if (assistantMessage.toLowerCase().includes('specific')) {
      return "I've been thinking about this for a while. Specifically, I want to achieve measurable results within the next 3-6 months. I'm willing to dedicate 2 hours daily to this goal.";
    } else if (assistantMessage.toLowerCase().includes('measurable')) {
      return "I'd like to track my progress weekly. I think quantifiable metrics would help me stay motivated. What specific measurements would you recommend?";
    } else if (assistantMessage.toLowerCase().includes('timeline')) {
      return "I'm thinking 3 months for initial results, with major milestones at 6 and 12 months. Does that seem realistic?";
    }
    
    return "Yes, I understand. I'm committed to making this work and I appreciate your guidance.";
  }

  private generateModerateResponse(persona: UserPersona, assistantMessage: string): string {
    const moderateResponses = [
      "That's a good point. I think I could do that.",
      "I see what you mean. Let me think about the specifics.",
      "Yes, I agree. How would you suggest I approach this?",
      "That sounds reasonable. What's the next step?"
    ];
    
    return moderateResponses[Math.floor(Math.random() * moderateResponses.length)];
  }

  private isConversationComplete(assistantResponse: string): boolean {
    const completionIndicators = [
      'goal is now well-defined',
      'SMART goal',
      'ready to start',
      'action plan',
      'next steps are clear',
      'goal is specific, measurable'
    ];
    
    const lowerResponse = assistantResponse.toLowerCase();
    return completionIndicators.some(indicator => lowerResponse.includes(indicator.toLowerCase()));
  }

  private async extractFinalGoal(conversation: ChatMessage[]): Promise<Goal> {
    const lastAssistantMessages = conversation
      .filter(msg => msg.role === 'assistant')
      .slice(-3)
      .map(msg => msg.content)
      .join(' ');

    const smartExtraction = this.extractSmartCriteria(lastAssistantMessages);

    return {
      title: this.extractGoalTitle(lastAssistantMessages) || "Undefined Goal",
      description: this.extractGoalDescription(lastAssistantMessages),
      ...smartExtraction
    };
  }

  private extractGoalTitle(text: string): string {
    const patterns = [
      /(?:final goal|refined goal|SMART goal):\s*"?([^".\n]+)"?/i,
      /(?:Your goal is to|The goal is to|Goal:)\s*"?([^".\n]+)"?/i,
      /(?:specific goal):\s*"?([^".\n]+)"?/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes('goal') && sentence.length < 100) {
        return sentence.trim();
      }
    }

    return "";
  }

  private extractGoalDescription(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const goalSentences = sentences.filter(s => 
      s.toLowerCase().includes('goal') || 
      s.toLowerCase().includes('achieve') ||
      s.toLowerCase().includes('accomplish')
    );
    
    return goalSentences.slice(0, 2).join('. ').trim();
  }

  private extractSmartCriteria(text: string): Partial<Goal> {
    const criteria: Partial<Goal> = {};
    
    const specificMatch = text.match(/(?:specific|specifically):\s*([^.\n]+)/i);
    if (specificMatch) criteria.specific = specificMatch[1].trim();

    const measurableMatch = text.match(/(?:measurable|measure):\s*([^.\n]+)/i);
    if (measurableMatch) criteria.measurable = measurableMatch[1].trim();

    const achievableMatch = text.match(/(?:achievable|realistic):\s*([^.\n]+)/i);
    if (achievableMatch) criteria.achievable = achievableMatch[1].trim();

    const relevantMatch = text.match(/(?:relevant|important):\s*([^.\n]+)/i);
    if (relevantMatch) criteria.relevant = relevantMatch[1].trim();

    const timeMatch = text.match(/(?:time-bound|timeline|deadline):\s*([^.\n]+)/i);
    if (timeMatch) criteria.timeBound = timeMatch[1].trim();

    return criteria;
  }

  private async evaluateJourneySuccess(
    initialGoal: string,
    conversation: ChatMessage[],
    finalGoal: Goal,
    successCriteria: string[]
  ): Promise<{ metrics: ConversationQualityMetrics; success: boolean; insights: string[] }> {
    const metrics = await this.judge.evaluateConversation(
      initialGoal,
      conversation,
      finalGoal
    );

    const insights: string[] = [];
    let criteriaMetCount = 0;

    for (const criterion of successCriteria) {
      const met = this.checkSuccessCriterion(criterion, finalGoal, conversation, metrics);
      if (met) {
        criteriaMetCount++;
        insights.push(`✓ Met: ${criterion}`);
      } else {
        insights.push(`✗ Not met: ${criterion}`);
      }
    }

    const success = (criteriaMetCount / successCriteria.length) >= 0.7 && 
                   (metrics.overallScore || 0) >= 0.7;

    if (metrics.overallScore && metrics.overallScore < 0.5) {
      insights.push("⚠️ Low overall conversation quality score");
    }

    if (conversation.length > 15) {
      insights.push("⚠️ Conversation was lengthy - consider more efficient guidance");
    }

    return { metrics, success, insights };
  }

  private checkSuccessCriterion(
    criterion: string,
    finalGoal: Goal,
    conversation: ChatMessage[],
    metrics: ConversationQualityMetrics
  ): boolean {
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('specific') && criterionLower.includes('metric')) {
      return !!finalGoal.measurable && finalGoal.measurable.length > 10;
    }

    if (criterionLower.includes('timeline') || criterionLower.includes('time')) {
      return !!finalGoal.timeBound && finalGoal.timeBound.length > 5;
    }

    if (criterionLower.includes('engagement')) {
      return metrics.conversationNaturalness > 0.7;
    }

    if (criterionLower.includes('clarity')) {
      return metrics.goalImprovement > 0.6;
    }

    return metrics.smartCriteriaFulfillment > 0.7;
  }

  async runBatchPersonaTests(personas: UserPersona[]): Promise<Map<string, JourneyResults>> {
    const results = new Map<string, JourneyResults>();
    
    for (const persona of personas) {
      console.log(`Running test for persona: ${persona.name}`);
      try {
        const result = await this.runPersonaJourney(persona);
        results.set(persona.name, result);
        console.log(`Completed test for ${persona.name} - Success: ${result.success}`);
      } catch (error) {
        console.error(`Failed test for ${persona.name}:`, error);
      }
    }
    
    return results;
  }

  generateBatchReport(results: Map<string, JourneyResults>): string {
    let report = "# Batch Persona Test Results\n\n";
    let totalSuccess = 0;
    let totalTests = 0;

    results.forEach((result, personaName) => {
      totalTests++;
      if (result.success) totalSuccess++;

      report += `## ${personaName}\n`;
      report += `- **Initial Goal**: "${result.initialGoal}"\n`;
      report += `- **Final Goal**: "${result.finalGoal.title}"\n`;
      report += `- **Success**: ${result.success ? '✅' : '❌'}\n`;
      report += `- **Overall Score**: ${((result.metrics.overallScore || 0) * 100).toFixed(1)}%\n`;
      report += `- **Conversation Length**: ${result.conversation.length} messages\n`;
      report += `- **Duration**: ${(result.duration / 1000).toFixed(1)}s\n`;
      report += `\n### Insights:\n`;
      result.insights.forEach(insight => {
        report += `- ${insight}\n`;
      });
      report += "\n---\n\n";
    });

    report += `## Summary\n`;
    report += `- **Total Tests**: ${totalTests}\n`;
    report += `- **Successful**: ${totalSuccess}\n`;
    report += `- **Success Rate**: ${((totalSuccess / totalTests) * 100).toFixed(1)}%\n`;

    return report;
  }
}