/**
 * Memory Persistence Manager
 * 
 * Manages persistent memory storage using ruv-swarm's DAA capabilities.
 * Provides cross-session memory, learning patterns, and knowledge sharing.
 * 
 * Features:
 * - Persistent storage across sessions
 * - Pattern-based retrieval
 * - Knowledge graph construction
 * - Automatic memory optimization
 * - Cross-agent knowledge sharing
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createContextLogger } from '@/utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface MemoryEntry {
  key: string;
  value: any;
  metadata: {
    timestamp: string;
    sessionId?: string;
    agentId?: string;
    cognitivePattern?: string;
    accessCount: number;
    lastAccessed: string;
    importance: number;
    tags: string[];
  };
}

export interface MemoryQuery {
  pattern?: string;
  tags?: string[];
  sessionId?: string;
  agentId?: string;
  minImportance?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'importance' | 'accessCount';
}

export interface KnowledgeGraph {
  nodes: Map<string, MemoryEntry>;
  edges: Map<string, Set<string>>;
  clusters: Map<string, Set<string>>;
}

export class MemoryPersistenceManager {
  private memoryStore: Map<string, MemoryEntry>;
  private knowledgeGraph: KnowledgeGraph;
  private logger;
  private memoryPath: string;
  private isInitialized: boolean = false;

  constructor(memoryPath?: string) {
    this.memoryStore = new Map();
    this.knowledgeGraph = {
      nodes: new Map(),
      edges: new Map(),
      clusters: new Map()
    };
    this.logger = createContextLogger('memory-persistence-manager');
    this.memoryPath = memoryPath || path.join(process.cwd(), 'memory', 'neural-persistence');
  }

  /**
   * Initialize DAA memory capabilities
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create memory directory if it doesn't exist
      await fs.mkdir(this.memoryPath, { recursive: true });

      // Initialize DAA service
      const { stdout } = await execAsync(
        'npx ruv-swarm mcp call daa_init --enableLearning true --enableCoordination true --persistenceMode disk'
      );
      
      this.logger.info('DAA memory service initialized', { response: stdout });

      // Load existing memories from disk
      await this.loadMemoriesFromDisk();
      
      this.isInitialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize memory persistence', { error });
      throw error;
    }
  }

  /**
   * Store memory entry with DAA persistence
   */
  async store(key: string, value: any, metadata?: Partial<MemoryEntry['metadata']>): Promise<void> {
    await this.initialize();

    const entry: MemoryEntry = {
      key,
      value,
      metadata: {
        timestamp: new Date().toISOString(),
        accessCount: 0,
        lastAccessed: new Date().toISOString(),
        importance: metadata?.importance || this.calculateImportance(value),
        tags: metadata?.tags || this.extractTags(key, value),
        ...metadata
      }
    };

    // Store in memory
    this.memoryStore.set(key, entry);
    this.knowledgeGraph.nodes.set(key, entry);

    // Update knowledge graph connections
    await this.updateKnowledgeGraph(entry);

    // Persist to disk
    await this.persistToDisk(entry);

    // Notify DAA system
    try {
      await execAsync(
        `npx ruv-swarm hook notification --message "Memory stored: ${key}" --telemetry true`
      );
    } catch (error) {
      this.logger.warn('Failed to notify DAA system', { error });
    }

    this.logger.debug('Memory stored', { key, tags: entry.metadata.tags });
  }

  /**
   * Retrieve memories based on query
   */
  async retrieve(query: string | MemoryQuery): Promise<MemoryEntry[]> {
    await this.initialize();

    let results: MemoryEntry[] = [];

    if (typeof query === 'string') {
      // Pattern-based retrieval
      const pattern = new RegExp(query.replace(/\*/g, '.*'));
      results = Array.from(this.memoryStore.values()).filter(entry => 
        pattern.test(entry.key)
      );
    } else {
      // Complex query
      results = Array.from(this.memoryStore.values()).filter(entry => {
        if (query.pattern && !new RegExp(query.pattern).test(entry.key)) return false;
        if (query.tags && !query.tags.some(tag => entry.metadata.tags.includes(tag))) return false;
        if (query.sessionId && entry.metadata.sessionId !== query.sessionId) return false;
        if (query.agentId && entry.metadata.agentId !== query.agentId) return false;
        if (query.minImportance && entry.metadata.importance < query.minImportance) return false;
        return true;
      });

      // Sort results
      if (query.sortBy) {
        results.sort((a, b) => {
          switch (query.sortBy) {
            case 'timestamp':
              return new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime();
            case 'importance':
              return b.metadata.importance - a.metadata.importance;
            case 'accessCount':
              return b.metadata.accessCount - a.metadata.accessCount;
            default:
              return 0;
          }
        });
      }

      // Apply limit
      if (query.limit) {
        results = results.slice(0, query.limit);
      }
    }

    // Update access counts
    for (const entry of results) {
      entry.metadata.accessCount++;
      entry.metadata.lastAccessed = new Date().toISOString();
    }

    this.logger.debug('Memories retrieved', { 
      query: typeof query === 'string' ? query : query.pattern,
      count: results.length 
    });

    return results;
  }

  /**
   * Share knowledge between agents using DAA
   */
  async shareKnowledge(
    sourceAgentId: string,
    targetAgentIds: string[],
    domain: string,
    knowledge: any
  ): Promise<void> {
    await this.initialize();

    try {
      // Use DAA knowledge sharing
      const { stdout } = await execAsync(
        `npx ruv-swarm mcp call daa_knowledge_share ` +
        `--sourceAgentId "${sourceAgentId}" ` +
        `--targetAgentIds '${JSON.stringify(targetAgentIds)}' ` +
        `--knowledgeDomain "${domain}" ` +
        `--knowledgeContent '${JSON.stringify(knowledge)}'`
      );

      this.logger.info('Knowledge shared via DAA', {
        sourceAgentId,
        targetAgentIds,
        domain,
        response: stdout
      });

      // Store shared knowledge reference
      await this.store(
        `shared/${domain}/${Date.now()}`,
        knowledge,
        {
          agentId: sourceAgentId,
          tags: ['shared', domain, ...targetAgentIds]
        }
      );
    } catch (error) {
      this.logger.error('Failed to share knowledge', { error });
      throw error;
    }
  }

  /**
   * Get related memories using knowledge graph
   */
  async getRelatedMemories(key: string, maxDepth: number = 2): Promise<MemoryEntry[]> {
    await this.initialize();

    const visited = new Set<string>();
    const related: MemoryEntry[] = [];

    const traverse = (currentKey: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentKey)) return;
      visited.add(currentKey);

      const edges = this.knowledgeGraph.edges.get(currentKey);
      if (!edges) return;

      for (const relatedKey of edges) {
        const entry = this.memoryStore.get(relatedKey);
        if (entry && !related.find(e => e.key === relatedKey)) {
          related.push(entry);
          traverse(relatedKey, depth + 1);
        }
      }
    };

    traverse(key, 0);
    
    // Sort by importance and relevance
    related.sort((a, b) => b.metadata.importance - a.metadata.importance);

    return related;
  }

  /**
   * Optimize memory by removing low-importance entries
   */
  async optimizeMemory(maxEntries: number = 10000): Promise<number> {
    await this.initialize();

    if (this.memoryStore.size <= maxEntries) return 0;

    // Sort by importance and access patterns
    const entries = Array.from(this.memoryStore.values());
    entries.sort((a, b) => {
      const scoreA = a.metadata.importance * Math.log(a.metadata.accessCount + 1);
      const scoreB = b.metadata.importance * Math.log(b.metadata.accessCount + 1);
      return scoreB - scoreA;
    });

    // Remove least important entries
    const toRemove = entries.slice(maxEntries);
    let removed = 0;

    for (const entry of toRemove) {
      this.memoryStore.delete(entry.key);
      this.knowledgeGraph.nodes.delete(entry.key);
      this.knowledgeGraph.edges.delete(entry.key);
      
      // Remove from disk
      try {
        const filePath = path.join(this.memoryPath, `${entry.key.replace(/\//g, '_')}.json`);
        await fs.unlink(filePath);
        removed++;
      } catch (error) {
        // File might not exist
      }
    }

    this.logger.info('Memory optimized', { removed, remaining: this.memoryStore.size });
    return removed;
  }

  /**
   * Create memory snapshot for backup
   */
  async createSnapshot(snapshotId?: string): Promise<string> {
    await this.initialize();

    const id = snapshotId || `snapshot-${Date.now()}`;
    const snapshotPath = path.join(this.memoryPath, 'snapshots', `${id}.json`);

    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });

    const snapshot = {
      id,
      timestamp: new Date().toISOString(),
      entries: Array.from(this.memoryStore.entries()),
      knowledgeGraph: {
        edges: Array.from(this.knowledgeGraph.edges.entries()).map(([k, v]) => [k, Array.from(v)]),
        clusters: Array.from(this.knowledgeGraph.clusters.entries()).map(([k, v]) => [k, Array.from(v)])
      }
    };

    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
    
    this.logger.info('Memory snapshot created', { id, entries: this.memoryStore.size });
    return id;
  }

  /**
   * Restore from snapshot
   */
  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshotPath = path.join(this.memoryPath, 'snapshots', `${snapshotId}.json`);
    
    try {
      const data = await fs.readFile(snapshotPath, 'utf-8');
      const snapshot = JSON.parse(data);

      // Clear current memory
      this.memoryStore.clear();
      this.knowledgeGraph.nodes.clear();
      this.knowledgeGraph.edges.clear();
      this.knowledgeGraph.clusters.clear();

      // Restore entries
      for (const [key, entry] of snapshot.entries) {
        this.memoryStore.set(key, entry);
        this.knowledgeGraph.nodes.set(key, entry);
      }

      // Restore knowledge graph
      for (const [key, edges] of snapshot.knowledgeGraph.edges) {
        this.knowledgeGraph.edges.set(key, new Set(edges));
      }
      for (const [key, nodes] of snapshot.knowledgeGraph.clusters) {
        this.knowledgeGraph.clusters.set(key, new Set(nodes));
      }

      this.logger.info('Memory restored from snapshot', { snapshotId, entries: this.memoryStore.size });
    } catch (error) {
      this.logger.error('Failed to restore snapshot', { snapshotId, error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async loadMemoriesFromDisk(): Promise<void> {
    try {
      const files = await fs.readdir(this.memoryPath);
      const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('snapshot'));

      for (const file of jsonFiles) {
        try {
          const data = await fs.readFile(path.join(this.memoryPath, file), 'utf-8');
          const entry = JSON.parse(data) as MemoryEntry;
          this.memoryStore.set(entry.key, entry);
          this.knowledgeGraph.nodes.set(entry.key, entry);
        } catch (error) {
          this.logger.warn('Failed to load memory file', { file, error });
        }
      }

      this.logger.info('Memories loaded from disk', { count: this.memoryStore.size });
    } catch (error) {
      // Directory might not exist yet
      this.logger.debug('No existing memories to load');
    }
  }

  private async persistToDisk(entry: MemoryEntry): Promise<void> {
    const fileName = `${entry.key.replace(/\//g, '_')}.json`;
    const filePath = path.join(this.memoryPath, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
  }

  private calculateImportance(value: any): number {
    // Base importance on content complexity and type
    let score = 0.5;

    if (typeof value === 'object' && value !== null) {
      score += Object.keys(value).length * 0.01;
      if (value.smartScores) score += 0.2;
      if (value.phaseTransition) score += 0.3;
      if (value.decision) score += 0.15;
    }

    return Math.min(score, 1.0);
  }

  private extractTags(key: string, value: any): string[] {
    const tags: string[] = [];
    
    // Extract from key
    const keyParts = key.split('/').filter(Boolean);
    tags.push(...keyParts);

    // Extract from value
    if (typeof value === 'object' && value !== null) {
      if (value.type) tags.push(value.type);
      if (value.phase) tags.push(`phase:${value.phase}`);
      if (value.category) tags.push(value.category);
      if (value.cognitivePattern) tags.push(`pattern:${value.cognitivePattern}`);
    }

    return [...new Set(tags)];
  }

  private async updateKnowledgeGraph(entry: MemoryEntry): Promise<void> {
    // Find related entries by tags
    const relatedKeys = new Set<string>();
    
    for (const [key, otherEntry] of this.memoryStore.entries()) {
      if (key === entry.key) continue;
      
      const sharedTags = entry.metadata.tags.filter(tag => 
        otherEntry.metadata.tags.includes(tag)
      );
      
      if (sharedTags.length > 0) {
        relatedKeys.add(key);
      }
    }

    // Update edges
    if (relatedKeys.size > 0) {
      this.knowledgeGraph.edges.set(entry.key, relatedKeys);
      
      // Update reverse edges
      for (const relatedKey of relatedKeys) {
        const reverseEdges = this.knowledgeGraph.edges.get(relatedKey) || new Set();
        reverseEdges.add(entry.key);
        this.knowledgeGraph.edges.set(relatedKey, reverseEdges);
      }
    }

    // Update clusters based on common patterns
    const pattern = entry.metadata.cognitivePattern;
    if (pattern) {
      const cluster = this.knowledgeGraph.clusters.get(pattern) || new Set();
      cluster.add(entry.key);
      this.knowledgeGraph.clusters.set(pattern, cluster);
    }
  }
}

export default MemoryPersistenceManager;