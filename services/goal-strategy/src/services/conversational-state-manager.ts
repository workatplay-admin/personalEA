import OpenAI from 'openai';
import { z } from 'zod';
import { ConversationMessage } from '../types/smart-goals';

const ConversationStateSchema = z.object({
  phase: z.object({
    current: z.enum(['greeting', 'initial_input', 'clarification', 'refinement', 'confirmation', 'planning', 'complete']),
    confidence: z.number().min(0).max(100),
    transitionReason: z.string().optional()
  }),
  informationGathered: z.object({
    goalStatement: z.string().optional(),
    smartCriteria: z.object({
      specific: z.array(z.string()),
      measurable: z.array(z.string()),
      achievable: z.array(z.string()),
      relevant: z.array(z.string()),
      timeBound: z.array(z.string())
    }),
    additionalContext: z.array(z.string())
  }),
  informationNeeded: z.array(z.object({
    category: z.string(),
    specifics: z.array(z.string()),
    priority: z.enum(['critical', 'important', 'nice_to_have']),
    suggestedQuestion: z.string()
  })),
  userProfile: z.object({
    communicationStyle: z.enum(['brief', 'detailed', 'technical', 'casual', 'formal']),
    domainExpertise: z.enum(['novice', 'intermediate', 'expert']),
    preferredPace: z.enum(['quick', 'moderate', 'thorough']),
    responsePatterns: z.object({
      averageLength: z.number(),
      usesExamples: z.boolean(),
      asksQuestions: z.boolean(),
      providesContext: z.boolean()
    })
  }),
  conversationDynamics: z.object({
    momentum: z.enum(['building', 'steady', 'slowing', 'stalled']),
    engagement: z.number().min(0).max(100),
    clarityTrend: z.enum(['improving', 'stable', 'declining']),
    frustrationIndicators: z.array(z.string())
  }),
  nextActions: z.array(z.object({
    action: z.enum(['ask_question', 'provide_summary', 'suggest_examples', 'confirm_understanding', 'move_to_planning', 'offer_help', 'change_approach']),
    priority: z.number(),
    rationale: z.string(),
    content: z.string().optional()
  })),
  uiRecommendations: z.object({
    primaryDisplay: z.enum(['chat', 'visual_progress', 'form_view', 'summary_card']),
    components: z.array(z.object({
      type: z.string(),
      props: z.record(z.any()),
      visibility: z.enum(['prominent', 'normal', 'subtle', 'hidden'])
    })),
    interactions: z.array(z.object({
      element: z.string(),
      enabled: z.boolean(),
      hint: z.string().optional()
    })),
    emphasis: z.object({
      highlightArea: z.string().optional(),
      focusMessage: z.string().optional(),
      animationType: z.enum(['none', 'subtle', 'attention']).optional()
    })
  }),
  metadata: z.object({
    conversationDuration: z.number(),
    turnCount: z.number(),
    lastActivityTimestamp: z.string(),
    stateVersion: z.number()
  })
});

type ConversationState = z.infer<typeof ConversationStateSchema>;

const UserProfileSchema = z.object({
  userId: z.string().optional(),
  preferences: z.object({
    verbosity: z.enum(['minimal', 'balanced', 'detailed']),
    examples: z.boolean(),
    technicalLevel: z.enum(['basic', 'intermediate', 'advanced'])
  }).optional(),
  history: z.object({
    goalsCreated: z.number(),
    avgCompletionRate: z.number(),
    commonDomains: z.array(z.string())
  }).optional()
});

type UserProfile = z.infer<typeof UserProfileSchema>;

export class ConversationalStateManager {
  private openai: OpenAI;
  private stateCache: Map<string, ConversationState> = new Map();

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async manageConversation(
    fullHistory: ConversationMessage[],
    latestInput: string,
    currentState?: Partial<ConversationState>,
    userProfile?: UserProfile
  ): Promise<ConversationState> {
    const systemPrompt = `You are a conversational AI state manager specializing in goal-setting dialogues.
You analyze conversation flow, user behavior, and information completeness to determine optimal next actions and UI configurations.
You adapt to user communication styles and maintain engaging, productive conversations.`;

    const userPrompt = `Analyze this goal-setting conversation and determine the current state:

CONVERSATION HISTORY:
${fullHistory.map((msg, i) => `[${i}] ${msg.role}: ${msg.content}`).join('\n')}

LATEST INPUT: "${latestInput}"

${currentState ? `PREVIOUS STATE:
${JSON.stringify(currentState, null, 2)}` : 'NO PREVIOUS STATE'}

${userProfile ? `USER PROFILE:
${JSON.stringify(userProfile, null, 2)}` : 'NO USER PROFILE'}

Determine:

1. CONVERSATION PHASE
   - Current phase with confidence
   - Reason for phase determination
   - Any phase transition

2. INFORMATION STATUS
   - What has been gathered (organized by SMART criteria)
   - What's still needed (prioritized)
   - Quality of information received

3. USER PROFILE ANALYSIS
   - Communication style and preferences
   - Domain expertise level
   - Engagement patterns
   - Response characteristics

4. CONVERSATION DYNAMICS
   - Momentum and engagement levels
   - Clarity trends
   - Any frustration indicators

5. NEXT ACTIONS
   - Prioritized list of possible actions
   - Specific content for each action
   - Rationale for recommendations

6. UI RECOMMENDATIONS
   - Best primary display mode
   - Components to show/hide
   - Interaction states
   - Visual emphasis areas

7. METADATA
   - Updated conversation metrics
   - State version tracking

Provide comprehensive analysis to guide the conversation effectively.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 2500
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from LLM');
      }

      const parsedResponse = JSON.parse(responseText);
      const validatedState = ConversationStateSchema.parse(parsedResponse);
      
      // Cache the state for quick retrieval
      const conversationId = this.generateConversationId(fullHistory);
      this.stateCache.set(conversationId, validatedState);
      
      return validatedState;
    } catch (error) {
      console.error('Error managing conversation state:', error);
      throw new Error(`Failed to manage conversation state: ${error.message}`);
    }
  }

  async generateContextualResponse(
    state: ConversationState,
    goalData: any,
    responseType: 'question' | 'summary' | 'confirmation' | 'guidance'
  ): Promise<{
    message: string,
    tone: string,
    includeVisuals: boolean,
    suggestedFollowUps: string[]
  }> {
    const responsePrompt = `Generate a contextual response for this conversation state:

STATE: ${JSON.stringify(state, null, 2)}
GOAL DATA: ${JSON.stringify(goalData, null, 2)}
RESPONSE TYPE: ${responseType}

Create a response that:
1. Matches the user's communication style
2. Advances the conversation appropriately
3. Maintains engagement
4. Is clear and actionable

Include:
- The main message
- Appropriate tone descriptor
- Whether to include visual elements
- 2-3 suggested follow-up options`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You craft engaging, contextual responses that guide users effectively through goal-setting conversations.' 
          },
          { role: 'user', content: responsePrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });

      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Error generating contextual response:', error);
      return {
        message: "Let's continue working on your goal. What aspect would you like to focus on?",
        tone: 'encouraging',
        includeVisuals: false,
        suggestedFollowUps: ["Tell me more about your timeline", "What resources do you have available?"]
      };
    }
  }

  async predictUserIntent(
    message: string,
    conversationContext: ConversationMessage[]
  ): Promise<{
    primaryIntent: string,
    confidence: number,
    secondaryIntents: string[],
    suggestedHandling: string
  }> {
    const intentPrompt = `Analyze user intent in this goal-setting context:

USER MESSAGE: "${message}"
RECENT CONTEXT: ${conversationContext.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

Identify:
1. Primary intent (e.g., 'provide_information', 'ask_question', 'express_confusion', 'request_help', 'confirm_understanding')
2. Confidence level
3. Any secondary intents
4. Best way to handle this intent

Consider goal-setting context and conversation flow.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at understanding user intent in conversational interfaces.' 
          },
          { role: 'user', content: intentPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4
      });

      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Error predicting user intent:', error);
      return {
        primaryIntent: 'unknown',
        confidence: 0,
        secondaryIntents: [],
        suggestedHandling: 'ask_for_clarification'
      };
    }
  }

  private generateConversationId(history: ConversationMessage[]): string {
    // Generate a unique ID based on conversation content
    const content = history.map(m => m.content).join('|');
    return Buffer.from(content).toString('base64').substring(0, 16);
  }

  clearCache(): void {
    this.stateCache.clear();
  }
}