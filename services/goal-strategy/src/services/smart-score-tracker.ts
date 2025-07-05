/**
 * SMART Score Tracker
 * 
 * Tracks and validates SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
 * scores throughout the conversation, ensuring 80% threshold is met before phase transitions.
 * 
 * Features:
 * - Real-time score extraction from LLM responses
 * - Phase transition validation with 80% threshold
 * - Historical score tracking and trending
 * - Intelligent score improvement suggestions
 * - Neural pattern optimization based on scores
 */

import { createContextLogger } from '@/utils/logger';
import { MemoryPersistenceManager } from './memory-persistence-manager';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SmartScores extends Record<string, number> {
  specific: number;
  measurable: number;
  achievable: number;
  relevant: number;
  timeBound: number;
  overall?: number;
}

export interface ScoreUpdate {
  previousScores: SmartScores;
  newScores: SmartScores;
  improvements: string[];
  suggestions: string[];
  phaseTransition?: {
    from: string;
    to: string;
    reason: string;
  };
  newPhase?: string;
}

export interface ScoreHistory {
  conversationId: string;
  timestamp: string;
  scores: SmartScores;
  phase: string;
  improvements: string[];
}

export interface PhaseThresholds {
  [phase: string]: {
    minOverallScore: number;
    minIndividualScore?: number;
    requiredComponents?: string[];
  };
}

export class SmartScoreTracker {
  private logger;
  private memoryManager: MemoryPersistenceManager;
  private scoreHistory: Map<string, ScoreHistory[]>;
  private phaseThresholds: PhaseThresholds;
  
  constructor() {
    this.logger = createContextLogger('smart-score-tracker');
    this.memoryManager = new MemoryPersistenceManager();
    this.scoreHistory = new Map();
    
    // Define phase transition thresholds
    this.phaseThresholds = {
      'initial': {
        minOverallScore: 0,
        minIndividualScore: 0
      },
      'goal_refinement': {
        minOverallScore: 0.3,
        minIndividualScore: 0.2,
        requiredComponents: ['specific']
      },
      'milestone_planning': {
        minOverallScore: 0.5,
        minIndividualScore: 0.4,
        requiredComponents: ['specific', 'measurable']
      },
      'task_breakdown': {
        minOverallScore: 0.65,
        minIndividualScore: 0.5,
        requiredComponents: ['specific', 'measurable', 'achievable']
      },
      'dependency_mapping': {
        minOverallScore: 0.75,
        minIndividualScore: 0.6,
        requiredComponents: ['specific', 'measurable', 'achievable', 'relevant']
      },
      'estimation': {
        minOverallScore: 0.8,
        minIndividualScore: 0.7,
        requiredComponents: ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']
      },
      'validation': {
        minOverallScore: 0.85,
        minIndividualScore: 0.75
      },
      'complete': {
        minOverallScore: 0.9,
        minIndividualScore: 0.8
      }
    };
  }

  /**
   * Extract SMART scores from LLM response
   */
  async extractScores(response: string, context?: any): Promise<SmartScores> {
    const scores: SmartScores = {
      specific: 0,
      measurable: 0,
      achievable: 0,
      relevant: 0,
      timeBound: 0
    };

    // Pattern matching for score indicators
    const scorePatterns = {
      specific: [
        /specific(?:ity)?[:\s]+(\d+(?:\.\d+)?)/i,
        /clarity[:\s]+(\d+(?:\.\d+)?)/i,
        /well[- ]defined[:\s]+(\d+(?:\.\d+)?)/i
      ],
      measurable: [
        /measurable[:\s]+(\d+(?:\.\d+)?)/i,
        /quantifiable[:\s]+(\d+(?:\.\d+)?)/i,
        /metrics?[:\s]+(\d+(?:\.\d+)?)/i
      ],
      achievable: [
        /achievable[:\s]+(\d+(?:\.\d+)?)/i,
        /realistic[:\s]+(\d+(?:\.\d+)?)/i,
        /feasible[:\s]+(\d+(?:\.\d+)?)/i
      ],
      relevant: [
        /relevant[:\s]+(\d+(?:\.\d+)?)/i,
        /aligned[:\s]+(\d+(?:\.\d+)?)/i,
        /meaningful[:\s]+(\d+(?:\.\d+)?)/i
      ],
      timeBound: [
        /time[- ]bound[:\s]+(\d+(?:\.\d+)?)/i,
        /deadline[:\s]+(\d+(?:\.\d+)?)/i,
        /timeline[:\s]+(\d+(?:\.\d+)?)/i
      ]
    };

    // Extract scores from response
    for (const [component, patterns] of Object.entries(scorePatterns)) {
      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match && match[1]) {
          const score = parseFloat(match[1]);
          scores[component as keyof SmartScores] = Math.min(score > 1 ? score / 100 : score, 1);
          break;
        }
      }
    }

    // If no explicit scores found, analyze content quality
    if (Object.values(scores).every(s => s === 0)) {
      scores.specific = this.analyzeSpecificity(response, context);
      scores.measurable = this.analyzeMeasurability(response, context);
      scores.achievable = this.analyzeAchievability(response, context);
      scores.relevant = this.analyzeRelevance(response, context);
      scores.timeBound = this.analyzeTimeBound(response, context);
    }

    // Calculate overall score
    scores.overall = this.calculateOverallScore(scores);

    this.logger.debug('Extracted SMART scores', { scores });
    return scores;
  }

  /**
   * Update scores for a conversation
   */
  async updateScores(
    conversationId: string,
    newScores: SmartScores
  ): Promise<ScoreUpdate> {
    // Get previous scores
    const history = this.scoreHistory.get(conversationId) || [];
    const previousEntry = history[history.length - 1];
    const previousScores = previousEntry?.scores || {
      specific: 0,
      measurable: 0,
      achievable: 0,
      relevant: 0,
      timeBound: 0,
      overall: 0
    };

    // Calculate improvements
    const improvements = this.calculateImprovements(previousScores, newScores);
    
    // Generate suggestions for further improvement
    const suggestions = this.generateSuggestions(newScores);

    // Check for phase transition
    const currentPhase = previousEntry?.phase || 'initial';
    const phaseTransition = await this.checkPhaseTransition(
      currentPhase,
      newScores
    );

    // Create new history entry
    const newEntry: ScoreHistory = {
      conversationId,
      timestamp: new Date().toISOString(),
      scores: newScores,
      phase: phaseTransition?.newPhase || currentPhase,
      improvements
    };

    // Update history
    history.push(newEntry);
    this.scoreHistory.set(conversationId, history);

    // Store in persistent memory
    await this.memoryManager.store(
      `scores/${conversationId}/${Date.now()}`,
      newEntry,
      {
        tags: ['smart-scores', conversationId, newEntry.phase],
        importance: newScores.overall || 0.5
      }
    );

    // Notify neural system of score update
    if (phaseTransition) {
      await this.notifyNeuralSystem(conversationId, phaseTransition);
    }

    return {
      previousScores,
      newScores,
      improvements,
      suggestions,
      phaseTransition: phaseTransition?.transition,
      newPhase: phaseTransition?.newPhase
    };
  }

  /**
   * Validate if phase transition is allowed
   */
  async validatePhaseTransition(
    fromPhase: string,
    toPhase: string,
    currentScores: SmartScores
  ): Promise<{ allowed: boolean; reason?: string }> {
    const threshold = this.phaseThresholds[toPhase];
    if (!threshold) {
      return { allowed: false, reason: `Unknown phase: ${toPhase}` };
    }

    const overall = currentScores.overall || this.calculateOverallScore(currentScores);

    // Check overall score requirement
    if (overall < threshold.minOverallScore) {
      return {
        allowed: false,
        reason: `Overall score ${(overall * 100).toFixed(1)}% is below required ${(threshold.minOverallScore * 100).toFixed(1)}% for ${toPhase}`
      };
    }

    // Check individual score requirements
    if (threshold.minIndividualScore) {
      const belowThreshold = Object.entries(currentScores)
        .filter(([key]) => key !== 'overall')
        .filter(([_, score]) => score < threshold.minIndividualScore);

      if (belowThreshold.length > 0) {
        const components = belowThreshold.map(([key]) => key).join(', ');
        return {
          allowed: false,
          reason: `Components ${components} are below required ${(threshold.minIndividualScore * 100).toFixed(1)}% for ${toPhase}`
        };
      }
    }

    // Check required components
    if (threshold.requiredComponents) {
      const missing = threshold.requiredComponents.filter(
        comp => currentScores[comp as keyof SmartScores] < 0.5
      );

      if (missing.length > 0) {
        return {
          allowed: false,
          reason: `Required components not sufficiently defined: ${missing.join(', ')}`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get score history for a conversation
   */
  async getScoreHistory(
    conversationId: string,
    limit?: number
  ): Promise<ScoreHistory[]> {
    const history = this.scoreHistory.get(conversationId) || [];
    
    // Also load from persistent memory
    const memoryEntries = await this.memoryManager.retrieve({
      pattern: `scores/${conversationId}/*`,
      sortBy: 'timestamp',
      limit: limit || 100
    });

    // Merge and deduplicate
    const allEntries = [
      ...history,
      ...memoryEntries.map(e => e.value as ScoreHistory)
    ];

    // Sort by timestamp and remove duplicates
    const unique = Array.from(
      new Map(allEntries.map(e => [e.timestamp, e])).values()
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return limit ? unique.slice(-limit) : unique;
  }

  /**
   * Get score improvement suggestions
   */
  generateSuggestions(scores: SmartScores): string[] {
    const suggestions: string[] = [];
    const threshold = 0.8;

    if (scores.specific < threshold) {
      suggestions.push(
        'Make the goal more specific by adding clear details about what exactly needs to be accomplished.'
      );
    }

    if (scores.measurable < threshold) {
      suggestions.push(
        'Add quantifiable metrics or success criteria to make the goal measurable.'
      );
    }

    if (scores.achievable < threshold) {
      suggestions.push(
        'Break down the goal into smaller, more manageable milestones to ensure achievability.'
      );
    }

    if (scores.relevant < threshold) {
      suggestions.push(
        'Clarify how this goal aligns with broader objectives or personal/organizational priorities.'
      );
    }

    if (scores.timeBound < threshold) {
      suggestions.push(
        'Set specific deadlines or timeframes for both the overall goal and key milestones.'
      );
    }

    return suggestions;
  }

  /**
   * Private helper methods
   */

  private calculateOverallScore(scores: SmartScores): number {
    const weights = {
      specific: 0.25,
      measurable: 0.2,
      achievable: 0.2,
      relevant: 0.15,
      timeBound: 0.2
    };

    return Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (scores[key as keyof SmartScores] || 0) * weight;
    }, 0);
  }

  private calculateImprovements(
    previous: SmartScores,
    current: SmartScores
  ): string[] {
    const improvements: string[] = [];
    const threshold = 0.05; // 5% improvement threshold

    for (const key of ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']) {
      const prev = previous[key as keyof SmartScores] || 0;
      const curr = current[key as keyof SmartScores] || 0;
      
      if (curr - prev >= threshold) {
        const improvement = ((curr - prev) * 100).toFixed(1);
        improvements.push(`${key}: +${improvement}%`);
      }
    }

    return improvements;
  }

  private async checkPhaseTransition(
    currentPhase: string,
    scores: SmartScores
  ): Promise<{ newPhase: string; transition?: any } | null> {
    // Define phase progression
    const phaseProgression = [
      'initial',
      'goal_refinement',
      'milestone_planning',
      'task_breakdown',
      'dependency_mapping',
      'estimation',
      'validation',
      'complete'
    ];

    const currentIndex = phaseProgression.indexOf(currentPhase);
    if (currentIndex === -1 || currentIndex === phaseProgression.length - 1) {
      return null;
    }

    // Check if ready for next phase
    const nextPhase = phaseProgression[currentIndex + 1];
    const validation = await this.validatePhaseTransition(currentPhase, nextPhase, scores);

    if (validation.allowed) {
      return {
        newPhase: nextPhase,
        transition: {
          from: currentPhase,
          to: nextPhase,
          reason: `SMART scores meet threshold for ${nextPhase}`
        }
      };
    }

    return null;
  }

  private async notifyNeuralSystem(
    conversationId: string,
    transition: any
  ): Promise<void> {
    try {
      await execAsync(
        `npx ruv-swarm hook notification --message "Phase transition: ${transition.transition.from} -> ${transition.transition.to}" --telemetry true`
      );
    } catch (error) {
      this.logger.warn('Failed to notify neural system', { error });
    }
  }

  // Content analysis methods for implicit scoring
  private analyzeSpecificity(content: string, context?: any): number {
    let score = 0.3; // Base score
    
    // Check for specific details
    if (content.match(/\b(exactly|specifically|precisely)\b/i)) score += 0.1;
    if (content.match(/\b\d+\b/)) score += 0.1; // Contains numbers
    if (content.match(/\b(who|what|where|when|why|how)\b/i)) score += 0.1;
    if (content.length > 100) score += 0.1; // Detailed description
    if (context?.goal && content.includes(context.goal)) score += 0.2;
    
    return Math.min(score, 1);
  }

  private analyzeMeasurability(content: string, context?: any): number {
    let score = 0.2; // Base score
    
    // Check for measurable elements
    if (content.match(/\b\d+%?\b/)) score += 0.2; // Percentages or numbers
    if (content.match(/\b(metric|measure|track|count|quantity)\b/i)) score += 0.2;
    if (content.match(/\b(increase|decrease|improve|reduce)\s+by\s+\d+/i)) score += 0.2;
    if (content.match(/\b(kpi|indicator|benchmark)\b/i)) score += 0.1;
    if (context?.metrics) score += 0.1;
    
    return Math.min(score, 1);
  }

  private analyzeAchievability(content: string, context?: any): number {
    let score = 0.4; // Base score
    
    // Check for achievability indicators
    if (content.match(/\b(realistic|achievable|feasible|possible)\b/i)) score += 0.2;
    if (content.match(/\b(milestone|phase|step|stage)\b/i)) score += 0.1;
    if (content.match(/\b(resource|budget|team|tool)\b/i)) score += 0.1;
    if (!content.match(/\b(impossible|unrealistic|unfeasible)\b/i)) score += 0.1;
    if (context?.milestones?.length > 0) score += 0.1;
    
    return Math.min(score, 1);
  }

  private analyzeRelevance(content: string, context?: any): number {
    let score = 0.5; // Base score
    
    // Check for relevance indicators
    if (content.match(/\b(align|support|contribute|relate)\b/i)) score += 0.1;
    if (content.match(/\b(objective|goal|purpose|mission)\b/i)) score += 0.1;
    if (content.match(/\b(important|critical|essential|priority)\b/i)) score += 0.1;
    if (content.match(/\b(because|therefore|consequently)\b/i)) score += 0.1;
    if (context?.userContext) score += 0.1;
    
    return Math.min(score, 1);
  }

  private analyzeTimeBound(content: string, context?: any): number {
    let score = 0.1; // Base score
    
    // Check for time-related elements
    if (content.match(/\b\d+\s*(day|week|month|year|hour)s?\b/i)) score += 0.3;
    if (content.match(/\b(deadline|due|by|before|until)\b/i)) score += 0.2;
    if (content.match(/\b(timeline|schedule|timeframe)\b/i)) score += 0.2;
    if (content.match(/\b(Q[1-4]|quarter|semester)\b/i)) score += 0.1;
    if (content.match(/\b\d{4}\b/)) score += 0.1; // Year
    if (context?.estimatedTime) score += 0.1;
    
    return Math.min(score, 1);
  }
}

export default SmartScoreTracker;