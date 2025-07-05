/**
 * Personalization Orchestrator
 * 
 * Coordinates all personalization services to provide a unified,
 * adaptive experience for diverse users.
 */

import { UserProfile, userProfileDetector } from './user-profile-detector';
import { personalizedExampleGenerator, PersonalizedExample } from './personalized-example-generator';
import { adaptiveUIManager, UIConfiguration, UIElement } from './adaptive-ui-manager';
import { SMARTGoalProcessor, RawGoalInput, GoalTranslationResult } from './smart-goal-processor';
import { logger } from '@/utils/logger';

export interface PersonalizationContext {
  sessionId: string;
  userId?: string;
  profile: UserProfile;
  uiConfig: UIConfiguration;
  interactionHistory: InteractionEvent[];
  preferences: UserPreferences;
}

export interface InteractionEvent {
  timestamp: Date;
  eventType: 'goal_input' | 'help_request' | 'example_used' | 'refinement' | 'completion';
  data: Record<string, any>;
}

export interface UserPreferences {
  savedExamples: string[];
  preferredDomains: string[];
  communicationPreferences: {
    emailReminders: boolean;
    progressTracking: boolean;
    tipsFrequency: 'never' | 'occasional' | 'frequent';
  };
}

export interface PersonalizedResponse {
  content: string;
  uiElements: UIElement[];
  examples: PersonalizedExample[];
  helpContent: {
    inline: string[];
    detailed?: string;
    videoUrl?: string;
  };
  nextSteps: {
    primary: string;
    alternatives: string[];
  };
  adaptations: {
    simplified: boolean;
    culturallyAdapted: boolean;
    accessibilityEnhanced: boolean;
  };
}

export class PersonalizationOrchestrator {
  private smartGoalProcessor: SMARTGoalProcessor;
  private contexts: Map<string, PersonalizationContext>;

  constructor() {
    this.smartGoalProcessor = new SMARTGoalProcessor();
    this.contexts = new Map();
  }

  /**
   * Initialize personalization for a new session
   */
  async initializeSession(
    sessionId: string,
    initialInput?: string,
    userId?: string
  ): Promise<PersonalizationContext> {
    logger.info('Initializing personalized session', {
      sessionId,
      hasInitialInput: !!initialInput,
      hasUserId: !!userId
    });

    // Detect initial profile
    const profile = await userProfileDetector.detectProfile(
      initialInput || '',
      [],
      userId ? await this.loadUserProfileHistory(userId) : undefined
    );

    // Generate UI configuration
    const uiConfig = adaptiveUIManager.generateUIConfiguration(profile);

    // Create context
    const context: PersonalizationContext = {
      sessionId,
      userId,
      profile,
      uiConfig,
      interactionHistory: [],
      preferences: userId ? await this.loadUserPreferences(userId) : this.getDefaultPreferences()
    };

    this.contexts.set(sessionId, context);

    logger.info('Personalization context created', {
      sessionId,
      expertiseLevel: profile.expertiseLevel,
      primaryDomain: profile.primaryDomain
    });

    return context;
  }

  /**
   * Process goal input with full personalization
   */
  async processPersonalizedGoal(
    sessionId: string,
    goalInput: RawGoalInput,
    userApiKey?: string
  ): Promise<{
    goalResult: GoalTranslationResult;
    personalization: PersonalizedResponse;
  }> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error('Session not initialized');
    }

    logger.info('Processing personalized goal', {
      sessionId,
      expertiseLevel: context.profile.expertiseLevel,
      domain: context.profile.primaryDomain
    });

    // Record interaction
    this.recordInteraction(context, 'goal_input', { goal: goalInput.goal });

    // Process goal with AI
    const goalResult = await this.smartGoalProcessor.translateGoal(goalInput, userApiKey);

    // Generate personalized response
    const personalization = await this.generatePersonalizedResponse(
      context,
      goalResult,
      'goal_translation'
    );

    // Update profile based on interaction
    await this.updateProfileFromInteraction(context, goalInput.goal, goalResult);

    return { goalResult, personalization };
  }

  /**
   * Generate personalized response based on context
   */
  private async generatePersonalizedResponse(
    context: PersonalizationContext,
    data: any,
    responseType: string
  ): Promise<PersonalizedResponse> {
    const profile = context.profile;

    // Generate examples
    const examples = personalizedExampleGenerator.generateExamples(profile, 3);

    // Create adaptive UI elements
    const uiElements: UIElement[] = [];

    // Add progress indicator
    uiElements.push(
      adaptiveUIManager.createAdaptiveElement(
        'progress',
        'Goal Creation Progress',
        profile,
        { value: 20, max: 100 }
      )
    );

    // Add primary action button
    uiElements.push(
      adaptiveUIManager.createAdaptiveElement(
        'button',
        this.getActionText('continue', profile),
        profile,
        { primary: true }
      )
    );

    // Generate help content
    const helpContent = this.generateHelpContent(responseType, profile);

    // Determine next steps
    const nextSteps = this.determineNextSteps(responseType, profile, data);

    // Build main content
    const content = this.buildResponseContent(responseType, profile, data);

    return {
      content,
      uiElements,
      examples,
      helpContent,
      nextSteps,
      adaptations: {
        simplified: profile.languageComplexity === 'basic',
        culturallyAdapted: !!profile.culturalContext.region,
        accessibilityEnhanced: Object.keys(profile.accessibilityNeeds).length > 0
      }
    };
  }

  /**
   * Get action text based on user profile
   */
  private getActionText(action: string, profile: UserProfile): string {
    const actionTexts = {
      'continue': {
        'beginner': 'Next Step →',
        'intermediate': 'Continue →',
        'advanced': 'Proceed',
        'expert': 'Next'
      },
      'analyze': {
        'beginner': 'Check My Goal',
        'intermediate': 'Analyze Goal',
        'advanced': 'Run Analysis',
        'expert': 'Analyze'
      },
      'refine': {
        'beginner': 'Make It Better',
        'intermediate': 'Refine Goal',
        'advanced': 'Optimize',
        'expert': 'Refine'
      }
    };

    return actionTexts[action]?.[profile.expertiseLevel] || action;
  }

  /**
   * Generate context-specific help content
   */
  private generateHelpContent(
    responseType: string,
    profile: UserProfile
  ): PersonalizedResponse['helpContent'] {
    const helpContent: PersonalizedResponse['helpContent'] = {
      inline: []
    };

    // Inline tips based on expertise
    if (profile.expertiseLevel === 'beginner') {
      helpContent.inline = [
        'Take your time - there\'s no rush',
        'Click on any example to use it as a starting point',
        'We\'ll guide you through each step'
      ];
    } else if (profile.expertiseLevel === 'intermediate') {
      helpContent.inline = [
        'Focus on what success looks like for you',
        'Consider breaking large goals into smaller ones'
      ];
    }

    // Domain-specific help
    if (profile.primaryDomain === 'health-fitness') {
      helpContent.inline.push('Include specific metrics like weight, time, or distance');
    } else if (profile.primaryDomain === 'business') {
      helpContent.inline.push('Think about measurable business outcomes');
    }

    // Detailed help for beginners
    if (profile.expertiseLevel === 'beginner' || profile.accessibilityNeeds.preferSimpleLanguage) {
      helpContent.detailed = this.getDetailedHelp(responseType, profile);
    }

    return helpContent;
  }

  /**
   * Get detailed help content
   */
  private getDetailedHelp(responseType: string, profile: UserProfile): string {
    const helpTemplates = {
      'goal_translation': {
        'beginner': `
          Let's break this down step by step:
          
          1. **What do you want to achieve?** - Be as clear as possible
          2. **How will you measure success?** - Think about numbers or specific outcomes
          3. **Is it realistic?** - Consider your current situation and resources
          4. **Why does it matter?** - Understanding your motivation helps
          5. **When do you want to achieve it?** - Having a deadline keeps you focused
          
          Don't worry if you can't answer all of these right away - we'll work through them together!
        `,
        'intermediate': `
          To create a SMART goal, consider:
          - Specific outcomes and deliverables
          - Quantifiable metrics for tracking progress
          - Resource requirements and constraints
          - Alignment with your broader objectives
          - Realistic timelines with milestones
        `
      }
    };

    return helpTemplates[responseType]?.[profile.expertiseLevel] || '';
  }

  /**
   * Determine next steps based on context
   */
  private determineNextSteps(
    responseType: string,
    profile: UserProfile,
    data: any
  ): PersonalizedResponse['nextSteps'] {
    const nextSteps: PersonalizedResponse['nextSteps'] = {
      primary: '',
      alternatives: []
    };

    if (responseType === 'goal_translation') {
      const goalResult = data as GoalTranslationResult;
      
      if (goalResult.confidence < 0.7) {
        nextSteps.primary = profile.expertiseLevel === 'beginner' 
          ? 'Let\'s improve your goal together'
          : 'Refine goal for better clarity';
        
        nextSteps.alternatives = [
          'See more examples',
          'Get help',
          'Start over'
        ];
      } else {
        nextSteps.primary = profile.expertiseLevel === 'beginner'
          ? 'Great! Let\'s add some details'
          : 'Continue to milestone planning';
        
        nextSteps.alternatives = [
          'Adjust timeline',
          'Add more specifics'
        ];
      }
    }

    return nextSteps;
  }

  /**
   * Build response content based on profile
   */
  private buildResponseContent(
    responseType: string,
    profile: UserProfile,
    data: any
  ): string {
    if (responseType === 'goal_translation') {
      const goalResult = data as GoalTranslationResult;
      
      // Beginner-friendly response
      if (profile.expertiseLevel === 'beginner') {
        if (goalResult.confidence < 0.5) {
          return `I can see you want to achieve something meaningful! Your goal "${goalResult.smartGoal}" is a great start. Let me help you make it even clearer and more achievable.`;
        } else if (goalResult.confidence < 0.8) {
          return `Good job! Your goal "${goalResult.smartGoal}" is taking shape nicely. Let's add a few more details to make it perfect.`;
        } else {
          return `Excellent! Your goal "${goalResult.smartGoal}" is clear and well-defined. You're ready for the next step!`;
        }
      }
      
      // Expert response
      else if (profile.expertiseLevel === 'expert') {
        return `Goal analyzed. Confidence: ${Math.round(goalResult.confidence * 100)}%. ${goalResult.missingCriteria.length > 0 ? `Missing criteria: ${goalResult.missingCriteria.join(', ')}` : 'All SMART criteria satisfied.'}`;
      }
      
      // Standard response
      else {
        return `Your goal has been analyzed: "${goalResult.smartGoal}". Overall confidence: ${Math.round(goalResult.confidence * 100)}%. ${goalResult.missingCriteria.length > 0 ? `Areas for improvement: ${goalResult.missingCriteria.join(', ')}.` : 'Looking good!'}`;
      }
    }

    return 'Processing your request...';
  }

  /**
   * Update user profile based on interactions
   */
  private async updateProfileFromInteraction(
    context: PersonalizationContext,
    input: string,
    result: GoalTranslationResult
  ): Promise<void> {
    // Detect domain from goal content
    const detectedDomain = await userProfileDetector.detectProfile(input, []).then(p => p.primaryDomain);
    
    // Update interaction history
    if (!context.profile.interactionHistory.commonGoalTypes.includes(detectedDomain)) {
      context.profile.interactionHistory.commonGoalTypes.push(detectedDomain);
    }
    
    // Update average confidence
    const currentAvg = context.profile.interactionHistory.averageConfidence;
    const sessionCount = context.profile.interactionHistory.sessionsCount;
    context.profile.interactionHistory.averageConfidence = 
      (currentAvg * sessionCount + result.confidence) / (sessionCount + 1);
    
    // Save if user is logged in
    if (context.userId) {
      await this.saveUserProfile(context.userId, context.profile);
    }
  }

  /**
   * Record interaction event
   */
  private recordInteraction(
    context: PersonalizationContext,
    eventType: InteractionEvent['eventType'],
    data: Record<string, any>
  ): void {
    const event: InteractionEvent = {
      timestamp: new Date(),
      eventType,
      data
    };
    
    context.interactionHistory.push(event);
    
    // Keep only last 50 events
    if (context.interactionHistory.length > 50) {
      context.interactionHistory = context.interactionHistory.slice(-50);
    }
  }

  /**
   * Handle help requests with personalization
   */
  async handleHelpRequest(
    sessionId: string,
    topic: string,
    context?: Record<string, any>
  ): Promise<PersonalizedResponse> {
    const sessionContext = this.contexts.get(sessionId);
    if (!sessionContext) {
      throw new Error('Session not initialized');
    }

    this.recordInteraction(sessionContext, 'help_request', { topic, context });

    const helpContent = adaptiveUIManager.generateHelpContent(topic, sessionContext.profile);
    
    return {
      content: helpContent.content,
      uiElements: [
        adaptiveUIManager.createAdaptiveElement(
          'modal',
          helpContent.title,
          sessionContext.profile,
          { content: helpContent.content }
        )
      ],
      examples: helpContent.examples ? 
        personalizedExampleGenerator.generateExamples(sessionContext.profile, 2) : [],
      helpContent: {
        inline: helpContent.tips || [],
        detailed: helpContent.content,
        videoUrl: helpContent.videoUrl
      },
      nextSteps: {
        primary: 'Got it',
        alternatives: ['Show me an example', 'Ask another question']
      },
      adaptations: {
        simplified: sessionContext.profile.languageComplexity === 'basic',
        culturallyAdapted: false,
        accessibilityEnhanced: true
      }
    };
  }

  /**
   * Generate onboarding experience
   */
  async generateOnboarding(sessionId: string): Promise<{
    steps: Array<any>;
    initialExamples: PersonalizedExample[];
    quickStartTemplates: Array<any>;
  }> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error('Session not initialized');
    }

    const steps = adaptiveUIManager.generateOnboardingFlow(context.profile);
    const initialExamples = personalizedExampleGenerator.generateExamples(context.profile, 4);
    const quickStartTemplates = personalizedExampleGenerator.generateQuickStartTemplates(context.profile);

    return {
      steps,
      initialExamples,
      quickStartTemplates
    };
  }

  /**
   * Load user profile history (mock implementation)
   */
  private async loadUserProfileHistory(userId: string): Promise<Partial<UserProfile>> {
    // In real implementation, this would load from database
    return {
      interactionHistory: {
        sessionsCount: 5,
        commonGoalTypes: ['technology', 'career'],
        averageConfidence: 0.75,
        preferredExamples: []
      }
    };
  }

  /**
   * Load user preferences (mock implementation)
   */
  private async loadUserPreferences(userId: string): Promise<UserPreferences> {
    // In real implementation, this would load from database
    return this.getDefaultPreferences();
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      savedExamples: [],
      preferredDomains: [],
      communicationPreferences: {
        emailReminders: true,
        progressTracking: true,
        tipsFrequency: 'occasional'
      }
    };
  }

  /**
   * Save user profile (mock implementation)
   */
  private async saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
    // In real implementation, this would save to database
    logger.info('Saving user profile', {
      userId,
      expertiseLevel: profile.expertiseLevel,
      primaryDomain: profile.primaryDomain
    });
  }
}

export const personalizationOrchestrator = new PersonalizationOrchestrator();