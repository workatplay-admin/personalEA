/**
 * Conversation Flow Templates for SMART Goal Refinement
 * 
 * Production-ready templates and conversation flows for natural goal refinement
 */

export interface ConversationTemplate {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  responses: ResponseVariant[];
  nextSteps: string[];
}

export interface ResponseVariant {
  style: 'brief' | 'balanced' | 'detailed';
  text: string;
  followUp?: string;
}

// ===========================
// DISCOVERY PHASE TEMPLATES
// ===========================

export const discoveryTemplates: ConversationTemplate[] = [
  {
    id: 'initial_greeting',
    name: 'Initial Greeting',
    description: 'First interaction with user',
    triggers: ['start', 'hello', 'hi', 'help'],
    responses: [
      {
        style: 'brief',
        text: "Hi! What goal would you like to work on?",
        followUp: "Try to be specific about what you want to achieve."
      },
      {
        style: 'balanced',
        text: "Hello! I'm here to help you create a clear, actionable plan for your goal. What would you like to achieve?",
        followUp: "Take your time - the more detail you share, the better I can help."
      },
      {
        style: 'detailed',
        text: "Welcome! I'm here to help transform your aspirations into structured, achievable goals using the SMART framework. This means we'll work together to make your goal Specific, Measurable, Achievable, Relevant, and Time-bound. What area of your life would you like to improve?",
        followUp: "Feel free to share as much context as you'd like - your situation, motivation, and any initial thoughts about timeline or success metrics."
      }
    ],
    nextSteps: ['goal_clarification', 'domain_identification']
  },

  {
    id: 'vague_goal_response',
    name: 'Vague Goal Handler',
    description: 'When user provides very vague input like "be better" or "improve"',
    triggers: ['be better', 'improve', 'get good', 'do more', 'change'],
    responses: [
      {
        style: 'brief',
        text: "What area: health, career, skills, relationships, or finance?",
        followUp: "Pick one to focus on."
      },
      {
        style: 'balanced',
        text: "I'd love to help you improve! What area of your life would you like to focus on? For example: health, career, relationships, skills, or personal growth?",
        followUp: "Once we identify the area, we can get more specific about what success looks like."
      },
      {
        style: 'detailed',
        text: "That's a great starting point - wanting to improve is the first step! To help you create a concrete plan, let's narrow down the focus area. Here are some common categories people work on:\n\n• **Health & Fitness**: Physical health, exercise, nutrition, sleep\n• **Career & Professional**: Job skills, promotion, career change\n• **Learning & Education**: New skills, certifications, knowledge\n• **Financial**: Savings, income, investments, debt reduction\n• **Relationships**: Family, friends, networking, communication\n• **Personal Growth**: Habits, mindfulness, confidence, creativity\n\nWhich resonates most with you right now?",
        followUp: "Don't worry about having all the details yet - we'll develop those together."
      }
    ],
    nextSteps: ['domain_specific_exploration', 'example_provision']
  },

  {
    id: 'domain_identification',
    name: 'Domain Identifier',
    description: 'Identifies the goal domain for specialized guidance',
    triggers: ['health', 'career', 'money', 'learn', 'relationship', 'business'],
    responses: [
      {
        style: 'brief',
        text: "Great! What specific {domain} goal do you have in mind?",
        followUp: "Be as specific as possible."
      },
      {
        style: 'balanced',
        text: "Excellent choice! {domain} goals can be very rewarding. What specific aspect of {domain} would you like to work on?",
        followUp: "For example, in {domain}, people often focus on {examples}."
      },
      {
        style: 'detailed',
        text: "Wonderful! {domain} is an important area for growth. Let me share some common {domain} goals to help spark ideas:\n\n{detailed_examples}\n\nWhat specific {domain} outcome would make the biggest positive impact in your life?",
        followUp: "Remember, the best goals are personally meaningful to you - these examples are just to help clarify your thinking."
      }
    ],
    nextSteps: ['specific_component_refinement']
  }
];

// ===========================
// REFINEMENT PHASE TEMPLATES
// ===========================

export const refinementTemplates: ConversationTemplate[] = [
  {
    id: 'specific_refinement',
    name: 'Specificity Refinement',
    description: 'Making vague goals more specific',
    triggers: ['specific', 'what exactly', 'clarify', 'more detail'],
    responses: [
      {
        style: 'brief',
        text: "What exactly will you do? What will success look like?",
        followUp: "Think: WHO is involved, WHAT you'll do, WHERE, and WHY."
      },
      {
        style: 'balanced',
        text: "Let's get more specific. Can you describe what you'll actually DO to achieve this? Paint me a picture of what success looks like.",
        followUp: "Consider: What specific actions will you take? Who else is involved? What will be different when you succeed?"
      },
      {
        style: 'detailed',
        text: "Great question! Being specific is crucial for success. Let's break this down using the 5 W's:\n\n• **WHAT**: What exactly will you accomplish? What are the concrete deliverables or outcomes?\n• **WHO**: Who is involved? Who benefits? Who might help?\n• **WHERE**: Where will this happen? What's the context or environment?\n• **WHEN**: We'll cover timeline separately, but any initial thoughts?\n• **WHY**: What's your core motivation? (This helps with relevance)\n\nStarting with WHAT - can you describe the specific actions you'll take or the concrete outcome you want?",
        followUp: "Don't worry about perfect wording - we can refine it together. Just share what comes to mind."
      }
    ],
    nextSteps: ['measurable_refinement', 'example_provision']
  },

  {
    id: 'measurable_refinement',
    name: 'Measurability Refinement',
    description: 'Adding metrics and success criteria',
    triggers: ['measure', 'track', 'know when done', 'success criteria'],
    responses: [
      {
        style: 'brief',
        text: "How will you measure progress? What numbers or milestones make sense?",
        followUp: "Examples: frequency, amount, percentage, yes/no completion."
      },
      {
        style: 'balanced',
        text: "Good thinking! We need clear ways to track progress. What metrics or indicators would show you're succeeding? These could be numbers, milestones, or even qualitative improvements.",
        followUp: "For instance: How many? How often? By how much? What level of quality?"
      },
      {
        style: 'detailed',
        text: "Excellent - measuring progress is key to staying motivated! There are several ways to make goals measurable:\n\n**Quantitative Metrics** (numbers):\n• Frequency: times per day/week/month\n• Amount: pounds, dollars, hours, units\n• Percentage: improvement, completion, growth\n• Scores: ratings, test results, performance metrics\n\n**Qualitative Indicators** (quality):\n• Skill levels: beginner → intermediate → advanced\n• Feedback: ratings, reviews, testimonials\n• Milestones: specific achievements or completions\n\n**Yes/No Criteria**:\n• Certifications earned\n• Projects completed\n• Habits established\n\nBased on your goal, what type of measurement makes most sense? What would convince you that you've succeeded?",
        followUp: "If you're unsure, we can start with simple metrics and refine them as we go."
      }
    ],
    nextSteps: ['achievable_refinement', 'baseline_establishment']
  },

  {
    id: 'achievable_refinement',
    name: 'Achievability Assessment',
    description: 'Ensuring goal is realistic and planning for obstacles',
    triggers: ['realistic', 'achievable', 'can i', 'possible', 'obstacles'],
    responses: [
      {
        style: 'brief',
        text: "What resources do you have? What might make this challenging?",
        followUp: "Let's plan for obstacles now."
      },
      {
        style: 'balanced',
        text: "Let's ensure this is realistic. What resources (time, money, support) do you have available? What obstacles might you face?",
        followUp: "Being honest about constraints helps us create a plan that actually works."
      },
      {
        style: 'detailed',
        text: "Smart to think about feasibility! Let's assess what you're working with:\n\n**Resources Available**:\n• Time: How many hours per week can you dedicate?\n• Money: What budget do you have (if needed)?\n• Skills: What relevant experience do you already have?\n• Support: Who can help or hold you accountable?\n• Tools: What equipment/software/materials do you need?\n\n**Potential Obstacles**:\n• What might get in the way?\n• What's failed in past similar attempts?\n• What competing priorities exist?\n\n**Risk Level**:\n• Is this a stretch goal or well within reach?\n• What's your Plan B if things get difficult?\n\nBased on your honest assessment, does this goal feel challenging but achievable? Or do we need to adjust the scope?",
        followUp: "Remember, a slightly challenging goal is more motivating than one that's too easy OR impossible."
      }
    ],
    nextSteps: ['relevant_refinement', 'resource_planning']
  },

  {
    id: 'relevant_refinement',
    name: 'Relevance Exploration',
    description: 'Understanding motivation and alignment',
    triggers: ['why', 'important', 'motivation', 'care about', 'relevance'],
    responses: [
      {
        style: 'brief',
        text: "Why is this important to you now? What will change when you succeed?",
        followUp: "Your 'why' fuels persistence."
      },
      {
        style: 'balanced',
        text: "This is crucial - why does this goal matter to you? How will achieving it improve your life or align with your bigger picture?",
        followUp: "When motivation dips, remembering your 'why' keeps you going."
      },
      {
        style: 'detailed',
        text: "Great question - understanding your 'why' is often the difference between success and abandonment. Let's explore your motivation:\n\n**Personal Impact**:\n• How will your daily life improve?\n• What problems will this solve?\n• What opportunities will this create?\n\n**Broader Alignment**:\n• How does this fit your long-term vision?\n• What values does this honor?\n• Who else benefits from your success?\n\n**Timing**:\n• Why is NOW the right time?\n• What happens if you don't pursue this?\n• What makes this a priority over other goals?\n\n**Emotional Connection**:\n• How will you FEEL when you achieve this?\n• What fear or frustration are you addressing?\n• What excites you most about this journey?\n\nTake a moment to connect with your deeper motivation. What's really driving this goal?",
        followUp: "The stronger your emotional connection, the more likely you'll persist through challenges."
      }
    ],
    nextSteps: ['timebound_refinement', 'commitment_check']
  },

  {
    id: 'timebound_refinement',
    name: 'Timeline Establishment',
    description: 'Setting deadlines and milestones',
    triggers: ['when', 'deadline', 'timeline', 'how long', 'by when'],
    responses: [
      {
        style: 'brief',
        text: "By when do you want to achieve this? Any key milestones along the way?",
        followUp: "Be realistic but create some urgency."
      },
      {
        style: 'balanced',
        text: "Let's set a target date. When would you like to achieve this goal? We can also identify some milestones to track progress along the way.",
        followUp: "Consider your other commitments and be realistic, but don't make it so far away that you lose momentum."
      },
      {
        style: 'detailed',
        text: "Perfect - let's create a timeline that balances ambition with realism:\n\n**Target Completion Date**:\n• By when do you want to fully achieve this goal?\n• Is there a specific event or deadline driving this?\n• What feels challenging but achievable?\n\n**Milestone Mapping**:\nLet's break this into checkpoints:\n• What should be done by 25% of the way?\n• What marks the halfway point?\n• What indicates you're 75% complete?\n\n**Regular Rhythms**:\n• What needs to happen daily/weekly/monthly?\n• When will you review and adjust your approach?\n• How will you maintain momentum?\n\n**Time Investment**:\n• Realistically, how many hours per week?\n• What time of day works best for this?\n• How does this fit your current schedule?\n\nBased on everything we've discussed, what timeline makes sense?",
        followUp: "Remember, you can always adjust the timeline if needed - the key is to start with something concrete."
      }
    ],
    nextSteps: ['milestone_planning', 'validation_summary']
  }
];

// ===========================
// VALIDATION PHASE TEMPLATES
// ===========================

export const validationTemplates: ConversationTemplate[] = [
  {
    id: 'comprehensive_summary',
    name: 'Goal Summary and Confirmation',
    description: 'Presenting the complete SMART goal for validation',
    triggers: ['summary', 'confirm', 'review', 'check', 'everything correct'],
    responses: [
      {
        style: 'brief',
        text: "Here's your goal: {smart_goal}\n\nDoes this capture what you want?",
        followUp: "Say 'yes' to confirm or tell me what to change."
      },
      {
        style: 'balanced',
        text: "Let me summarize your SMART goal:\n\n**Goal**: {smart_goal}\n**Measure**: {metrics}\n**Deadline**: {deadline}\n**Why**: {relevance}\n\nDoes this accurately reflect what you want to achieve?",
        followUp: "Feel free to adjust anything - this is YOUR goal."
      },
      {
        style: 'detailed',
        text: "Excellent work! Here's your complete SMART goal:\n\n📎 **Specific Goal**:\n{specific_description}\n\n📊 **Measurable Outcomes**:\n{metrics_list}\n\n✅ **Achievability Plan**:\n• Resources: {resources}\n• Time commitment: {time_commitment}\n• Main obstacles addressed: {obstacles}\n\n💡 **Relevance & Motivation**:\n{why_important}\n\n⏱️ **Timeline**:\n• Start: {start_date}\n• Target completion: {end_date}\n• Key milestones:\n{milestones_list}\n\n**One-sentence summary**:\n{smart_goal_sentence}\n\nDoes this capture your vision? Any adjustments needed?",
        followUp: "This is your roadmap to success - make sure it feels right!"
      }
    ],
    nextSteps: ['commitment_check', 'first_step_planning']
  },

  {
    id: 'commitment_check',
    name: 'Readiness and Commitment Assessment',
    description: 'Ensuring user is ready to commit',
    triggers: ['ready', 'commit', 'start', 'confident', 'prepared'],
    responses: [
      {
        style: 'brief',
        text: "Ready to commit? What's your first step?",
        followUp: "Starting is often the hardest part."
      },
      {
        style: 'balanced',
        text: "How ready do you feel to start working on this goal (1-10)? What's the very first action you'll take?",
        followUp: "If less than 7, what would increase your confidence?"
      },
      {
        style: 'detailed',
        text: "You've created a solid goal! Let's ensure you're ready to begin:\n\n**Commitment Check**:\n• On a scale of 1-10, how committed are you to this goal?\n• What excites you most about starting?\n• What concerns do you still have?\n\n**First Actions**:\n• What's the VERY first thing you'll do? (Make it tiny!)\n• When will you do it? (Specific day/time)\n• What will you do in the first week?\n\n**Success Setup**:\n• How will you track progress? (App, journal, spreadsheet?)\n• Who will you share this goal with for accountability?\n• When will you review and celebrate progress?\n\n**Obstacle Prevention**:\n• What's most likely to derail you?\n• What's your plan when motivation dips?\n• Who can support you when it gets tough?\n\nWhat resonates most as your starting point?",
        followUp: "Remember: imperfect action beats perfect planning. The key is to START!"
      }
    ],
    nextSteps: ['action_planning', 'resource_provision']
  }
];

// ===========================
// ERROR RECOVERY TEMPLATES
// ===========================

export const errorRecoveryTemplates: ConversationTemplate[] = [
  {
    id: 'confusion_handler',
    name: 'Confusion Recovery',
    description: 'When user is confused or doesn\'t understand',
    triggers: ['confused', "don't understand", 'what?', 'huh', 'lost', "don't get it"],
    responses: [
      {
        style: 'brief',
        text: "Let me simplify: {simplified_question}",
        followUp: "Or we can skip this for now."
      },
      {
        style: 'balanced',
        text: "No worries! Let me rephrase that. {rephrased_question}\n\nOr here's an example: {example}",
        followUp: "Take your time - there's no wrong answer."
      },
      {
        style: 'detailed',
        text: "I apologize for the confusion! Let me approach this differently.\n\n{simplified_explanation}\n\nHere are some examples to clarify:\n• Example 1: {example_1}\n• Example 2: {example_2}\n• Example 3: {example_3}\n\nOr we can take a different approach entirely. What would be most helpful?",
        followUp: "Remember, we're just having a conversation about what you want to achieve. No pressure!"
      }
    ],
    nextSteps: ['alternative_approach', 'skip_component']
  },

  {
    id: 'frustration_handler',
    name: 'Frustration Recovery',
    description: 'When user shows frustration or impatience',
    triggers: ['too much', 'too many questions', 'just tell me', 'frustrated', 'annoying'],
    responses: [
      {
        style: 'brief',
        text: "Got it. Here's a simple version: {quick_template}",
        followUp: "We can refine later if needed."
      },
      {
        style: 'balanced',
        text: "I understand - let's simplify. Based on what you've shared, here's a starting point:\n\n{basic_goal_template}\n\nWe can always refine it later.",
        followUp: "The important thing is to start!"
      },
      {
        style: 'detailed',
        text: "I completely understand - sometimes the perfect can be the enemy of the good. Let me give you a quick framework:\n\n**Your Goal**: {inferred_goal}\n**Simple Plan**: {simple_steps}\n**Timeline**: {suggested_timeline}\n\nThis gives you a starting point. You can always come back to refine it as you learn what works.\n\nWould you like me to:\n• Go with this simplified version?\n• Focus on just one aspect?\n• Take a break and continue later?",
        followUp: "Your comfort and momentum matter more than perfection!"
      }
    ],
    nextSteps: ['quick_setup', 'pause_option']
  },

  {
    id: 'overthinking_handler',
    name: 'Overthinking Prevention',
    description: 'When user is overcomplicating or stuck in analysis',
    triggers: ['too complicated', 'overwhelming', 'so many options', 'cant decide', 'analysis paralysis'],
    responses: [
      {
        style: 'brief',
        text: "Let's keep it simple. What's the ONE thing you most want to change?",
        followUp: "Start there, expand later."
      },
      {
        style: 'balanced',
        text: "I see you're thinking deeply about this! Sometimes it helps to start simple. What's the core outcome you want - in one sentence?",
        followUp: "We can add complexity once we nail the basics."
      },
      {
        style: 'detailed',
        text: "You're being thorough, which is great! But sometimes we need to just pick a direction and start walking. Let me help simplify:\n\n**The 80/20 Approach**:\n• What 20% of this goal would give you 80% of the value?\n• What's the minimum viable version?\n• What could you achieve in just 30 days?\n\n**Decision Framework**:\n• If you had to pick ONE aspect to focus on, what would it be?\n• What would you regret NOT doing?\n• What excites you most right now?\n\n**Permission to Iterate**:\n• This isn't set in stone\n• You can adjust as you learn\n• Starting imperfectly > not starting\n\nWhat feels like the right first focus?",
        followUp: "Remember: you can always expand the goal once you build momentum!"
      }
    ],
    nextSteps: ['simplification', 'minimum_viable_goal']
  }
];

// ===========================
// UTILITY FUNCTIONS
// ===========================

export const templateUtilities = {
  /**
   * Select appropriate template based on user input and context
   */
  selectTemplate: (userInput: string, conversationState: any): ConversationTemplate | null => {
    const input = userInput.toLowerCase();
    const allTemplates = [
      ...discoveryTemplates,
      ...refinementTemplates,
      ...validationTemplates,
      ...errorRecoveryTemplates
    ];
    
    // First, check for exact trigger matches
    for (const template of allTemplates) {
      if (template.triggers.some(trigger => input.includes(trigger))) {
        return template;
      }
    }
    
    // Then, check based on conversation state
    const phaseTemplates = getTemplatesByPhase(conversationState.phase);
    return phaseTemplates[0] || null;
  },

  /**
   * Get response variant based on user communication style
   */
  getResponseVariant: (template: ConversationTemplate, userStyle: string): string => {
    const variant = template.responses.find(r => r.style === userStyle) || template.responses[1];
    return variant.text;
  },

  /**
   * Personalize template with actual values
   */
  personalizeTemplate: (template: string, values: Record<string, any>): string => {
    let personalized = template;
    Object.entries(values).forEach(([key, value]) => {
      personalized = personalized.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return personalized;
  }
};

/**
 * Get templates appropriate for current conversation phase
 */
function getTemplatesByPhase(phase: string): ConversationTemplate[] {
  switch (phase) {
    case 'discovery':
      return discoveryTemplates;
    case 'refinement':
      return refinementTemplates;
    case 'validation':
      return validationTemplates;
    default:
      return errorRecoveryTemplates;
  }
}

// ===========================
// CONVERSATION FLOW MANAGER
// ===========================

export class ConversationFlowManager {
  private currentPhase: 'discovery' | 'refinement' | 'validation' = 'discovery';
  private completedComponents: Set<string> = new Set();
  private userStyle: 'brief' | 'balanced' | 'detailed' = 'balanced';
  private context: Record<string, any> = {};

  /**
   * Process user input and generate appropriate response
   */
  processInput(userInput: string): { response: string; nextSteps: string[] } {
    // Detect user style from input length and complexity
    this.detectUserStyle(userInput);
    
    // Select appropriate template
    const template = templateUtilities.selectTemplate(userInput, {
      phase: this.currentPhase,
      completedComponents: Array.from(this.completedComponents)
    });
    
    if (!template) {
      return this.getDefaultResponse();
    }
    
    // Get response variant for user style
    const responseVariant = template.responses.find(r => r.style === this.userStyle) || template.responses[1];
    
    // Personalize response
    const response = templateUtilities.personalizeTemplate(responseVariant.text, this.context);
    
    // Update state
    this.updateConversationState(template);
    
    return {
      response: responseVariant.followUp ? `${response}\n\n${responseVariant.followUp}` : response,
      nextSteps: template.nextSteps
    };
  }

  /**
   * Detect user communication style
   */
  private detectUserStyle(userInput: string): void {
    const wordCount = userInput.split(/\s+/).length;
    if (wordCount < 10) {
      this.userStyle = 'brief';
    } else if (wordCount > 50) {
      this.userStyle = 'detailed';
    } else {
      this.userStyle = 'balanced';
    }
  }

  /**
   * Update conversation state based on template
   */
  private updateConversationState(template: ConversationTemplate): void {
    // Update completed components
    if (template.id.includes('_refinement')) {
      const component = template.id.replace('_refinement', '');
      this.completedComponents.add(component);
    }
    
    // Update phase based on completion
    if (this.completedComponents.size >= 5) {
      this.currentPhase = 'validation';
    } else if (this.completedComponents.size > 0) {
      this.currentPhase = 'refinement';
    }
  }

  /**
   * Get default response when no template matches
   */
  private getDefaultResponse(): { response: string; nextSteps: string[] } {
    const defaults = {
      discovery: "I'm here to help you create a clear goal. What would you like to work on?",
      refinement: "Let's continue refining your goal. What aspect would you like to clarify?",
      validation: "We've made great progress! Would you like to review your goal or adjust anything?"
    };
    
    return {
      response: defaults[this.currentPhase],
      nextSteps: ['continue_conversation']
    };
  }
}

// ===========================
// QUICK START EXAMPLES
// ===========================

export const quickStartExamples = {
  health: {
    brief: "Lose 20 pounds in 6 months",
    balanced: "Lose 20 pounds in 6 months through 3x/week exercise and 1500 calorie diet",
    detailed: "Lose 20 pounds (from 180 to 160) in 6 months by exercising 3x/week for 45 minutes, following a 1500-calorie Mediterranean diet, and tracking progress weekly"
  },
  career: {
    brief: "Get promoted to Senior Developer",
    balanced: "Get promoted to Senior Developer within 12 months by leading 2 projects and earning AWS certification",
    detailed: "Secure promotion from Mid-level to Senior Developer by Q4 2024 through leading 2 high-impact projects, earning AWS Solutions Architect certification, and mentoring 2 junior developers"
  },
  learning: {
    brief: "Learn Spanish for travel",
    balanced: "Reach conversational Spanish in 6 months using daily 30-minute Duolingo sessions and weekly tutor calls",
    detailed: "Achieve B1 conversational Spanish proficiency within 6 months through daily 30-minute app practice, weekly 1-hour tutor sessions, and monthly conversation exchanges, preparing for Mexico trip"
  },
  financial: {
    brief: "Save $10,000 emergency fund",
    balanced: "Save $10,000 emergency fund in 12 months by automatically saving $850/month",
    detailed: "Build $10,000 emergency fund (3 months expenses) within 12 months by automating $850 monthly transfers, cutting dining budget by 50%, and depositing tax refund"
  }
};