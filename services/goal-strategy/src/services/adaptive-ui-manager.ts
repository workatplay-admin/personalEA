/**
 * Adaptive UI Manager
 * 
 * Dynamically adjusts user interface components based on user profiles,
 * accessibility needs, and interaction preferences.
 */

import { UserProfile } from './user-profile-detector';
import { logger } from '@/utils/logger';

export interface UIConfiguration {
  layout: {
    complexity: 'minimal' | 'standard' | 'advanced';
    density: 'comfortable' | 'compact' | 'spacious';
    navigation: 'guided' | 'flexible' | 'expert';
  };
  components: {
    showProgressIndicators: boolean;
    showExamples: boolean;
    showTips: boolean;
    showShortcuts: boolean;
    showAdvancedOptions: boolean;
    enableAutoSave: boolean;
    enableUndo: boolean;
  };
  interactions: {
    confirmationLevel: 'none' | 'important' | 'all';
    feedbackStyle: 'subtle' | 'moderate' | 'prominent';
    animationSpeed: 'none' | 'reduced' | 'normal';
    tooltipDelay: number;
  };
  accessibility: {
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    contrast: 'normal' | 'high' | 'highest';
    colorScheme: 'default' | 'deuteranopia' | 'protanopia' | 'tritanopia';
    focusIndicators: 'subtle' | 'prominent' | 'high-visibility';
    screenReaderOptimized: boolean;
  };
  content: {
    language: 'technical' | 'standard' | 'simple';
    exampleCount: number;
    detailLevel: 'minimal' | 'moderate' | 'comprehensive';
    helpStyle: 'inline' | 'sidebar' | 'modal' | 'contextual';
  };
  mobile: {
    optimized: boolean;
    touchTargetSize: 'small' | 'medium' | 'large';
    gesturesEnabled: boolean;
    simplifiedNavigation: boolean;
  };
}

export interface UIElement {
  type: 'button' | 'input' | 'select' | 'card' | 'modal' | 'tooltip' | 'progress' | 'help';
  id: string;
  content: string;
  properties: Record<string, any>;
  accessibility: {
    ariaLabel?: string;
    ariaDescribedBy?: string;
    role?: string;
    tabIndex?: number;
  };
  responsive: {
    mobile?: Record<string, any>;
    tablet?: Record<string, any>;
    desktop?: Record<string, any>;
  };
}

export class AdaptiveUIManager {
  /**
   * Generate UI configuration based on user profile
   */
  generateUIConfiguration(profile: UserProfile): UIConfiguration {
    logger.info('Generating adaptive UI configuration', {
      expertiseLevel: profile.expertiseLevel,
      primaryDomain: profile.primaryDomain,
      accessibilityNeeds: profile.accessibilityNeeds
    });

    const config: UIConfiguration = {
      layout: this.determineLayout(profile),
      components: this.determineComponents(profile),
      interactions: this.determineInteractions(profile),
      accessibility: this.determineAccessibility(profile),
      content: this.determineContent(profile),
      mobile: this.determineMobile(profile)
    };

    return config;
  }

  /**
   * Determine layout configuration
   */
  private determineLayout(profile: UserProfile): UIConfiguration['layout'] {
    const layoutMap: Record<UserProfile['expertiseLevel'], UIConfiguration['layout']> = {
      'beginner': {
        complexity: 'minimal',
        density: 'spacious',
        navigation: 'guided'
      },
      'intermediate': {
        complexity: 'standard',
        density: 'comfortable',
        navigation: 'flexible'
      },
      'advanced': {
        complexity: 'advanced',
        density: 'compact',
        navigation: 'flexible'
      },
      'expert': {
        complexity: 'advanced',
        density: 'compact',
        navigation: 'expert'
      }
    };

    const layout = layoutMap[profile.expertiseLevel];

    // Adjust for accessibility needs
    if (profile.accessibilityNeeds.preferSimpleLanguage) {
      layout.complexity = 'minimal';
      layout.density = 'spacious';
    }

    return layout;
  }

  /**
   * Determine component visibility
   */
  private determineComponents(profile: UserProfile): UIConfiguration['components'] {
    const components: UIConfiguration['components'] = {
      showProgressIndicators: true,
      showExamples: profile.expertiseLevel === 'beginner' || profile.expertiseLevel === 'intermediate',
      showTips: profile.expertiseLevel !== 'expert',
      showShortcuts: profile.expertiseLevel === 'advanced' || profile.expertiseLevel === 'expert',
      showAdvancedOptions: profile.expertiseLevel === 'advanced' || profile.expertiseLevel === 'expert',
      enableAutoSave: true,
      enableUndo: profile.expertiseLevel !== 'beginner'
    };

    // Always show examples if user needs visual cues
    if (profile.accessibilityNeeds.needsVisualCues) {
      components.showExamples = true;
    }

    return components;
  }

  /**
   * Determine interaction patterns
   */
  private determineInteractions(profile: UserProfile): UIConfiguration['interactions'] {
    const interactionMap: Record<UserProfile['expertiseLevel'], UIConfiguration['interactions']> = {
      'beginner': {
        confirmationLevel: 'all',
        feedbackStyle: 'prominent',
        animationSpeed: 'normal',
        tooltipDelay: 500
      },
      'intermediate': {
        confirmationLevel: 'important',
        feedbackStyle: 'moderate',
        animationSpeed: 'normal',
        tooltipDelay: 750
      },
      'advanced': {
        confirmationLevel: 'important',
        feedbackStyle: 'subtle',
        animationSpeed: 'normal',
        tooltipDelay: 1000
      },
      'expert': {
        confirmationLevel: 'none',
        feedbackStyle: 'subtle',
        animationSpeed: 'reduced',
        tooltipDelay: 1500
      }
    };

    const interactions = interactionMap[profile.expertiseLevel];

    // Adjust for accessibility
    if (profile.accessibilityNeeds.preferSimpleLanguage) {
      interactions.feedbackStyle = 'prominent';
    }

    return interactions;
  }

  /**
   * Determine accessibility settings
   */
  private determineAccessibility(profile: UserProfile): UIConfiguration['accessibility'] {
    const accessibility: UIConfiguration['accessibility'] = {
      fontSize: 'medium',
      contrast: 'normal',
      colorScheme: 'default',
      focusIndicators: 'prominent',
      screenReaderOptimized: false
    };

    // Apply accessibility needs
    if (profile.accessibilityNeeds.requiresHighContrast) {
      accessibility.contrast = 'highest';
      accessibility.focusIndicators = 'high-visibility';
    }

    if (profile.accessibilityNeeds.preferSimpleLanguage) {
      accessibility.fontSize = 'large';
    }

    if (profile.languageComplexity === 'basic') {
      accessibility.fontSize = 'large';
    }

    // Age-based adjustments (inferred from patterns)
    if (profile.expertiseLevel === 'beginner' && profile.communicationStyle === 'simple') {
      accessibility.fontSize = 'large';
      accessibility.focusIndicators = 'high-visibility';
    }

    return accessibility;
  }

  /**
   * Determine content presentation
   */
  private determineContent(profile: UserProfile): UIConfiguration['content'] {
    const contentMap: Record<UserProfile['expertiseLevel'], UIConfiguration['content']> = {
      'beginner': {
        language: 'simple',
        exampleCount: 3,
        detailLevel: 'minimal',
        helpStyle: 'inline'
      },
      'intermediate': {
        language: 'standard',
        exampleCount: 2,
        detailLevel: 'moderate',
        helpStyle: 'contextual'
      },
      'advanced': {
        language: 'standard',
        exampleCount: 1,
        detailLevel: 'comprehensive',
        helpStyle: 'sidebar'
      },
      'expert': {
        language: 'technical',
        exampleCount: 0,
        detailLevel: 'comprehensive',
        helpStyle: 'modal'
      }
    };

    const content = contentMap[profile.expertiseLevel];

    // Adjust for communication style
    if (profile.communicationStyle === 'technical') {
      content.language = 'technical';
    } else if (profile.communicationStyle === 'simple') {
      content.language = 'simple';
    }

    // Adjust for preferences
    if (profile.goalPreferences.detailLevel) {
      content.detailLevel = profile.goalPreferences.detailLevel;
    }

    return content;
  }

  /**
   * Determine mobile optimization
   */
  private determineMobile(profile: UserProfile): UIConfiguration['mobile'] {
    return {
      optimized: true,
      touchTargetSize: profile.expertiseLevel === 'beginner' ? 'large' : 'medium',
      gesturesEnabled: profile.expertiseLevel !== 'beginner',
      simplifiedNavigation: profile.expertiseLevel === 'beginner'
    };
  }

  /**
   * Create adaptive UI elements
   */
  createAdaptiveElement(
    elementType: UIElement['type'],
    baseContent: string,
    profile: UserProfile,
    context?: Record<string, any>
  ): UIElement {
    const element: UIElement = {
      type: elementType,
      id: `adaptive-${elementType}-${Date.now()}`,
      content: this.adaptContent(baseContent, profile),
      properties: this.getElementProperties(elementType, profile),
      accessibility: this.getAccessibilityProperties(elementType, baseContent, profile),
      responsive: this.getResponsiveProperties(elementType, profile)
    };

    return element;
  }

  /**
   * Adapt content based on profile
   */
  private adaptContent(content: string, profile: UserProfile): string {
    if (profile.languageComplexity === 'basic' || profile.accessibilityNeeds.preferSimpleLanguage) {
      return this.simplifyContent(content);
    } else if (profile.languageComplexity === 'advanced' && profile.expertiseLevel === 'expert') {
      return this.enhanceContent(content);
    }
    return content;
  }

  /**
   * Simplify content for basic language users
   */
  private simplifyContent(content: string): string {
    const simplifications: Record<string, string> = {
      'Configure': 'Set up',
      'Initialize': 'Start',
      'Implement': 'Do',
      'Optimize': 'Make better',
      'Analyze': 'Look at',
      'Validate': 'Check',
      'Navigate': 'Go to',
      'Submit': 'Send',
      'Cancel': 'Stop'
    };

    let simplified = content;
    Object.entries(simplifications).forEach(([complex, simple]) => {
      simplified = simplified.replace(new RegExp(complex, 'gi'), simple);
    });

    return simplified;
  }

  /**
   * Enhance content for advanced users
   */
  private enhanceContent(content: string): string {
    // Add keyboard shortcuts to button labels
    if (content.includes('Save')) {
      return `${content} (Ctrl+S)`;
    } else if (content.includes('Submit')) {
      return `${content} (Ctrl+Enter)`;
    }
    return content;
  }

  /**
   * Get element-specific properties
   */
  private getElementProperties(
    elementType: UIElement['type'],
    profile: UserProfile
  ): Record<string, any> {
    const baseProperties: Record<string, any> = {
      className: this.getElementClasses(elementType, profile),
      style: this.getElementStyles(elementType, profile)
    };

    // Type-specific properties
    switch (elementType) {
      case 'button':
        baseProperties.size = profile.expertiseLevel === 'beginner' ? 'large' : 'medium';
        baseProperties.variant = profile.expertiseLevel === 'expert' ? 'text' : 'contained';
        break;
      case 'input':
        baseProperties.helperText = profile.expertiseLevel === 'beginner' ? true : false;
        baseProperties.autoComplete = profile.expertiseLevel !== 'beginner';
        break;
      case 'progress':
        baseProperties.showLabel = true;
        baseProperties.showPercentage = profile.expertiseLevel !== 'beginner';
        break;
    }

    return baseProperties;
  }

  /**
   * Get CSS classes based on profile
   */
  private getElementClasses(elementType: string, profile: UserProfile): string {
    const classes: string[] = [`ui-${elementType}`];

    // Expertise level classes
    classes.push(`expertise-${profile.expertiseLevel}`);

    // Accessibility classes
    if (profile.accessibilityNeeds.requiresHighContrast) {
      classes.push('high-contrast');
    }
    if (profile.accessibilityNeeds.preferSimpleLanguage) {
      classes.push('simple-language');
    }

    // Domain-specific styling
    classes.push(`domain-${profile.primaryDomain}`);

    return classes.join(' ');
  }

  /**
   * Get inline styles based on profile
   */
  private getElementStyles(
    elementType: string,
    profile: UserProfile
  ): Record<string, string> {
    const styles: Record<string, string> = {};

    // Font size adjustments
    const fontSizeMap = {
      'small': '14px',
      'medium': '16px',
      'large': '18px',
      'extra-large': '20px'
    };

    const config = this.generateUIConfiguration(profile);
    styles.fontSize = fontSizeMap[config.accessibility.fontSize];

    // Spacing adjustments
    if (config.layout.density === 'spacious') {
      styles.padding = '16px 24px';
      styles.margin = '12px';
    } else if (config.layout.density === 'compact') {
      styles.padding = '8px 12px';
      styles.margin = '4px';
    }

    return styles;
  }

  /**
   * Get accessibility properties
   */
  private getAccessibilityProperties(
    elementType: string,
    content: string,
    profile: UserProfile
  ): UIElement['accessibility'] {
    const accessibility: UIElement['accessibility'] = {
      ariaLabel: content,
      tabIndex: 0
    };

    // Enhanced accessibility for beginners
    if (profile.expertiseLevel === 'beginner') {
      accessibility.ariaDescribedBy = `${elementType}-help-${Date.now()}`;
    }

    // Role assignments
    switch (elementType) {
      case 'button':
        accessibility.role = 'button';
        break;
      case 'progress':
        accessibility.role = 'progressbar';
        break;
      case 'card':
        accessibility.role = 'article';
        break;
    }

    return accessibility;
  }

  /**
   * Get responsive properties
   */
  private getResponsiveProperties(
    elementType: string,
    profile: UserProfile
  ): UIElement['responsive'] {
    return {
      mobile: {
        fontSize: '16px',
        padding: '12px',
        width: '100%'
      },
      tablet: {
        fontSize: '16px',
        padding: '14px',
        width: elementType === 'button' ? 'auto' : '100%'
      },
      desktop: {
        fontSize: profile.expertiseLevel === 'beginner' ? '18px' : '16px',
        padding: profile.expertiseLevel === 'beginner' ? '16px' : '12px',
        width: 'auto'
      }
    };
  }

  /**
   * Generate help content based on profile
   */
  generateHelpContent(
    topic: string,
    profile: UserProfile
  ): {
    title: string;
    content: string;
    examples?: string[];
    tips?: string[];
    videoUrl?: string;
  } {
    const helpContent = {
      title: this.adaptContent(`Help: ${topic}`, profile),
      content: '',
      examples: [] as string[],
      tips: [] as string[]
    };

    // Generate content based on expertise level
    switch (profile.expertiseLevel) {
      case 'beginner':
        helpContent.content = `Let's walk through ${topic} step by step. Don't worry if it seems complex at first - we'll go slowly.`;
        helpContent.examples = [
          'Here\'s a simple example to start with...',
          'Many people begin by...',
          'A common approach is to...'
        ];
        helpContent.tips = [
          'Take your time - there\'s no rush',
          'Feel free to try different approaches',
          'Save your work frequently'
        ];
        (helpContent as any).videoUrl = `/help/videos/${topic}-beginner.mp4`;
        break;

      case 'intermediate':
        helpContent.content = `Here's how to work with ${topic} effectively. You already know the basics, so let's focus on best practices.`;
        helpContent.examples = [
          'Consider this approach for better results...',
          'You might also try...'
        ];
        helpContent.tips = [
          'Use keyboard shortcuts for efficiency',
          'Consider your specific use case'
        ];
        break;

      case 'advanced':
      case 'expert':
        helpContent.content = `Advanced options for ${topic}. Full API documentation and integration details available.`;
        helpContent.tips = [
          'API endpoint: /api/v1/' + topic.toLowerCase().replace(/\s+/g, '-'),
          'Supports batch operations',
          'Custom webhooks available'
        ];
        break;
    }

    // Add domain-specific help
    if (profile.primaryDomain === 'technology' && topic.includes('goal')) {
      helpContent.tips.push('Consider using agile methodology terms');
    } else if (profile.primaryDomain === 'health-fitness' && topic.includes('measurable')) {
      helpContent.tips.push('Include specific metrics like weight, time, or repetitions');
    }

    return helpContent;
  }

  /**
   * Generate onboarding flow based on profile
   */
  generateOnboardingFlow(profile: UserProfile): Array<{
    step: number;
    title: string;
    content: string;
    action: string;
    skippable: boolean;
  }> {
    const baseFlow = [
      {
        step: 1,
        title: 'Welcome!',
        content: '',
        action: 'Next',
        skippable: false
      },
      {
        step: 2,
        title: 'Your First Goal',
        content: '',
        action: 'Try It',
        skippable: false
      },
      {
        step: 3,
        title: 'Making It SMART',
        content: '',
        action: 'Continue',
        skippable: true
      }
    ];

    // Customize based on expertise
    if (profile.expertiseLevel === 'beginner') {
      baseFlow[0].content = 'Welcome! We\'ll help you create clear, achievable goals. Let\'s start with a quick tour.';
      baseFlow[1].content = 'Think of something you want to achieve. It can be anything - we\'ll help you refine it.';
      baseFlow[2].content = 'SMART goals are Specific, Measurable, Achievable, Relevant, and Time-bound. We\'ll guide you through each part.';
      
      // Add extra steps for beginners
      baseFlow.push({
        step: 4,
        title: 'Examples to Inspire You',
        content: 'Here are some examples from people like you. Click any example to use it as a starting point.',
        action: 'See Examples',
        skippable: true
      });
    } else if (profile.expertiseLevel === 'expert') {
      baseFlow[0].content = 'Welcome. Let\'s set up your advanced preferences.';
      baseFlow[1].content = 'Import existing goals or create new strategic objectives.';
      baseFlow[2].content = 'Configure automated tracking and reporting.';
      
      // Different flow for experts
      baseFlow.length = 2; // Shorter flow
      baseFlow[1].action = 'Configure';
    }

    // Add domain-specific content
    if (profile.primaryDomain) {
      baseFlow.forEach(step => {
        step.content += ` We've noticed you're interested in ${this.formatDomain(profile.primaryDomain)}, so we'll show relevant examples.`;
      });
    }

    return baseFlow;
  }

  /**
   * Format domain name
   */
  private formatDomain(domain: string): string {
    const domainNames: Record<string, string> = {
      'technology': 'technology and programming',
      'health-fitness': 'health and fitness',
      'business': 'business growth',
      'education': 'learning and education',
      'finance': 'financial goals',
      'career': 'career development',
      'personal': 'personal development',
      'creative': 'creative projects',
      'social-impact': 'social impact'
    };
    return domainNames[domain] || domain;
  }
}

export const adaptiveUIManager = new AdaptiveUIManager();