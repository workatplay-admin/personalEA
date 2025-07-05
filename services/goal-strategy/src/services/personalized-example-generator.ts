/**
 * Personalized Example Generator
 * 
 * Generates culturally relevant, domain-specific examples tailored to user profiles
 * to help diverse users understand and create SMART goals effectively.
 */

import { UserProfile } from './user-profile-detector';
import { logger } from '@/utils/logger';

export interface PersonalizedExample {
  goalStatement: string;
  smartBreakdown: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };
  context: string;
  tips: string[];
  culturalNote?: string;
}

export class PersonalizedExampleGenerator {
  private exampleDatabase: Record<string, Record<string, PersonalizedExample[]>>;

  constructor() {
    this.exampleDatabase = this.initializeExampleDatabase();
  }

  /**
   * Generate personalized examples based on user profile
   */
  generateExamples(
    profile: UserProfile,
    count: number = 3
  ): PersonalizedExample[] {
    logger.info('Generating personalized examples', {
      domain: profile.primaryDomain,
      expertiseLevel: profile.expertiseLevel,
      count
    });

    const domainExamples = this.exampleDatabase[profile.primaryDomain] || this.exampleDatabase['general'];
    const levelExamples = domainExamples[profile.expertiseLevel] || domainExamples['intermediate'];

    // Filter and adapt examples based on cultural context
    let examples = this.adaptExamplesForCulture(levelExamples, profile.culturalContext);

    // Adjust language complexity
    examples = this.adjustLanguageComplexity(examples, profile.languageComplexity);

    // Add accessibility considerations
    if (profile.accessibilityNeeds.preferSimpleLanguage) {
      examples = this.simplifyExamples(examples);
    }

    return examples.slice(0, count);
  }

  /**
   * Initialize comprehensive example database
   */
  private initializeExampleDatabase(): Record<string, Record<string, PersonalizedExample[]>> {
    return {
      'technology': {
        'beginner': [
          {
            goalStatement: 'Learn basic web development to build my first website',
            smartBreakdown: {
              specific: 'Learn HTML, CSS, and basic JavaScript to create a personal portfolio website',
              measurable: 'Complete 5 online tutorials and build 3 practice projects',
              achievable: 'Dedicate 1 hour daily for learning, using free resources like freeCodeCamp',
              relevant: 'Having a portfolio website will help me showcase my work and find opportunities',
              timeBound: 'Complete learning and launch website within 3 months'
            },
            context: 'Perfect for someone starting their tech journey',
            tips: [
              'Start with HTML/CSS before moving to JavaScript',
              'Use free resources like YouTube and freeCodeCamp',
              'Join online communities for support'
            ]
          },
          {
            goalStatement: 'Get comfortable using version control for my code',
            smartBreakdown: {
              specific: 'Learn Git and GitHub to manage code versions and collaborate',
              measurable: 'Create 10 repositories and make 50 commits',
              achievable: 'Practice with personal projects first, then contribute to one open source project',
              relevant: 'Version control is essential for any programming job',
              timeBound: 'Become proficient within 6 weeks'
            },
            context: 'Essential skill for aspiring developers',
            tips: [
              'Start with GitHub Desktop for visual learning',
              'Practice daily with small commits',
              'Learn by doing rather than just reading'
            ]
          }
        ],
        'intermediate': [
          {
            goalStatement: 'Build and deploy a full-stack web application',
            smartBreakdown: {
              specific: 'Create a task management app using React, Node.js, and MongoDB',
              measurable: 'App should handle 100 concurrent users with <500ms response time',
              achievable: 'Leverage existing skills in JavaScript and learn deployment practices',
              relevant: 'Demonstrates full-stack capabilities for job applications',
              timeBound: 'Complete development in 2 months, deploy by month 3'
            },
            context: 'Ideal for developers ready to showcase comprehensive skills',
            tips: [
              'Start with a clear architecture plan',
              'Use CI/CD from the beginning',
              'Focus on one feature at a time'
            ]
          }
        ],
        'advanced': [
          {
            goalStatement: 'Architect and implement a microservices-based system',
            smartBreakdown: {
              specific: 'Refactor monolithic e-commerce platform into 8 microservices with event-driven architecture',
              measurable: 'Achieve 99.9% uptime, <200ms API response time, handle 10K requests/second',
              achievable: 'Lead team of 5 developers, use existing AWS expertise, implement gradually',
              relevant: 'Scales business to handle 5x current traffic and improves development velocity',
              timeBound: 'Complete architecture design in 1 month, full implementation in 6 months'
            },
            context: 'For experienced developers leading technical transformations',
            tips: [
              'Start with the most critical service',
              'Implement comprehensive monitoring early',
              'Plan for gradual migration strategy'
            ]
          }
        ],
        'expert': [
          {
            goalStatement: 'Lead digital transformation initiative across enterprise',
            smartBreakdown: {
              specific: 'Modernize legacy systems across 5 business units to cloud-native architecture',
              measurable: 'Reduce operational costs by 40%, improve deployment frequency to daily releases',
              achievable: 'Leverage $2M budget, partner with cloud vendors, upskill 50 engineers',
              relevant: 'Critical for company\'s competitive advantage and market position',
              timeBound: '18-month transformation roadmap with quarterly milestones'
            },
            context: 'Strategic initiative for technical leaders',
            tips: [
              'Secure executive sponsorship early',
              'Focus on quick wins to build momentum',
              'Invest heavily in change management'
            ]
          }
        ]
      },
      'health-fitness': {
        'beginner': [
          {
            goalStatement: 'Start a regular exercise routine to improve my health',
            smartBreakdown: {
              specific: 'Walk for 30 minutes every day and do basic stretching',
              measurable: 'Track daily steps (target: 8,000) and complete 20 workout sessions per month',
              achievable: 'Start with 15-minute walks and gradually increase',
              relevant: 'Doctor recommended exercise to improve blood pressure and energy levels',
              timeBound: 'Establish consistent routine within 1 month'
            },
            context: 'Perfect for fitness beginners or those returning after a break',
            tips: [
              'Start small - even 10 minutes counts',
              'Find a walking buddy for motivation',
              'Track progress with a simple app or journal'
            ]
          },
          {
            goalStatement: 'Improve my eating habits for better health',
            smartBreakdown: {
              specific: 'Replace fast food lunches with home-prepared healthy meals',
              measurable: 'Prepare lunch at home 4 days per week, eat 5 servings of vegetables daily',
              achievable: 'Start with meal prep on Sundays, learn 10 healthy recipes',
              relevant: 'Will save money and improve energy levels during work',
              timeBound: 'Fully transition to healthy lunches within 6 weeks'
            },
            context: 'Sustainable approach to nutrition improvement',
            tips: [
              'Prep meals on weekends',
              'Start with simple recipes',
              'Keep healthy snacks readily available'
            ]
          }
        ],
        'intermediate': [
          {
            goalStatement: 'Train for and complete my first 5K race',
            smartBreakdown: {
              specific: 'Follow Couch-to-5K program and run in the City Fun Run',
              measurable: 'Complete all training sessions, finish 5K in under 35 minutes',
              achievable: 'Currently can run 1 mile, will build up gradually over 8 weeks',
              relevant: 'Want to challenge myself and join running community',
              timeBound: 'Race date is in 10 weeks, allowing 2 weeks for tapering'
            },
            context: 'Structured approach for aspiring runners',
            tips: [
              'Invest in proper running shoes',
              'Join a local running group',
              'Listen to your body to avoid injury'
            ]
          }
        ],
        'advanced': [
          {
            goalStatement: 'Complete an Ironman 70.3 triathlon',
            smartBreakdown: {
              specific: 'Train for 1.2-mile swim, 56-mile bike, 13.1-mile run in single event',
              measurable: 'Complete race in under 6 hours, train 10-15 hours weekly',
              achievable: 'Build on marathon experience, hire coach, join tri club',
              relevant: 'Personal challenge and qualifying for world championship',
              timeBound: 'Race in 6 months with structured 24-week training plan'
            },
            context: 'For experienced endurance athletes',
            tips: [
              'Focus on weakest discipline',
              'Practice transitions',
              'Prioritize recovery and nutrition'
            ]
          }
        ]
      },
      'business': {
        'beginner': [
          {
            goalStatement: 'Start a small side business while keeping my day job',
            smartBreakdown: {
              specific: 'Launch online craft jewelry store on Etsy selling handmade earrings',
              measurable: 'List 20 products, achieve $500 monthly revenue within 3 months',
              achievable: 'Dedicate weekends to crafting, start with $200 investment',
              relevant: 'Generate extra income and explore entrepreneurship passion',
              timeBound: 'Launch store in 4 weeks, reach revenue goal by month 4'
            },
            context: 'Low-risk entry into entrepreneurship',
            tips: [
              'Start with a small product line',
              'Research successful Etsy sellers',
              'Focus on great product photos'
            ]
          }
        ],
        'intermediate': [
          {
            goalStatement: 'Scale my freelance business to six figures',
            smartBreakdown: {
              specific: 'Expand graphic design services to reach $100K annual revenue',
              measurable: 'Increase from 5 to 15 regular clients, raise rates by 50%',
              achievable: 'Leverage existing portfolio, outsource admin tasks, improve processes',
              relevant: 'Ready to transition from freelancer to business owner',
              timeBound: 'Achieve target within 12 months through quarterly milestones'
            },
            context: 'Growth strategy for established freelancers',
            tips: [
              'Focus on high-value clients',
              'Systematize your processes',
              'Build recurring revenue streams'
            ]
          }
        ],
        'expert': [
          {
            goalStatement: 'Execute strategic acquisition to expand market share',
            smartBreakdown: {
              specific: 'Acquire competitor to increase market share from 15% to 25% in northeast region',
              measurable: 'Complete due diligence on 3 targets, close deal valued at $10-15M',
              achievable: 'Secured $20M credit facility, assembled M&A team, board approval obtained',
              relevant: 'Critical for achieving 5-year strategic plan and defending against new entrants',
              timeBound: 'Identify targets Q1, complete DD Q2, close transaction by Q3'
            },
            context: 'Executive-level strategic initiative',
            tips: [
              'Engage experienced M&A advisors',
              'Plan integration from day one',
              'Communicate transparently with stakeholders'
            ]
          }
        ]
      },
      'education': {
        'beginner': [
          {
            goalStatement: 'Learn a new language for travel and personal growth',
            smartBreakdown: {
              specific: 'Learn conversational Spanish to communicate during Mexico vacation',
              measurable: 'Complete 100 Duolingo lessons, have 5-minute conversations',
              achievable: 'Practice 20 minutes daily using app and weekly online tutor sessions',
              relevant: 'Planning Mexico trip in 6 months, want to connect with locals',
              timeBound: 'Reach conversational level in 5 months before trip'
            },
            context: 'Practical language learning with clear purpose',
            tips: [
              'Practice speaking from day one',
              'Watch Spanish shows with subtitles',
              'Find a language exchange partner'
            ]
          }
        ],
        'intermediate': [
          {
            goalStatement: 'Earn professional certification to advance career',
            smartBreakdown: {
              specific: 'Obtain Project Management Professional (PMP) certification',
              measurable: 'Complete 35 hours training, pass exam with score >80%',
              achievable: 'Study 2 hours daily, join study group, use company education budget',
              relevant: 'Required for promotion to Senior PM role with 20% salary increase',
              timeBound: 'Complete training in 2 months, pass exam by month 4'
            },
            context: 'Career advancement through certification',
            tips: [
              'Create a study schedule and stick to it',
              'Take practice exams weekly',
              'Apply concepts at work immediately'
            ]
          }
        ]
      },
      'finance': {
        'beginner': [
          {
            goalStatement: 'Build an emergency fund for financial security',
            smartBreakdown: {
              specific: 'Save 3 months of living expenses ($6,000) in high-yield savings account',
              measurable: 'Save $500 monthly by reducing discretionary spending',
              achievable: 'Automate transfers, cut dining out by 50%, cancel unused subscriptions',
              relevant: 'Provide security for unexpected job loss or medical expenses',
              timeBound: 'Reach full emergency fund in 12 months'
            },
            context: 'Foundation of financial stability',
            tips: [
              'Automate savings immediately after paycheck',
              'Start with even $50/month if needed',
              'Track spending to find savings opportunities'
            ],
            culturalNote: 'Adjust amount based on family obligations and cultural expectations'
          }
        ],
        'advanced': [
          {
            goalStatement: 'Achieve financial independence through investment portfolio',
            smartBreakdown: {
              specific: 'Build investment portfolio to generate $4,000 monthly passive income',
              measurable: 'Reach $1.2M portfolio value with 4% safe withdrawal rate',
              achievable: 'Increase savings rate to 50%, maximize tax-advantaged accounts',
              relevant: 'Enable early retirement and pursue passion projects',
              timeBound: 'Achieve target portfolio in 10 years through consistent investing'
            },
            context: 'Long-term wealth building strategy',
            tips: [
              'Focus on low-cost index funds',
              'Maximize employer matching',
              'Consider real estate investment'
            ]
          }
        ]
      },
      'career': {
        'beginner': [
          {
            goalStatement: 'Get my first job in my chosen field',
            smartBreakdown: {
              specific: 'Secure entry-level marketing position at mid-size company',
              measurable: 'Apply to 50 jobs, get 10 interviews, receive 2 offers',
              achievable: 'Leverage internship experience, improve resume, practice interviewing',
              relevant: 'Start career after graduation and gain industry experience',
              timeBound: 'Land job within 3 months of graduation'
            },
            context: 'Career launch strategy for new graduates',
            tips: [
              'Tailor resume for each application',
              'Network through LinkedIn and alumni',
              'Prepare STAR method interview stories'
            ]
          }
        ],
        'intermediate': [
          {
            goalStatement: 'Transition to a leadership role in my organization',
            smartBreakdown: {
              specific: 'Get promoted from Senior Analyst to Analytics Team Lead',
              measurable: 'Lead 2 major projects, mentor 3 junior analysts, improve team KPIs by 25%',
              achievable: 'Leverage 5 years experience, complete leadership training, get sponsor',
              relevant: 'Ready for more responsibility and want to develop others',
              timeBound: 'Achieve promotion during next review cycle in 8 months'
            },
            context: 'Strategic career advancement',
            tips: [
              'Communicate intentions with manager',
              'Take on stretch assignments',
              'Build relationships across departments'
            ]
          }
        ]
      },
      'personal': {
        'beginner': [
          {
            goalStatement: 'Develop a consistent meditation practice for stress relief',
            smartBreakdown: {
              specific: 'Practice mindfulness meditation daily using Headspace app',
              measurable: 'Complete 10-minute sessions daily, achieve 30-day streak',
              achievable: 'Start with 5 minutes, gradually increase, set phone reminder',
              relevant: 'Doctor recommended for managing work stress and improving sleep',
              timeBound: 'Establish habit within 6 weeks'
            },
            context: 'Simple start to mindfulness practice',
            tips: [
              'Same time each day builds habit',
              'Start with guided meditations',
              'Be patient with yourself'
            ]
          }
        ]
      },
      'creative': {
        'beginner': [
          {
            goalStatement: 'Write and publish my first short story',
            smartBreakdown: {
              specific: 'Write 5,000-word science fiction story and submit to 3 magazines',
              measurable: 'Write 500 words daily, complete 3 drafts, submit to publications',
              achievable: 'Join writing group, take online course, dedicate morning time',
              relevant: 'Always wanted to be published writer, start with short form',
              timeBound: 'Finish first draft in 2 weeks, submit within 2 months'
            },
            context: 'Achievable entry into creative writing',
            tips: [
              'Write first, edit later',
              'Read in your genre daily',
              'Join online writing community'
            ]
          }
        ]
      },
      'general': {
        'intermediate': [
          {
            goalStatement: 'Improve work-life balance for better well-being',
            smartBreakdown: {
              specific: 'Establish boundaries between work and personal time',
              measurable: 'Leave office by 6 PM daily, take 2 proper breaks, use all vacation days',
              achievable: 'Delegate tasks, improve efficiency, communicate with manager',
              relevant: 'Prevent burnout and spend quality time with family',
              timeBound: 'Implement new schedule within 1 month'
            },
            context: 'Universal goal for modern professionals',
            tips: [
              'Set phone to do-not-disturb after hours',
              'Schedule personal time like meetings',
              'Learn to say no respectfully'
            ]
          }
        ]
      }
    };
  }

  /**
   * Adapt examples based on cultural context
   */
  private adaptExamplesForCulture(
    examples: PersonalizedExample[],
    culturalContext: UserProfile['culturalContext']
  ): PersonalizedExample[] {
    return examples.map(example => {
      const adapted = { ...example };

      // Time orientation adaptations
      if (culturalContext.timeOrientation === 'long-term') {
        adapted.tips.push('Consider how this goal fits into your 5-year vision');
        adapted.culturalNote = 'This goal is designed with long-term success in mind';
      } else if (culturalContext.timeOrientation === 'short-term') {
        adapted.tips.push('Focus on quick wins to maintain momentum');
        adapted.culturalNote = 'Structured for rapid results and immediate impact';
      }

      // Work culture adaptations
      if (culturalContext.workCulture === 'collaborative') {
        adapted.tips.push('Consider involving colleagues or team members');
        if (!adapted.smartBreakdown.relevant.includes('team')) {
          adapted.smartBreakdown.relevant += ' and contribute to team success';
        }
      } else if (culturalContext.workCulture === 'hierarchical') {
        adapted.tips.push('Ensure alignment with organizational priorities');
        adapted.tips.push('Communicate progress to supervisors regularly');
      }

      return adapted;
    });
  }

  /**
   * Adjust language complexity of examples
   */
  private adjustLanguageComplexity(
    examples: PersonalizedExample[],
    complexity: UserProfile['languageComplexity']
  ): PersonalizedExample[] {
    if (complexity === 'basic') {
      return this.simplifyExamples(examples);
    } else if (complexity === 'advanced') {
      return this.enhanceExamples(examples);
    }
    return examples;
  }

  /**
   * Simplify examples for basic language users
   */
  private simplifyExamples(examples: PersonalizedExample[]): PersonalizedExample[] {
    return examples.map(example => {
      const simplified = { ...example };

      // Simplify goal statement
      simplified.goalStatement = this.simplifyText(example.goalStatement);

      // Simplify SMART breakdown
      Object.keys(simplified.smartBreakdown).forEach(key => {
        simplified.smartBreakdown[key as keyof typeof simplified.smartBreakdown] = 
          this.simplifyText(simplified.smartBreakdown[key as keyof typeof simplified.smartBreakdown]);
      });

      // Simplify tips
      simplified.tips = simplified.tips.map(tip => this.simplifyText(tip));

      // Add visual/simple language note
      simplified.culturalNote = 'Written in simple, clear language for easy understanding';

      return simplified;
    });
  }

  /**
   * Enhance examples for advanced language users
   */
  private enhanceExamples(examples: PersonalizedExample[]): PersonalizedExample[] {
    return examples.map(example => {
      const enhanced = { ...example };

      // Add more sophisticated language and concepts
      enhanced.tips.push('Consider second-order effects and systemic implications');
      enhanced.tips.push('Leverage synergies with parallel initiatives');

      return enhanced;
    });
  }

  /**
   * Simplify text for basic language level
   */
  private simplifyText(text: string): string {
    // Replace complex words with simpler alternatives
    const replacements: Record<string, string> = {
      'achieve': 'reach',
      'implement': 'do',
      'utilize': 'use',
      'demonstrate': 'show',
      'establish': 'set up',
      'comprehensive': 'complete',
      'optimize': 'improve',
      'leverage': 'use',
      'strategic': 'planned',
      'initiative': 'project',
      'facilitate': 'help',
      'enhance': 'make better'
    };

    let simplified = text;
    Object.entries(replacements).forEach(([complex, simple]) => {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      simplified = simplified.replace(regex, simple);
    });

    return simplified;
  }

  /**
   * Generate quick-start templates based on profile
   */
  generateQuickStartTemplates(profile: UserProfile): Array<{
    category: string;
    templates: Array<{
      title: string;
      description: string;
      starterGoal: string;
    }>;
  }> {
    const templates = [
      {
        category: 'Most Popular in ' + this.formatDomain(profile.primaryDomain),
        templates: this.getDomainTopTemplates(profile.primaryDomain, profile.expertiseLevel)
      },
      {
        category: 'Based on Your Style',
        templates: this.getStyleBasedTemplates(profile)
      },
      {
        category: 'Quick Wins',
        templates: this.getQuickWinTemplates(profile)
      }
    ];

    return templates;
  }

  /**
   * Format domain name for display
   */
  private formatDomain(domain: string): string {
    const formatting: Record<string, string> = {
      'health-fitness': 'Health & Fitness',
      'social-impact': 'Social Impact',
      'technology': 'Technology',
      'business': 'Business',
      'education': 'Education',
      'finance': 'Finance',
      'career': 'Career',
      'personal': 'Personal Growth',
      'creative': 'Creative'
    };
    return formatting[domain] || 'Your Field';
  }

  /**
   * Get top templates for a domain
   */
  private getDomainTopTemplates(domain: string, expertise: string): Array<{
    title: string;
    description: string;
    starterGoal: string;
  }> {
    const domainTemplates: Record<string, Array<{
      title: string;
      description: string;
      starterGoal: string;
    }>> = {
      'technology': [
        {
          title: 'Learn New Technology',
          description: 'Master a new programming language or framework',
          starterGoal: 'I want to learn [technology] to build [project type]'
        },
        {
          title: 'Build Portfolio Project',
          description: 'Create a showcase project for your skills',
          starterGoal: 'I want to build a [project] that demonstrates my [skill]'
        },
        {
          title: 'Improve Code Quality',
          description: 'Enhance your development practices',
          starterGoal: 'I want to improve my code quality by implementing [practice]'
        }
      ],
      'health-fitness': [
        {
          title: 'Start Exercise Routine',
          description: 'Build a consistent workout habit',
          starterGoal: 'I want to exercise [frequency] to improve my [health aspect]'
        },
        {
          title: 'Nutrition Goal',
          description: 'Improve your eating habits',
          starterGoal: 'I want to improve my diet by [specific change]'
        },
        {
          title: 'Fitness Challenge',
          description: 'Train for a specific event or milestone',
          starterGoal: 'I want to complete a [challenge/event] in [timeframe]'
        }
      ],
      'business': [
        {
          title: 'Increase Revenue',
          description: 'Grow your business income',
          starterGoal: 'I want to increase revenue by [percentage] through [method]'
        },
        {
          title: 'Launch New Product',
          description: 'Bring a new offering to market',
          starterGoal: 'I want to launch [product/service] for [target market]'
        },
        {
          title: 'Expand Customer Base',
          description: 'Reach more customers',
          starterGoal: 'I want to acquire [number] new customers in [timeframe]'
        }
      ]
    };

    return domainTemplates[domain] || domainTemplates['technology'];
  }

  /**
   * Get templates based on user style
   */
  private getStyleBasedTemplates(profile: UserProfile): Array<{
    title: string;
    description: string;
    starterGoal: string;
  }> {
    const motivationTemplates = {
      'achievement': [
        {
          title: 'Hit Performance Target',
          description: 'Reach a specific performance milestone',
          starterGoal: 'I want to achieve [metric] in [area] by [date]'
        },
        {
          title: 'Win Competition',
          description: 'Compete and succeed in your field',
          starterGoal: 'I want to win [competition/award] by [method]'
        }
      ],
      'growth': [
        {
          title: 'Develop New Skill',
          description: 'Learn something that expands your abilities',
          starterGoal: 'I want to learn [skill] to grow in [area]'
        },
        {
          title: 'Personal Challenge',
          description: 'Push yourself beyond comfort zone',
          starterGoal: 'I want to challenge myself by [activity]'
        }
      ],
      'social': [
        {
          title: 'Help Others',
          description: 'Make a positive impact on others',
          starterGoal: 'I want to help [who] by [action]'
        },
        {
          title: 'Build Community',
          description: 'Create or strengthen connections',
          starterGoal: 'I want to build a community around [topic/cause]'
        }
      ],
      'security': [
        {
          title: 'Build Stability',
          description: 'Create a more secure foundation',
          starterGoal: 'I want to establish [type of security] by [method]'
        },
        {
          title: 'Reduce Risk',
          description: 'Minimize potential problems',
          starterGoal: 'I want to reduce [risk] through [action]'
        }
      ]
    };

    return motivationTemplates[profile.goalPreferences.motivationStyle] || motivationTemplates['growth'];
  }

  /**
   * Get quick win templates
   */
  private getQuickWinTemplates(profile: UserProfile): Array<{
    title: string;
    description: string;
    starterGoal: string;
  }> {
    const timeframe = profile.culturalContext.timeOrientation === 'short-term' ? '1 week' : '1 month';
    
    return [
      {
        title: '7-Day Challenge',
        description: 'Start small with a week-long commitment',
        starterGoal: `I want to [action] every day for 7 days`
      },
      {
        title: '30-Day Habit',
        description: 'Build a new habit in a month',
        starterGoal: `I want to establish a [habit] routine in 30 days`
      },
      {
        title: 'Weekend Project',
        description: 'Complete something meaningful in a weekend',
        starterGoal: `I want to complete [project] this weekend`
      }
    ];
  }
}

export const personalizedExampleGenerator = new PersonalizedExampleGenerator();