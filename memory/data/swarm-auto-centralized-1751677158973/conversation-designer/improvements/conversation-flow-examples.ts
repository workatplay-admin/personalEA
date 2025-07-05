/**
 * Conversation Flow Examples
 * 
 * Demonstrates various conversation patterns and how the enhanced system handles them
 */

export const conversationExamples = {
  // Example 1: Brief user who needs guidance
  briefUser: {
    scenario: "User provides minimal input",
    conversation: [
      {
        user: "lose weight",
        assistant: {
          message: "Great goal! Let's make it specific. How much weight would you like to lose, and by when?",
          metadata: {
            detected: { verbosity: "brief", clarity: 3 },
            strategy: "expand_with_structure",
            component: "specific",
            followUp: ["10 pounds in 2 months", "Not sure yet", "Tell me what's realistic"]
          }
        }
      },
      {
        user: "20 lbs",
        assistant: {
          message: "20 pounds is a solid target! What timeframe feels realistic for you? Many find 2-4 pounds per month sustainable.",
          metadata: {
            detected: { maintaining_brevity: true },
            strategy: "guide_with_context",
            component: "timeBound",
            followUp: ["3 months", "6 months", "What do you recommend?"]
          }
        }
      },
      {
        user: "3 months",
        assistant: {
          message: "Perfect! 20 pounds in 3 months means about 1.5-2 pounds per week. How do you plan to track your progress? Weekly weigh-ins? Measurements?",
          metadata: {
            detected: { engagement: "increasing" },
            strategy: "validate_and_continue",
            component: "measurable",
            progress: 40
          }
        }
      }
    ]
  },

  // Example 2: Confused user needing clarification
  confusedUser: {
    scenario: "User gets confused about SMART criteria",
    conversation: [
      {
        user: "I want to be healthier",
        assistant: {
          message: "Being healthier is a wonderful goal! To help you succeed, let's focus on one specific aspect. What part of your health would you like to improve first? For example: fitness, nutrition, sleep, or stress?",
          metadata: {
            detected: { goalType: "health", specificity: "low" },
            strategy: "narrow_focus_with_examples",
            component: "specific"
          }
        }
      },
      {
        user: "I don't understand what you're asking",
        assistant: {
          message: "No problem! Let me simplify. When you think about being healthier, what bothers you most right now? Maybe you get tired easily, or your clothes don't fit well, or you can't keep up with your kids? Any of these ring true?",
          metadata: {
            detected: { confusion: true, type: "concept" },
            strategy: "simplify_with_relatable_examples",
            recovery: "successful"
          }
        }
      },
      {
        user: "Oh, I get tired really easily",
        assistant: {
          message: "That's very helpful! So your goal is really about having more energy. Let's work with that. On a scale of 1-10, what's your energy level now, and where would you like it to be?",
          metadata: {
            detected: { clarity: "improved", engagement: "positive" },
            strategy: "build_on_understanding",
            component: "measurable"
          }
        }
      }
    ]
  },

  // Example 3: Detailed user who provides too much information
  detailedUser: {
    scenario: "User provides excessive detail upfront",
    conversation: [
      {
        user: "I want to lose 20 pounds in 3 months by going to the gym 5 times a week for 45 minutes doing a combination of cardio and strength training, plus following a 1500 calorie diet with 40% protein, 30% carbs, and 30% fat, tracking everything in MyFitnessPal, and doing weekly measurements",
        assistant: {
          message: "Wow, you've really thought this through! Your plan is already quite SMART. Let me make sure I understand: 20 pounds in 3 months through 5x weekly gym sessions and a structured 1500-calorie diet. This is ambitious but achievable. Have you successfully followed a similar routine before?",
          metadata: {
            detected: { verbosity: "detailed", expertise: "high", planning: "thorough" },
            strategy: "validate_and_probe_feasibility",
            component: "achievable",
            skipComponents: ["specific", "measurable", "timeBound"]
          }
        }
      },
      {
        user: "Not exactly, I usually burn out after 2-3 weeks",
        assistant: {
          message: "Thanks for being honest! That's actually really common. Since consistency is key, what if we adjusted your plan to be more sustainable? Maybe start with 3 gym sessions per week and 1700 calories? We can always increase once the habit sticks.",
          metadata: {
            detected: { challenge: "sustainability", pattern: "overambitious" },
            strategy: "adjust_for_reality",
            component: "achievable",
            tone: "supportive"
          }
        }
      }
    ]
  },

  // Example 4: Frustrated user who wants to skip the process
  frustratedUser: {
    scenario: "User shows frustration with the process",
    conversation: [
      {
        user: "Learn Spanish",
        assistant: {
          message: "¡Excelente! Learning Spanish opens so many doors. What's driving you to learn? Travel, work, family, or just for fun?",
          metadata: {
            detected: { goalType: "learning" },
            strategy: "engage_with_enthusiasm",
            component: "relevant"
          }
        }
      },
      {
        user: "Does it matter? Just give me a plan",
        assistant: {
          message: "I hear you - let's keep it simple. Here's a quick start: 15 minutes daily on Duolingo, aim for basic conversation in 3 months. Sound good? We can always refine it later if you want.",
          metadata: {
            detected: { frustration: true, patience: "low" },
            strategy: "provide_immediate_value",
            tone: "understanding",
            offered: "minimal_viable_goal"
          }
        }
      },
      {
        user: "That works",
        assistant: {
          message: "Perfect! You're all set. Your goal: 'Practice Spanish 15 minutes daily to achieve basic conversation skills in 3 months.' Feel free to come back anytime if you want to add more detail or adjust anything. ¡Buena suerte!",
          metadata: {
            detected: { satisfaction: "achieved" },
            strategy: "confirm_and_encourage",
            complete: true,
            leftDoorOpen: true
          }
        }
      }
    ]
  },

  // Example 5: User who changes topics mid-conversation
  topicChangingUser: {
    scenario: "User switches between different goals",
    conversation: [
      {
        user: "I want to save money",
        assistant: {
          message: "Smart thinking! Having a specific savings target really helps. What are you hoping to save for, or is it more about building an emergency fund?",
          metadata: {
            detected: { goalType: "financial" },
            strategy: "explore_motivation",
            component: "specific"
          }
        }
      },
      {
        user: "Actually, maybe I should focus on getting a better job first",
        assistant: {
          message: "That makes sense - a better job could definitely help with saving! These goals often go hand-in-hand. Would you like to focus on the job search first, or work on both? Sometimes having a savings goal motivates the job search.",
          metadata: {
            detected: { topicChange: true, related: true },
            strategy: "acknowledge_and_connect",
            flexible: true
          }
        }
      },
      {
        user: "Let's do the job search",
        assistant: {
          message: "Great choice! For your job search goal, what would 'better' look like for you? Higher salary, different field, better work-life balance, or something else?",
          metadata: {
            detected: { commitment: "confirmed" },
            strategy: "smooth_transition",
            component: "specific",
            previousGoal: "archived"
          }
        }
      }
    ]
  },

  // Example 6: User providing emotional context
  emotionalUser: {
    scenario: "User shares emotional reasons behind their goal",
    conversation: [
      {
        user: "I need to get organized",
        assistant: {
          message: "Getting organized can really reduce stress! What area of your life feels most chaotic right now? Work, home, schedule, or maybe all of the above?",
          metadata: {
            detected: { stress: "implied" },
            strategy: "empathetic_exploration",
            component: "specific"
          }
        }
      },
      {
        user: "Everything. I missed my daughter's recital because I forgot. I can't keep doing this to my family",
        assistant: {
          message: "I can hear how much this means to you. Being there for your family is clearly important. Let's start with calendar management so you never miss another important event. Would you like to focus on setting up a system that sends you reminders for all family events?",
          metadata: {
            detected: { emotion: "guilt", motivation: "family", urgency: "high" },
            strategy: "acknowledge_emotion_and_focus",
            component: "specific",
            tone: "compassionate"
          }
        }
      },
      {
        user: "Yes, that would help so much",
        assistant: {
          message: "We'll make sure you're there for every important moment. Let's set this up: 'Create and maintain a family calendar system with automatic reminders, checking it daily, to attend 100% of family events.' How does 2 weeks sound to get this fully established?",
          metadata: {
            detected: { relief: true, commitment: "high" },
            strategy: "concrete_solution_with_hope",
            components: ["specific", "measurable", "timeBound"],
            emotionalSupport: "provided"
          }
        }
      }
    ]
  }
};

// Helper function to demonstrate conversation flow
export function demonstrateConversationFlow(example: string) {
  const flow = conversationExamples[example];
  if (!flow) return null;
  
  console.log(`\n=== ${flow.scenario} ===\n`);
  
  flow.conversation.forEach((turn, index) => {
    console.log(`User: ${turn.user}`);
    console.log(`Assistant: ${turn.assistant.message}`);
    console.log(`Metadata:`, turn.assistant.metadata);
    console.log('---');
  });
}

// Patterns for different user types
export const userPatterns = {
  brief: {
    indicators: [
      "Short responses (< 5 words)",
      "No punctuation",
      "Single concept per message",
      "Minimal context provided"
    ],
    adaptations: [
      "Ask one thing at a time",
      "Provide examples",
      "Use simple language",
      "Offer multiple choice options"
    ]
  },
  
  detailed: {
    indicators: [
      "Long responses (> 50 words)",
      "Multiple concepts per message",
      "Provides background context",
      "Uses specific terminology"
    ],
    adaptations: [
      "Acknowledge their planning",
      "Focus on refinement",
      "Validate their approach",
      "Probe for hidden challenges"
    ]
  },
  
  confused: {
    indicators: [
      "Questions about questions",
      "\"I don't understand\"",
      "Off-topic responses",
      "Requests for clarification"
    ],
    adaptations: [
      "Simplify language",
      "Provide concrete examples",
      "Break down concepts",
      "Offer visual aids or analogies"
    ]
  },
  
  frustrated: {
    indicators: [
      "Impatient language",
      "Requests to skip",
      "Short, curt responses",
      "Negative emotion words"
    ],
    adaptations: [
      "Acknowledge their time",
      "Provide immediate value",
      "Offer minimal viable solution",
      "Keep door open for later"
    ]
  },
  
  engaged: {
    indicators: [
      "Asks follow-up questions",
      "Provides thoughtful responses",
      "Shows enthusiasm",
      "Engages with suggestions"
    ],
    adaptations: [
      "Maintain momentum",
      "Provide additional insights",
      "Explore deeper aspects",
      "Celebrate their progress"
    ]
  }
};

// State transition examples
export const stateTransitions = {
  discoveryToRefinement: {
    trigger: "Basic goal understood",
    fromState: {
      phase: "discovery",
      confidence: 60,
      componentsGathered: ["general idea"]
    },
    toState: {
      phase: "refinement", 
      confidence: 75,
      focus: "specific",
      reason: "User provided clear goal category"
    }
  },
  
  refinementToValidation: {
    trigger: "Most components defined",
    fromState: {
      phase: "refinement",
      confidence: 85,
      componentsComplete: 4
    },
    toState: {
      phase: "validation",
      confidence: 90,
      focus: "confirmation",
      reason: "Ready to confirm complete SMART goal"
    }
  },
  
  confusionRecovery: {
    trigger: "Confusion detected",
    fromState: {
      phase: "any",
      confusion: true
    },
    toState: {
      phase: "current",
      subPhase: "clarification",
      strategy: "simplify",
      reason: "User needs clarification"
    }
  }
};