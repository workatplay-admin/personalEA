/**
 * Enhanced Conversational State Manager Service
 * 
 * Implements adaptive conversation flow with natural language processing,
 * user profiling, and intelligent state transitions for goal refinement.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { ConversationMessage } from '../types/smart-goals';

// Enhanced conversation state with adaptive features
const EnhancedConversationStateSchema = z.object({
  phase: z.object({
    current: z.enum(['discovery', 'refinement', 'validation', 'complete']),
    subPhase: z.string().optional(),
    confidence: z.number().min(0).max(100),
    transitionReason: z.string().optional(),
    naturalFlow: z.boolean().default(true)
  }),
  
  userContext: z.object({
    goalType: z.enum(['career', 'health', 'learning', 'financial', 'personal', 'other']).optional(),
    goalClarity: z.number().min(0).max(10),
    inputQuality: z.object({
      specificity: z.number().min(0).max(100),
      completeness: z.number().min(0).max(100),
      coherence: z.number().min(0).max(100)
    }),
    emotionalState: z.enum(['engaged', 'neutral', 'confused', 'frustrated', 'excited']).optional()
  }),
  
  adaptiveProfile: z.object({
    communicationStyle: z.object({
      verbosity: z.enum(['brief', 'balanced', 'detailed']),
      formality: z.enum(['casual', 'professional', 'friendly']),
      technicality: z.enum(['simple', 'moderate', 'technical'])
    }),
    learningStyle: z.enum(['examples', 'concepts', 'step-by-step', 'visual']),
    responsePreferences: z.object({
      prefersOptions: z.boolean(),
      likesExamples: z.boolean(),
      wantsExplanations: z.boolean(),
      appreciatesHumor: z.boolean()
    }),
    interactionPatterns: z.object({
      avgResponseTime: z.number().optional(),
      questionsAsked: z.number().default(0),
      clarificationsNeeded: z.number().default(0),
      topicChanges: z.number().default(0)
    })
  }),
  
  conversationFlow: z.object({
    momentum: z.enum(['building', 'steady', 'slowing', 'stalled']),
    naturalness: z.number().min(0).max(100),
    topicCoherence: z.number().min(0).max(100),
    progressionRate: z.enum(['fast', 'moderate', 'slow']),
    userSatisfaction: z.number().min(0).max(100).optional()
  }),
  
  intelligentGuidance: z.object({
    nextBestAction: z.object({
      type: z.enum(['clarify', 'explore', 'validate', 'encourage', 'simplify', 'example', 'summarize']),
      component: z.string().optional(),
      rationale: z.string(),
      alternativeActions: z.array(z.string())
    }),
    
    suggestedPrompts: z.array(z.object({
      prompt: z.string(),
      purpose: z.string(),
      expectedOutcome: z.string(),
      adaptationLevel: z.enum(['none', 'style', 'full'])
    })),
    
    recoveryStrategies: z.array(z.object({
      trigger: z.string(),
      strategy: z.enum(['rephrase', 'simplify', 'example', 'options', 'skip']),
      implementation: z.string()
    }))
  }),
  
  componentProgress: z.object({
    priorities: z.array(z.string()),
    completed: z.array(z.string()),
    inProgress: z.string().optional(),
    confidenceScores: z.record(z.string(), z.number()),
    qualityScores: z.record(z.string(), z.number())
  }),
  
  dynamicContent: z.object({
    personalizedGreeting: z.string(),
    contextualTransitions: z.array(z.string()),
    encouragementMessages: z.array(z.string()),
    progressAcknowledgments: z.array(z.string())
  })
});

type EnhancedConversationState = z.infer<typeof EnhancedConversationStateSchema>;

export class EnhancedConversationalStateManager {
  private openai: OpenAI;
  private stateCache: Map<string, EnhancedConversationState> = new Map();
  private userProfiles: Map<string, any> = new Map();
  
  // Question variation bank for natural language
  private questionBank = {
    specific: [
      "What exactly do you want to accomplish?",
      "Can you describe what success looks like for this goal?",
      "What specific outcome are you aiming for?",
      "Let's get clear on what you want to achieve - can you paint me a picture?",
      "What would 'done' look like for this goal?",
      "Tell me more about what you have in mind.",
      "What's the end result you're hoping for?"
    ],
    measurable: [
      "How will you track your progress?",
      "What numbers or milestones will show you're succeeding?",
      "How will you measure whether you've achieved this?",
      "What metrics make sense for tracking this goal?",
      "What evidence will show you've succeeded?",
      "How will you know when you've made progress?",
      "What indicators will tell you you're on the right track?"
    ],
    achievable: [
      "What resources do you have to help you succeed?",
      "What might make this challenging, and how can we plan for that?",
      "Do you feel this goal is realistic given your current situation?",
      "What support or tools will you need?",
      "Let's think about feasibility - what helps and what hinders?",
      "What's already in place to support this goal?",
      "Are there any obstacles we should plan around?"
    ],
    relevant: [
      "Why is this goal important to you right now?",
      "How does this fit with your bigger picture?",
      "What makes this the right goal for you?",
      "How will achieving this impact your life?",
      "What's driving you to pursue this goal?",
      "Tell me about why this matters to you.",
      "How does this align with your values or priorities?"
    ],
    timeBound: [
      "When would you like to achieve this by?",
      "What's your target timeline?",
      "Do you have a deadline in mind?",
      "How long do you think this will take?",
      "Let's set a target date - when makes sense?",
      "What timeframe are you working with?",
      "When do you need to see results?"
    ]
  };
  
  // Confusion recovery templates
  private confusionRecovery = {
    detection: [
      /i don'?t (understand|know|get it)/i,
      /what do you mean/i,
      /confused/i,
      /not sure what/i,
      /can you explain/i,
      /huh\??/i,
      /\?\?+/,
      /that doesn'?t make sense/i
    ],
    
    responses: {
      rephrase: [
        "Let me ask that differently: {rephrased}",
        "Another way to think about it: {rephrased}",
        "In other words: {rephrased}",
        "Let me try again: {rephrased}"
      ],
      example: [
        "Here's an example: {example}. Does something similar work for you?",
        "For instance: {example}. How might this apply to your situation?",
        "Think of it like: {example}. Does that help clarify?"
      ],
      simplify: [
        "Let's simplify: {simplified}",
        "Breaking it down: {simplified}",
        "The basic idea is: {simplified}",
        "Simply put: {simplified}"
      ],
      options: [
        "Would any of these fit:\n{options}",
        "Here are some possibilities:\n{options}",
        "Maybe one of these:\n{options}",
        "Common approaches include:\n{options}"
      ]
    }
  };

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeConversation(
    fullHistory: ConversationMessage[],
    latestInput: string,
    currentGoalState?: any,
    userId?: string
  ): Promise<EnhancedConversationState> {
    const systemPrompt = `You are an expert conversational AI specializing in natural, adaptive goal-setting dialogues.
You analyze conversations to provide intelligent guidance while maintaining a natural, human-like flow.

Your capabilities:
1. Detect user communication patterns and adapt accordingly
2. Identify emotional states and respond appropriately  
3. Determine optimal conversation flow and transitions
4. Generate personalized, contextual responses
5. Recognize confusion or frustration and provide recovery strategies
6. Prioritize SMART components based on goal type and context

Always aim for natural, engaging conversation that feels helpful rather than robotic.`;

    const userPrompt = `Analyze this goal-setting conversation:

CONVERSATION HISTORY:
${fullHistory.map((msg, i) => `[${i}] ${msg.role}: ${msg.content}`).join('\n')}

LATEST INPUT: "${latestInput}"

${currentGoalState ? `CURRENT GOAL STATE:
${JSON.stringify(currentGoalState, null, 2)}` : 'NO GOAL STATE YET'}

Provide comprehensive analysis including:

1. CONVERSATION PHASE
   - Current phase (discovery/refinement/validation/complete)
   - Natural sub-phase if applicable
   - Confidence in phase determination
   - Whether to maintain natural flow vs structured approach

2. USER CONTEXT
   - Goal type and clarity level (0-10)
   - Input quality metrics
   - Detected emotional state

3. ADAPTIVE PROFILE
   - Communication style preferences
   - Learning style
   - Response preferences
   - Interaction patterns

4. CONVERSATION FLOW
   - Current momentum and naturalness
   - Topic coherence
   - Progression rate
   - Estimated user satisfaction

5. INTELLIGENT GUIDANCE
   - Next best action with rationale
   - 3-5 suggested prompts adapted to user style
   - Recovery strategies if confusion detected

6. COMPONENT PROGRESS
   - Priority order based on goal type
   - Completed components
   - Current focus
   - Quality and confidence scores

7. DYNAMIC CONTENT
   - Personalized greeting if starting
   - Natural transition phrases
   - Contextual encouragement
   - Progress acknowledgments

Focus on creating a natural, adaptive conversation that guides without feeling mechanical.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 3000
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from LLM');
      }

      const parsedResponse = JSON.parse(responseText);
      const validatedState = EnhancedConversationStateSchema.parse(parsedResponse);
      
      // Cache state and update user profile
      const conversationId = this.generateConversationId(fullHistory);
      this.stateCache.set(conversationId, validatedState);
      
      if (userId) {
        this.updateUserProfile(userId, validatedState.adaptiveProfile);
      }
      
      return validatedState;
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      throw new Error(`Failed to analyze conversation: ${error.message}`);
    }
  }

  async generateAdaptiveResponse(
    state: EnhancedConversationState,
    responseType: 'question' | 'clarification' | 'encouragement' | 'summary' | 'transition',
    context?: any
  ): Promise<{
    message: string,
    variations: string[],
    tone: string,
    adaptations: string[],
    followUpOptions?: string[]
  }> {
    const { adaptiveProfile, conversationFlow, componentProgress } = state;
    
    // Select appropriate question variation
    if (responseType === 'question' && componentProgress.inProgress) {
      const questions = this.questionBank[componentProgress.inProgress] || [];
      const randomIndex = Math.floor(Math.random() * questions.length);
      const baseQuestion = questions[randomIndex];
      
      // Adapt based on user profile
      const adaptedQuestion = await this.adaptQuestionToUser(
        baseQuestion,
        adaptiveProfile,
        context
      );
      
      return {
        message: adaptedQuestion,
        variations: questions.filter((_, i) => i !== randomIndex).slice(0, 2),
        tone: this.determineTone(adaptiveProfile, conversationFlow),
        adaptations: this.getAdaptations(adaptiveProfile),
        followUpOptions: this.generateFollowUpOptions(componentProgress.inProgress, context)
      };
    }
    
    // Generate other response types
    const prompt = `Generate a ${responseType} response for this conversation state:

STATE: ${JSON.stringify(state, null, 2)}
CONTEXT: ${JSON.stringify(context, null, 2)}

Create a response that:
1. Matches the user's communication style exactly
2. Maintains conversation naturalness
3. Advances the goal refinement process
4. Feels genuinely helpful and human

Include:
- Primary message
- 2-3 alternative variations
- Tone descriptor
- Adaptations applied
- Follow-up options if applicable`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You create natural, adaptive responses that feel genuinely helpful and human.' 
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8
      });

      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
      // Fallback response
      return {
        message: "Let's continue working on your goal. What would you like to focus on?",
        variations: ["How can I help you with your goal?", "What aspect should we explore next?"],
        tone: 'friendly',
        adaptations: ['maintained natural flow'],
        followUpOptions: ["Tell me more", "Give me an example", "Skip this for now"]
      };
    }
  }

  async detectAndRecoverFromConfusion(
    userInput: string,
    conversationContext: ConversationMessage[]
  ): Promise<{
    isConfused: boolean,
    confusionType: string,
    recoveryStrategy: string,
    recoveryMessage: string,
    alternativeApproaches: string[]
  }> {
    // Check for confusion patterns
    const isConfused = this.confusionRecovery.detection.some(pattern => 
      pattern.test(userInput)
    );
    
    if (!isConfused) {
      return {
        isConfused: false,
        confusionType: 'none',
        recoveryStrategy: 'continue',
        recoveryMessage: '',
        alternativeApproaches: []
      };
    }
    
    // Analyze confusion context
    const prompt = `User appears confused. Analyze and provide recovery strategy:

USER INPUT: "${userInput}"
RECENT CONTEXT: ${conversationContext.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

Determine:
1. Type of confusion (concept, question, process, technical)
2. Best recovery strategy (rephrase, example, simplify, options)
3. Specific recovery message
4. 2-3 alternative approaches

Focus on being helpful and maintaining user engagement.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at detecting confusion and providing clear, helpful recovery strategies.' 
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6
      });

      const response = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      return {
        isConfused: true,
        confusionType: response.confusionType || 'general',
        recoveryStrategy: response.strategy || 'rephrase',
        recoveryMessage: response.message || "Let me clarify that for you...",
        alternativeApproaches: response.alternatives || ["Let's try a different approach", "Here's an example"]
      };
    } catch (error) {
      // Fallback recovery
      return {
        isConfused: true,
        confusionType: 'general',
        recoveryStrategy: 'simplify',
        recoveryMessage: "I see you might be confused. Let me break this down more simply...",
        alternativeApproaches: [
          "Let's look at an example",
          "We can skip this for now",
          "Tell me what part is unclear"
        ]
      };
    }
  }

  private async adaptQuestionToUser(
    baseQuestion: string,
    profile: any,
    context?: any
  ): Promise<string> {
    const { communicationStyle, responsePreferences } = profile;
    
    let adapted = baseQuestion;
    
    // Adjust formality
    if (communicationStyle.formality === 'casual') {
      adapted = adapted.replace(/Would you like to/g, "Wanna")
                      .replace(/Can you/g, "Could you")
                      .replace(/\?$/, "? 😊");
    } else if (communicationStyle.formality === 'professional') {
      adapted = adapted.replace(/Wanna/g, "Would you like to")
                      .replace(/Let's/g, "Let us");
    }
    
    // Add examples if preferred
    if (responsePreferences.likesExamples && context?.examples) {
      adapted += `\n\nFor example: ${context.examples[0]}`;
    }
    
    // Adjust verbosity
    if (communicationStyle.verbosity === 'brief') {
      // Remove extra words
      adapted = adapted.replace(/Can you tell me more about/g, "What about")
                      .replace(/Would you mind sharing/g, "Share");
    } else if (communicationStyle.verbosity === 'detailed') {
      // Add context
      adapted = `${adapted}\n\nTake your time to think about this. The more detail you can provide, the better I can help you create a clear plan.`;
    }
    
    return adapted;
  }

  private determineTone(profile: any, flow: any): string {
    const { formality } = profile.communicationStyle;
    const { momentum, userSatisfaction } = flow;
    
    if (momentum === 'building' && userSatisfaction > 70) {
      return formality === 'casual' ? 'enthusiastic' : 'encouraging';
    } else if (momentum === 'slowing') {
      return 'supportive';
    } else {
      return formality === 'professional' ? 'professional' : 'friendly';
    }
  }

  private getAdaptations(profile: any): string[] {
    const adaptations = [];
    
    if (profile.communicationStyle.verbosity === 'brief') {
      adaptations.push('shortened for brevity');
    }
    if (profile.responsePreferences.likesExamples) {
      adaptations.push('included examples');
    }
    if (profile.communicationStyle.formality === 'casual') {
      adaptations.push('casual tone');
    }
    if (profile.learningStyle === 'step-by-step') {
      adaptations.push('structured approach');
    }
    
    return adaptations;
  }

  private generateFollowUpOptions(component: string, context?: any): string[] {
    const genericOptions = [
      "I need help with this",
      "Give me an example",
      "Skip for now"
    ];
    
    const componentSpecific = {
      specific: ["What kind of details do you need?", "Can you give me a template?"],
      measurable: ["What metrics make sense?", "How often should I track this?"],
      achievable: ["What resources do I need?", "What might stop me?"],
      relevant: ["Why does this matter to me?", "How does this fit my life?"],
      timeBound: ["What's a realistic timeline?", "Should I set milestones?"]
    };
    
    return [...(componentSpecific[component] || []), ...genericOptions].slice(0, 3);
  }

  private updateUserProfile(userId: string, newProfile: any): void {
    const existing = this.userProfiles.get(userId) || {};
    const updated = {
      ...existing,
      ...newProfile,
      lastUpdated: new Date().toISOString()
    };
    this.userProfiles.set(userId, updated);
  }

  private generateConversationId(history: ConversationMessage[]): string {
    const content = history.map(m => m.content).join('|');
    return Buffer.from(content).toString('base64').substring(0, 16);
  }

  clearCache(): void {
    this.stateCache.clear();
  }
  
  getUserProfile(userId: string): any {
    return this.userProfiles.get(userId);
  }
}