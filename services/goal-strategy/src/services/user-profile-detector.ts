/**
 * User Profile Detection Service
 * 
 * Automatically detects user characteristics to provide personalized experiences
 * for diverse user groups with different backgrounds and goal types.
 */

import { logger } from '@/utils/logger';

export interface UserProfile {
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  primaryDomain: string;
  communicationStyle: 'formal' | 'casual' | 'technical' | 'simple';
  languageComplexity: 'basic' | 'standard' | 'advanced';
  culturalContext: {
    region?: string;
    workCulture?: 'individual' | 'collaborative' | 'hierarchical';
    timeOrientation?: 'short-term' | 'long-term' | 'flexible';
  };
  accessibilityNeeds: {
    preferSimpleLanguage?: boolean;
    needsVisualCues?: boolean;
    preferAudioGuidance?: boolean;
    requiresHighContrast?: boolean;
  };
  goalPreferences: {
    preferredTimeframes: string[];
    motivationStyle: 'achievement' | 'growth' | 'social' | 'security';
    detailLevel: 'minimal' | 'moderate' | 'comprehensive';
  };
  interactionHistory: {
    sessionsCount: number;
    commonGoalTypes: string[];
    averageConfidence: number;
    preferredExamples: string[];
  };
}

export class UserProfileDetector {
  /**
   * Analyze user input to detect profile characteristics
   */
  async detectProfile(
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    previousProfile?: Partial<UserProfile>
  ): Promise<UserProfile> {
    logger.info('Detecting user profile', {
      inputLength: userInput.length,
      historyLength: conversationHistory.length,
      hasPreviousProfile: !!previousProfile
    });

    const expertiseLevel = this.detectExpertiseLevel(userInput, conversationHistory);
    const primaryDomain = this.detectPrimaryDomain(userInput, conversationHistory);
    const communicationStyle = this.detectCommunicationStyle(userInput, conversationHistory);
    const languageComplexity = this.detectLanguageComplexity(userInput);
    const culturalContext = this.detectCulturalContext(userInput, conversationHistory);
    const accessibilityNeeds = this.detectAccessibilityNeeds(userInput, conversationHistory);
    const goalPreferences = this.detectGoalPreferences(userInput, conversationHistory);

    const profile: UserProfile = {
      expertiseLevel,
      primaryDomain,
      communicationStyle,
      languageComplexity,
      culturalContext,
      accessibilityNeeds,
      goalPreferences,
      interactionHistory: previousProfile?.interactionHistory || {
        sessionsCount: 1,
        commonGoalTypes: [primaryDomain],
        averageConfidence: 0.5,
        preferredExamples: []
      }
    };

    logger.info('User profile detected', {
      expertiseLevel: profile.expertiseLevel,
      primaryDomain: profile.primaryDomain,
      communicationStyle: profile.communicationStyle
    });

    return profile;
  }

  /**
   * Detect user's expertise level based on language and goal complexity
   */
  private detectExpertiseLevel(
    input: string,
    history: Array<{ role: string; content: string }>
  ): UserProfile['expertiseLevel'] {
    const indicators = {
      beginner: {
        patterns: [
          /\b(help|how|what|don't know|confused|first time|new to|beginner|start)\b/i,
          /\b(simple|basic|easy|explain|guide me|show me|teach me)\b/i,
          /\?{2,}/, // Multiple question marks indicate uncertainty
        ],
        weight: 0
      },
      intermediate: {
        patterns: [
          /\b(improve|better|enhance|develop|progress|advance)\b/i,
          /\b(some experience|familiar with|worked with|done before)\b/i,
          /\d+\s*(months?|years?)\s*(experience|working|doing)/i,
        ],
        weight: 0
      },
      advanced: {
        patterns: [
          /\b(optimize|streamline|scale|integrate|automate|efficiency)\b/i,
          /\b(methodology|framework|strategy|systematic|process)\b/i,
          /\b(KPI|ROI|metric|benchmark|performance)\b/i,
        ],
        weight: 0
      },
      expert: {
        patterns: [
          /\b(innovative|cutting-edge|industry-leading|best practice|thought leader)\b/i,
          /\b(architecting|designing systems|strategic planning|transformation)\b/i,
          /\b(stakeholder|governance|compliance|enterprise|executive)\b/i,
        ],
        weight: 0
      }
    };

    // Check patterns in current input and history
    const allText = input + ' ' + history.map(h => h.content).join(' ');
    
    for (const [level, data] of Object.entries(indicators)) {
      for (const pattern of data.patterns) {
        if (pattern.test(allText)) {
          data.weight += 1;
        }
      }
    }

    // Additional heuristics
    const avgSentenceLength = allText.split(/[.!?]/).filter(s => s.trim()).map(s => s.split(' ').length).reduce((a, b) => a + b, 0) / Math.max(1, allText.split(/[.!?]/).length);
    
    if (avgSentenceLength < 10) indicators.beginner.weight += 0.5;
    else if (avgSentenceLength > 20) indicators.advanced.weight += 0.5;

    // Find level with highest weight
    let maxWeight = 0;
    let detectedLevel: UserProfile['expertiseLevel'] = 'intermediate';
    
    for (const [level, data] of Object.entries(indicators)) {
      if (data.weight > maxWeight) {
        maxWeight = data.weight;
        detectedLevel = level as UserProfile['expertiseLevel'];
      }
    }

    return detectedLevel;
  }

  /**
   * Detect primary domain/industry of user's goals
   */
  private detectPrimaryDomain(
    input: string,
    history: Array<{ role: string; content: string }>
  ): string {
    const domainPatterns = {
      'technology': /\b(software|programming|code|app|system|tech|IT|developer|engineer|data|AI|ML)\b/i,
      'business': /\b(business|company|revenue|sales|marketing|customer|profit|ROI|market|startup)\b/i,
      'health-fitness': /\b(health|fitness|weight|exercise|diet|nutrition|wellness|medical|workout|gym)\b/i,
      'education': /\b(learn|study|course|degree|certification|skill|education|training|university|school)\b/i,
      'finance': /\b(money|save|invest|budget|financial|income|expense|wealth|retirement|debt)\b/i,
      'career': /\b(job|career|promotion|professional|work|employment|position|role|salary)\b/i,
      'personal': /\b(personal|life|family|relationship|happiness|fulfillment|hobby|passion)\b/i,
      'creative': /\b(art|music|writing|creative|design|content|media|video|photography)\b/i,
      'sports': /\b(sport|athlete|competition|race|game|team|championship|training|performance)\b/i,
      'social-impact': /\b(volunteer|charity|community|social|environment|sustainability|cause|impact)\b/i,
    };

    const allText = input + ' ' + history.map(h => h.content).join(' ');
    const domainScores: Record<string, number> = {};

    for (const [domain, pattern] of Object.entries(domainPatterns)) {
      const matches = allText.match(new RegExp(pattern, 'gi')) || [];
      domainScores[domain] = matches.length;
    }

    // Find domain with highest score
    let maxScore = 0;
    let primaryDomain = 'general';
    
    for (const [domain, score] of Object.entries(domainScores)) {
      if (score > maxScore) {
        maxScore = score;
        primaryDomain = domain;
      }
    }

    return primaryDomain;
  }

  /**
   * Detect user's communication style
   */
  private detectCommunicationStyle(
    input: string,
    history: Array<{ role: string; content: string }>
  ): UserProfile['communicationStyle'] {
    const styleIndicators = {
      formal: {
        patterns: [
          /\b(regarding|furthermore|therefore|accordingly|pursuant)\b/i,
          /\b(objective|establish|implement|facilitate|coordinate)\b/i,
          /\b(Mr\.|Mrs\.|Ms\.|Dr\.|Professor)\b/,
        ],
        score: 0
      },
      casual: {
        patterns: [
          /\b(hey|hi|yeah|kinda|sorta|gonna|wanna|stuff)\b/i,
          /['']m|['']ll|['']re|['']ve|n['']t|['']d/i, // Contractions
          /!{2,}|:\)|;\)|:D|lol/i, // Multiple exclamations or emoticons
        ],
        score: 0
      },
      technical: {
        patterns: [
          /\b(API|SDK|framework|architecture|protocol|algorithm)\b/i,
          /\b(optimize|latency|throughput|scalability|deployment)\b/i,
          /\b(v\d+\.\d+|beta|alpha|release|version)\b/i,
        ],
        score: 0
      },
      simple: {
        patterns: [
          /\b(want|need|like|help|please|thank you)\b/i,
          /^[^.!?]{1,50}[.!?]$/m, // Short sentences
          /\b(good|bad|big|small|fast|slow)\b/i, // Basic descriptors
        ],
        score: 0
      }
    };

    const allText = input + ' ' + history.filter(h => h.role === 'user').map(h => h.content).join(' ');
    
    for (const [style, data] of Object.entries(styleIndicators)) {
      for (const pattern of data.patterns) {
        const matches = allText.match(new RegExp(pattern, 'g')) || [];
        data.score += matches.length;
      }
    }

    // Find style with highest score
    let maxScore = 0;
    let detectedStyle: UserProfile['communicationStyle'] = 'simple';
    
    for (const [style, data] of Object.entries(styleIndicators)) {
      if (data.score > maxScore) {
        maxScore = data.score;
        detectedStyle = style as UserProfile['communicationStyle'];
      }
    }

    return detectedStyle;
  }

  /**
   * Detect language complexity level
   */
  private detectLanguageComplexity(input: string): UserProfile['languageComplexity'] {
    const words = input.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentences = input.split(/[.!?]/).filter(s => s.trim());
    const avgSentenceLength = sentences.map(s => s.split(/\s+/).length).reduce((a, b) => a + b, 0) / Math.max(1, sentences.length);

    // Complex word detection (3+ syllables approximation)
    const complexWords = words.filter(word => {
      const vowelGroups = word.toLowerCase().match(/[aeiou]+/g) || [];
      return vowelGroups.length >= 3;
    }).length;
    const complexityRatio = complexWords / Math.max(1, words.length);

    if (avgWordLength < 4 && avgSentenceLength < 10 && complexityRatio < 0.1) {
      return 'basic';
    } else if (avgWordLength > 6 && avgSentenceLength > 20 && complexityRatio > 0.3) {
      return 'advanced';
    } else {
      return 'standard';
    }
  }

  /**
   * Detect cultural context indicators
   */
  private detectCulturalContext(
    input: string,
    history: Array<{ role: string; content: string }>
  ): UserProfile['culturalContext'] {
    const context: UserProfile['culturalContext'] = {};

    // Time orientation detection
    const timePatterns = {
      'short-term': /\b(quick|fast|immediate|urgent|asap|now|today|tomorrow|this week)\b/i,
      'long-term': /\b(years?|decade|future|eventually|long-term|career|retirement)\b/i,
      'flexible': /\b(whenever|flexible|no rush|eventually|someday|open-ended)\b/i,
    };

    const allText = input + ' ' + history.map(h => h.content).join(' ');
    let maxTimeMatches = 0;
    
    for (const [orientation, pattern] of Object.entries(timePatterns)) {
      const matches = allText.match(new RegExp(pattern, 'g')) || [];
      if (matches.length > maxTimeMatches) {
        maxTimeMatches = matches.length;
        context.timeOrientation = orientation as any;
      }
    }

    // Work culture detection
    if (/\b(team|collaborate|together|group|collective|our)\b/i.test(allText)) {
      context.workCulture = 'collaborative';
    } else if (/\b(boss|manager|approval|hierarchy|report to|supervisor)\b/i.test(allText)) {
      context.workCulture = 'hierarchical';
    } else if (/\b(independent|solo|myself|alone|individual|personal)\b/i.test(allText)) {
      context.workCulture = 'individual';
    }

    return context;
  }

  /**
   * Detect accessibility needs based on user patterns
   */
  private detectAccessibilityNeeds(
    input: string,
    history: Array<{ role: string; content: string }>
  ): UserProfile['accessibilityNeeds'] {
    const needs: UserProfile['accessibilityNeeds'] = {};

    const allText = input + ' ' + history.map(h => h.content).join(' ');

    // Simple language preference
    if (/\b(simple|plain|clear|easy|basic|explain|confused)\b/i.test(allText)) {
      needs.preferSimpleLanguage = true;
    }

    // Visual cues preference
    if (/\b(show|see|visual|example|diagram|picture|image)\b/i.test(allText)) {
      needs.needsVisualCues = true;
    }

    // Audio guidance preference
    if (/\b(tell|hear|listen|audio|speak|voice)\b/i.test(allText)) {
      needs.preferAudioGuidance = true;
    }

    return needs;
  }

  /**
   * Detect goal-setting preferences
   */
  private detectGoalPreferences(
    input: string,
    history: Array<{ role: string; content: string }>
  ): UserProfile['goalPreferences'] {
    const allText = input + ' ' + history.map(h => h.content).join(' ');

    // Timeframe preferences
    const timeframes: string[] = [];
    if (/\b(day|daily|today|tomorrow)\b/i.test(allText)) timeframes.push('daily');
    if (/\b(week|weekly)\b/i.test(allText)) timeframes.push('weekly');
    if (/\b(month|monthly)\b/i.test(allText)) timeframes.push('monthly');
    if (/\b(quarter|quarterly)\b/i.test(allText)) timeframes.push('quarterly');
    if (/\b(year|yearly|annual)\b/i.test(allText)) timeframes.push('yearly');

    // Motivation style
    let motivationStyle: UserProfile['goalPreferences']['motivationStyle'] = 'achievement';
    
    if (/\b(grow|learn|improve|develop|better|progress)\b/i.test(allText)) {
      motivationStyle = 'growth';
    } else if (/\b(team|help|community|together|social|people)\b/i.test(allText)) {
      motivationStyle = 'social';
    } else if (/\b(safe|secure|stable|reliable|consistent|maintain)\b/i.test(allText)) {
      motivationStyle = 'security';
    }

    // Detail level preference
    let detailLevel: UserProfile['goalPreferences']['detailLevel'] = 'moderate';
    
    const wordCount = allText.split(/\s+/).length;
    if (wordCount < 50) {
      detailLevel = 'minimal';
    } else if (wordCount > 200) {
      detailLevel = 'comprehensive';
    }

    return {
      preferredTimeframes: timeframes.length > 0 ? timeframes : ['monthly'],
      motivationStyle,
      detailLevel
    };
  }

  /**
   * Generate personalized guidance based on user profile
   */
  generatePersonalizedGuidance(profile: UserProfile, component: string): {
    message: string;
    examples: string[];
    tips: string[];
  } {
    const guidance = {
      message: '',
      examples: [] as string[],
      tips: [] as string[]
    };

    // Expertise-based messaging
    const expertiseMessages = {
      beginner: {
        prefix: "Let me help you with this step-by-step. ",
        suffix: " Don't worry if this seems complex - we'll work through it together!",
        style: "simple and encouraging"
      },
      intermediate: {
        prefix: "Based on your experience, ",
        suffix: " You're making good progress!",
        style: "balanced and supportive"
      },
      advanced: {
        prefix: "To optimize your approach, ",
        suffix: " Consider these strategic elements.",
        style: "detailed and analytical"
      },
      expert: {
        prefix: "For maximum impact, ",
        suffix: " Let's align this with best practices.",
        style: "sophisticated and strategic"
      }
    };

    const expertiseLevel = expertiseMessages[profile.expertiseLevel];
    
    // Domain-specific examples
    const domainExamples = this.getDomainSpecificExamples(profile.primaryDomain, component);
    guidance.examples = domainExamples;

    // Component-specific guidance
    const componentGuidance = this.getComponentGuidance(component, profile);
    guidance.message = expertiseLevel.prefix + componentGuidance + expertiseLevel.suffix;

    // Personalized tips based on preferences
    guidance.tips = this.getPersonalizedTips(profile, component);

    return guidance;
  }

  /**
   * Get domain-specific examples
   */
  private getDomainSpecificExamples(domain: string, component: string): string[] {
    const examples: Record<string, Record<string, string[]>> = {
      'technology': {
        'specific': [
          'Build a React Native mobile app with user authentication',
          'Implement a REST API with Node.js and Express',
          'Deploy a microservices architecture on AWS'
        ],
        'measurable': [
          'Achieve 99.9% uptime for the application',
          'Reduce API response time to under 200ms',
          'Increase test coverage to 80%'
        ],
        'timeBound': [
          'Complete MVP in 3 months',
          'Launch beta version by Q2 2024',
          'Finish code refactoring in 2 sprints'
        ]
      },
      'health-fitness': {
        'specific': [
          'Run a 5K race without stopping',
          'Complete a 12-week strength training program',
          'Follow a Mediterranean diet meal plan'
        ],
        'measurable': [
          'Lose 15 pounds of body weight',
          'Run 5K in under 30 minutes',
          'Exercise 4 times per week for 45 minutes'
        ],
        'timeBound': [
          'Reach goal weight by summer (June 1st)',
          'Complete first 5K race in 3 months',
          'Achieve fitness goals within 6 months'
        ]
      },
      'business': {
        'specific': [
          'Launch an e-commerce store for handmade jewelry',
          'Expand services to include social media management',
          'Open a second retail location in downtown'
        ],
        'measurable': [
          'Increase revenue by 25%',
          'Acquire 100 new customers',
          'Achieve $50,000 in monthly sales'
        ],
        'timeBound': [
          'Launch new product line by Q3',
          'Reach revenue target within fiscal year',
          'Open second location by December'
        ]
      },
      'education': {
        'specific': [
          'Complete Google Data Analytics Certificate',
          'Learn Python programming for data science',
          'Earn MBA from accredited university'
        ],
        'measurable': [
          'Complete 5 online courses',
          'Build 3 portfolio projects',
          'Maintain GPA of 3.5 or higher'
        ],
        'timeBound': [
          'Finish certification in 6 months',
          'Complete degree program in 2 years',
          'Learn new skill by end of quarter'
        ]
      }
    };

    return examples[domain]?.[component] || examples['technology'][component] || [
      'Define your specific goal clearly',
      'Add measurable metrics to track progress',
      'Set a realistic deadline'
    ];
  }

  /**
   * Get component-specific guidance based on profile
   */
  private getComponentGuidance(component: string, profile: UserProfile): string {
    const guidanceMap: Record<string, Record<string, string>> = {
      'specific': {
        'beginner': 'What exactly do you want to achieve? Think about the end result you\'re looking for.',
        'intermediate': 'Let\'s define the specific outcome you want. What will success look like?',
        'advanced': 'Define your objective with precision. What are the exact deliverables?',
        'expert': 'Articulate your strategic objective. What specific transformation are you targeting?'
      },
      'measurable': {
        'beginner': 'How will you know when you\'ve succeeded? What numbers or results can we track?',
        'intermediate': 'What metrics will indicate progress? Let\'s identify key measurements.',
        'advanced': 'Define your KPIs and success metrics. What quantifiable outcomes are you targeting?',
        'expert': 'Establish your measurement framework. What leading and lagging indicators will you track?'
      },
      'achievable': {
        'beginner': 'Is this goal realistic for you? What resources or skills do you have or need?',
        'intermediate': 'Let\'s assess feasibility. What challenges might you face and how will you overcome them?',
        'advanced': 'Evaluate resource requirements and constraints. What\'s your risk mitigation strategy?',
        'expert': 'Analyze feasibility within your strategic context. What\'s your competitive advantage?'
      },
      'relevant': {
        'beginner': 'Why is this goal important to you? How does it fit into your life?',
        'intermediate': 'How does this align with your broader objectives? What\'s the impact?',
        'advanced': 'Explain the strategic relevance. How does this drive value?',
        'expert': 'Articulate the strategic imperative. What\'s the ROI and opportunity cost?'
      },
      'timeBound': {
        'beginner': 'When would you like to achieve this? Let\'s set a target date.',
        'intermediate': 'What\'s your timeline? Consider milestones along the way.',
        'advanced': 'Define your project timeline with key milestones and dependencies.',
        'expert': 'Establish your strategic timeline with phase gates and decision points.'
      }
    };

    return guidanceMap[component]?.[profile.expertiseLevel] || 'Please provide more details about this aspect of your goal.';
  }

  /**
   * Get personalized tips based on user profile
   */
  private getPersonalizedTips(profile: UserProfile, component: string): string[] {
    const tips: string[] = [];

    // Expertise-based tips
    if (profile.expertiseLevel === 'beginner') {
      tips.push('Take it one step at a time - you don\'t need to have all the answers right away');
      tips.push('It\'s okay to start small and build up over time');
    } else if (profile.expertiseLevel === 'expert') {
      tips.push('Consider how this goal cascades to your team or organization');
      tips.push('Think about leading indicators that predict success');
    }

    // Domain-specific tips
    if (profile.primaryDomain === 'health-fitness' && component === 'measurable') {
      tips.push('Track both performance metrics (time, weight, reps) and how you feel');
      tips.push('Consider using a fitness app or journal to monitor progress');
    } else if (profile.primaryDomain === 'business' && component === 'achievable') {
      tips.push('Assess market conditions and competitive landscape');
      tips.push('Consider starting with a pilot or MVP approach');
    }

    // Motivation style tips
    if (profile.goalPreferences.motivationStyle === 'social') {
      tips.push('Consider finding an accountability partner or joining a group');
      tips.push('Think about how achieving this goal will benefit others');
    } else if (profile.goalPreferences.motivationStyle === 'growth') {
      tips.push('Focus on what you\'ll learn throughout the process');
      tips.push('Celebrate small improvements along the way');
    }

    // Accessibility-based tips
    if (profile.accessibilityNeeds.preferSimpleLanguage) {
      tips.push('Break complex tasks into smaller, simple steps');
      tips.push('Use plain language to describe your goal');
    }

    return tips;
  }
}

export const userProfileDetector = new UserProfileDetector();