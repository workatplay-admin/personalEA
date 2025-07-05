/**
 * Conversation Memory Service
 * 
 * Persistent memory management for conversational AI sessions
 * with ruv-swarm neural coordination integration.
 */

import { logger } from '@/utils/logger';
import { ConversationMemory } from './enhanced-llm-chat-coordinator';

export interface MemorySnapshot {
  sessionId: string;
  timestamp: Date;
  memory: ConversationMemory;
  metadata: {
    version: string;
    checksum: string;
    compression: boolean;
  };
}

export interface MemorySearchQuery {
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  scoreThreshold?: number;
  domain?: string;
  phase?: ConversationMemory['conversationPhase'];
}

export class ConversationMemoryService {
  private memoryStore: Map<string, MemorySnapshot>;
  private indexStore: Map<string, Set<string>>; // For fast lookups
  private readonly MEMORY_VERSION = '1.0.0';

  constructor() {
    this.memoryStore = new Map();
    this.indexStore = new Map();
    this.initializeIndices();
  }

  /**
   * Initialize search indices
   */
  private initializeIndices(): void {
    // User index
    this.indexStore.set('user', new Set());
    // Domain index
    this.indexStore.set('domain', new Set());
    // Phase index
    this.indexStore.set('phase', new Set());
    // High-performing sessions index
    this.indexStore.set('highPerforming', new Set());
  }

  /**
   * Store conversation memory with indexing
   */
  async storeMemory(memory: ConversationMemory): Promise<void> {
    try {
      const snapshot: MemorySnapshot = {
        sessionId: memory.sessionId,
        timestamp: new Date(),
        memory: { ...memory }, // Deep copy
        metadata: {
          version: this.MEMORY_VERSION,
          checksum: this.generateChecksum(memory),
          compression: false
        }
      };

      // Store in main memory
      this.memoryStore.set(memory.sessionId, snapshot);

      // Update indices
      this.updateIndices(memory);

      logger.info('Memory stored successfully', {
        sessionId: memory.sessionId,
        userId: memory.userId,
        phase: memory.conversationPhase,
        overallScore: memory.currentGoal.scores.overall
      });

    } catch (error) {
      logger.error('Failed to store conversation memory', {
        sessionId: memory.sessionId,
        error
      });
      throw new Error('Memory storage failed');
    }
  }

  /**
   * Retrieve conversation memory
   */
  async retrieveMemory(sessionId: string): Promise<ConversationMemory | null> {
    try {
      const snapshot = this.memoryStore.get(sessionId);
      if (!snapshot) {
        return null;
      }

      // Verify checksum
      const currentChecksum = this.generateChecksum(snapshot.memory);
      if (currentChecksum !== snapshot.metadata.checksum) {
        logger.warn('Memory checksum mismatch', { sessionId });
        return null;
      }

      logger.info('Memory retrieved successfully', {
        sessionId,
        storedAt: snapshot.timestamp
      });

      return { ...snapshot.memory }; // Return copy

    } catch (error) {
      logger.error('Failed to retrieve conversation memory', {
        sessionId,
        error
      });
      return null;
    }
  }

  /**
   * Update indices for fast searches
   */
  private updateIndices(memory: ConversationMemory): void {
    const { sessionId, userId, conversationPhase, contextData, currentGoal } = memory;

    // User index
    if (userId) {
      const userSessions = this.indexStore.get(`user:${userId}`) || new Set();
      userSessions.add(sessionId);
      this.indexStore.set(`user:${userId}`, userSessions);
    }

    // Domain index
    if (contextData.userProfile.domain) {
      const domainSessions = this.indexStore.get(`domain:${contextData.userProfile.domain}`) || new Set();
      domainSessions.add(sessionId);
      this.indexStore.set(`domain:${contextData.userProfile.domain}`, domainSessions);
    }

    // Phase index
    const phaseSessions = this.indexStore.get(`phase:${conversationPhase}`) || new Set();
    phaseSessions.add(sessionId);
    this.indexStore.set(`phase:${conversationPhase}`, phaseSessions);

    // High-performing sessions (>80% overall score)
    if (currentGoal.scores.overall >= 80) {
      const highPerformingSessions = this.indexStore.get('highPerforming') || new Set();
      highPerformingSessions.add(sessionId);
      this.indexStore.set('highPerforming', highPerformingSessions);
    }
  }

  /**
   * Search conversation memories
   */
  async searchMemories(query: MemorySearchQuery): Promise<ConversationMemory[]> {
    try {
      let candidateSessionIds: Set<string> = new Set();
      let firstFilter = true;

      // Filter by user
      if (query.userId) {
        const userSessions = this.indexStore.get(`user:${query.userId}`) || new Set();
        if (firstFilter) {
          candidateSessionIds = new Set(userSessions);
          firstFilter = false;
        } else {
          candidateSessionIds = new Set([...candidateSessionIds].filter(id => userSessions.has(id)));
        }
      }

      // Filter by domain
      if (query.domain) {
        const domainSessions = this.indexStore.get(`domain:${query.domain}`) || new Set();
        if (firstFilter) {
          candidateSessionIds = new Set(domainSessions);
          firstFilter = false;
        } else {
          candidateSessionIds = new Set([...candidateSessionIds].filter(id => domainSessions.has(id)));
        }
      }

      // Filter by phase
      if (query.phase) {
        const phaseSessions = this.indexStore.get(`phase:${query.phase}`) || new Set();
        if (firstFilter) {
          candidateSessionIds = new Set(phaseSessions);
          firstFilter = false;
        } else {
          candidateSessionIds = new Set([...candidateSessionIds].filter(id => phaseSessions.has(id)));
        }
      }

      // If no filters, get all sessions
      if (firstFilter) {
        candidateSessionIds = new Set(this.memoryStore.keys());
      }

      // Retrieve and filter memories
      const memories: ConversationMemory[] = [];
      for (const sessionId of candidateSessionIds) {
        const memory = await this.retrieveMemory(sessionId);
        if (memory && this.matchesQuery(memory, query)) {
          memories.push(memory);
        }
      }

      // Sort by timestamp (most recent first)
      memories.sort((a, b) => {
        const aTimestamp = a.messages[a.messages.length - 1]?.timestamp || new Date(0);
        const bTimestamp = b.messages[b.messages.length - 1]?.timestamp || new Date(0);
        const aTime = typeof aTimestamp === 'string' ? new Date(aTimestamp).getTime() : aTimestamp.getTime();
        const bTime = typeof bTimestamp === 'string' ? new Date(bTimestamp).getTime() : bTimestamp.getTime();
        return bTime - aTime;
      });

      logger.info('Memory search completed', {
        query,
        resultsCount: memories.length
      });

      return memories;

    } catch (error) {
      logger.error('Memory search failed', { query, error });
      return [];
    }
  }

  /**
   * Check if memory matches query criteria
   */
  private matchesQuery(memory: ConversationMemory, query: MemorySearchQuery): boolean {
    // Date range filter
    if (query.dateRange) {
      const lastMessageTime = memory.messages[memory.messages.length - 1]?.timestamp;
      if (lastMessageTime) {
        const messageDate = typeof lastMessageTime === 'string' ? new Date(lastMessageTime) : lastMessageTime;
        if (messageDate < query.dateRange.start || messageDate > query.dateRange.end) {
          return false;
        }
      }
    }

    // Score threshold filter
    if (query.scoreThreshold !== undefined) {
      if (memory.currentGoal.scores.overall < query.scoreThreshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get memory analytics for neural learning
   */
  async getMemoryAnalytics(userId?: string): Promise<{
    totalSessions: number;
    averageScore: number;
    completionRate: number;
    commonPatterns: string[];
    domainDistribution: Record<string, number>;
    phaseDistribution: Record<string, number>;
  }> {
    try {
      let memories: ConversationMemory[] = [];
      
      if (userId) {
        memories = await this.searchMemories({ userId });
      } else {
        // Get all memories
        for (const sessionId of this.memoryStore.keys()) {
          const memory = await this.retrieveMemory(sessionId);
          if (memory) memories.push(memory);
        }
      }

      const analytics = {
        totalSessions: memories.length,
        averageScore: 0,
        completionRate: 0,
        commonPatterns: [] as string[],
        domainDistribution: {} as Record<string, number>,
        phaseDistribution: {} as Record<string, number>
      };

      if (memories.length === 0) {
        return analytics;
      }

      // Calculate average score
      const totalScore = memories.reduce((sum, memory) => sum + memory.currentGoal.scores.overall, 0);
      analytics.averageScore = totalScore / memories.length;

      // Calculate completion rate
      const completedSessions = memories.filter(memory => 
        memory.conversationPhase === 'completion' || memory.currentGoal.scores.overall >= 80
      ).length;
      analytics.completionRate = (completedSessions / memories.length) * 100;

      // Domain distribution
      memories.forEach(memory => {
        const domain = memory.contextData.userProfile.domain;
        analytics.domainDistribution[domain] = (analytics.domainDistribution[domain] || 0) + 1;
      });

      // Phase distribution
      memories.forEach(memory => {
        const phase = memory.conversationPhase;
        analytics.phaseDistribution[phase] = (analytics.phaseDistribution[phase] || 0) + 1;
      });

      // Extract common patterns from neural state
      const allPatterns = memories.flatMap(memory => memory.neuralState.patterns);
      const patternCounts = new Map<string, number>();
      
      allPatterns.forEach(pattern => {
        patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
      });

      analytics.commonPatterns = Array.from(patternCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([pattern]) => pattern);

      logger.info('Memory analytics generated', {
        userId,
        analytics: {
          totalSessions: analytics.totalSessions,
          averageScore: analytics.averageScore,
          completionRate: analytics.completionRate
        }
      });

      return analytics;

    } catch (error) {
      logger.error('Failed to generate memory analytics', { userId, error });
      throw new Error('Analytics generation failed');
    }
  }

  /**
   * Clean up old memories (retention policy)
   */
  async cleanupOldMemories(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;
      const sessionsToDelete: string[] = [];

      for (const [sessionId, snapshot] of this.memoryStore.entries()) {
        if (snapshot.timestamp < cutoffDate) {
          sessionsToDelete.push(sessionId);
        }
      }

      // Delete old sessions
      sessionsToDelete.forEach(sessionId => {
        this.memoryStore.delete(sessionId);
        deletedCount++;
      });

      // Rebuild indices
      this.initializeIndices();
      for (const snapshot of this.memoryStore.values()) {
        this.updateIndices(snapshot.memory);
      }

      logger.info('Memory cleanup completed', {
        deletedCount,
        retentionDays,
        remainingSessions: this.memoryStore.size
      });

      return deletedCount;

    } catch (error) {
      logger.error('Memory cleanup failed', { retentionDays, error });
      throw new Error('Cleanup failed');
    }
  }

  /**
   * Generate checksum for memory integrity
   */
  private generateChecksum(memory: ConversationMemory): string {
    const dataString = JSON.stringify({
      sessionId: memory.sessionId,
      userId: memory.userId,
      messagesCount: memory.messages.length,
      scores: memory.currentGoal.scores,
      phase: memory.conversationPhase
    });

    // Simple hash function (in production, use a proper crypto hash)
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Export memories for backup
   */
  async exportMemories(userId?: string): Promise<MemorySnapshot[]> {
    try {
      const memories: MemorySnapshot[] = [];
      
      for (const snapshot of this.memoryStore.values()) {
        if (!userId || snapshot.memory.userId === userId) {
          memories.push({ ...snapshot });
        }
      }

      logger.info('Memories exported', {
        userId,
        count: memories.length
      });

      return memories;

    } catch (error) {
      logger.error('Memory export failed', { userId, error });
      throw new Error('Export failed');
    }
  }

  /**
   * Import memories from backup
   */
  async importMemories(snapshots: MemorySnapshot[]): Promise<number> {
    try {
      let importedCount = 0;

      for (const snapshot of snapshots) {
        // Validate snapshot
        if (this.validateSnapshot(snapshot)) {
          this.memoryStore.set(snapshot.sessionId, snapshot);
          this.updateIndices(snapshot.memory);
          importedCount++;
        } else {
          logger.warn('Invalid snapshot skipped', {
            sessionId: snapshot.sessionId
          });
        }
      }

      logger.info('Memories imported', {
        importedCount,
        totalAttempted: snapshots.length
      });

      return importedCount;

    } catch (error) {
      logger.error('Memory import failed', { error });
      throw new Error('Import failed');
    }
  }

  /**
   * Validate memory snapshot
   */
  private validateSnapshot(snapshot: MemorySnapshot): boolean {
    try {
      // Check required fields
      if (!snapshot.sessionId || !snapshot.memory || !snapshot.timestamp) {
        return false;
      }

      // Check memory structure
      const memory = snapshot.memory;
      if (!memory.currentGoal || !memory.conversationPhase || !memory.contextData) {
        return false;
      }

      // Validate scores
      const scores = memory.currentGoal.scores;
      if (typeof scores.overall !== 'number' || scores.overall < 0 || scores.overall > 100) {
        return false;
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    totalSessions: number;
    memoryUsage: number;
    indexSize: number;
    oldestSession: Date | null;
    newestSession: Date | null;
  } {
    const totalSessions = this.memoryStore.size;
    let oldestSession: Date | null = null;
    let newestSession: Date | null = null;

    for (const snapshot of this.memoryStore.values()) {
      if (!oldestSession || snapshot.timestamp < oldestSession) {
        oldestSession = snapshot.timestamp;
      }
      if (!newestSession || snapshot.timestamp > newestSession) {
        newestSession = snapshot.timestamp;
      }
    }

    // Rough memory usage calculation
    const memoryUsage = JSON.stringify(Array.from(this.memoryStore.values())).length;
    const indexSize = this.indexStore.size;

    return {
      totalSessions,
      memoryUsage,
      indexSize,
      oldestSession,
      newestSession
    };
  }
}

export const conversationMemoryService = new ConversationMemoryService();