# Migration Strategy: Monolith to Microservices

## Executive Summary

This document outlines a comprehensive migration strategy for transitioning the existing goal-strategy monolithic service to a microservices architecture. The strategy emphasizes zero-downtime migration, data integrity, and minimal disruption to existing users.

## Migration Principles

### Core Principles
1. **Zero Downtime**: No service interruption during migration
2. **Gradual Rollout**: Progressive migration with rollback capability
3. **Data Integrity**: No data loss or corruption
4. **API Compatibility**: Maintain backward compatibility
5. **Performance Parity**: New services must match or exceed current performance

## Migration Phases

### Phase 1: Preparation (Week 1)

#### 1.1 Environment Setup
```yaml
Environments:
  - Current: Monolithic service (production)
  - Staging: Parallel microservices deployment
  - Canary: Limited production traffic (5-10%)
  - Production: Full microservices deployment
```

#### 1.2 Database Replication
```sql
-- Set up logical replication from monolith PostgreSQL
CREATE PUBLICATION goal_data_sync FOR TABLE 
  goals, milestones, wbs_tasks, dependencies;

-- Subscribe in new microservices database
CREATE SUBSCRIPTION goal_core_sync
  CONNECTION 'host=monolith-db dbname=goal_strategy'
  PUBLICATION goal_data_sync;
```

#### 1.3 API Gateway Configuration
```nginx
# Initial configuration - all traffic to monolith
location /api/v1/ {
    proxy_pass http://monolith-service:8085;
}

# Prepare new routes (inactive)
location /api/v2/ {
    # Will route to microservices
    return 503;
}
```

### Phase 2: Dual-Write Implementation (Week 2)

#### 2.1 Event Publishing in Monolith
```typescript
// Add to existing monolith services
export class DualWriteAdapter {
  private kafkaProducer: KafkaProducer;
  
  async wrapGoalCreation(originalMethod: Function) {
    return async (...args) => {
      // Original monolith logic
      const result = await originalMethod.apply(this, args);
      
      // Publish to new microservices
      await this.kafkaProducer.send({
        topic: 'goal-events',
        messages: [{
          key: result.id,
          value: JSON.stringify({
            type: 'goal.created',
            data: result,
            timestamp: new Date().toISOString()
          })
        }]
      });
      
      return result;
    };
  }
}
```

#### 2.2 Shadow Mode Testing
```typescript
// New microservices consume events but don't serve traffic
export class ShadowModeProcessor {
  async handleGoalCreated(event: GoalCreatedEvent) {
    try {
      // Process in new system
      const newResult = await this.goalService.create(event.data);
      
      // Compare with monolith result
      const comparison = await this.compareResults(
        event.data,
        newResult
      );
      
      // Log discrepancies for analysis
      if (!comparison.matches) {
        await this.logDiscrepancy(comparison);
      }
      
      // Track shadow mode metrics
      await this.metrics.record('shadow.goal.created', {
        matches: comparison.matches,
        processingTime: comparison.duration
      });
    } catch (error) {
      await this.alerting.notify('Shadow mode error', error);
    }
  }
}
```

### Phase 3: Canary Deployment (Week 3)

#### 3.1 Traffic Splitting Configuration
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: goal-strategy-routing
spec:
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: microservices-gateway
      weight: 100
  - route:
    - destination:
        host: monolith-service
      weight: 95
    - destination:
        host: microservices-gateway
      weight: 5  # 5% canary traffic
```

#### 3.2 Feature Flag Integration
```typescript
export class FeatureFlagService {
  async shouldUseNewService(userId: string, feature: string): boolean {
    // Check user participation
    const flags = await this.getFlags(userId);
    
    // Gradual rollout logic
    if (flags[feature] === 'enabled') return true;
    if (flags[feature] === 'disabled') return false;
    
    // Percentage-based rollout
    const rolloutPercentage = await this.getRolloutPercentage(feature);
    const userHash = this.hashUserId(userId);
    
    return userHash <= rolloutPercentage;
  }
}

// In API Gateway
app.use('/api/*', async (req, res, next) => {
  const useNewService = await featureFlags.shouldUseNewService(
    req.user.id,
    'microservices-migration'
  );
  
  if (useNewService) {
    req.headers['x-route-to'] = 'microservices';
  } else {
    req.headers['x-route-to'] = 'monolith';
  }
  
  next();
});
```

### Phase 4: Progressive Rollout (Week 4-5)

#### 4.1 Rollout Schedule
```yaml
Week 4:
  Day 1-2: 10% traffic to microservices
  Day 3-4: 25% traffic to microservices
  Day 5-7: 50% traffic to microservices

Week 5:
  Day 1-2: 75% traffic to microservices
  Day 3-4: 90% traffic to microservices
  Day 5: 100% traffic to microservices
  Day 6-7: Monolith decommissioning prep
```

#### 4.2 Monitoring and Rollback
```typescript
export class MigrationMonitor {
  private readonly thresholds = {
    errorRate: 0.001,      // 0.1% error rate
    latencyP95: 200,       // 200ms p95 latency
    availabilty: 0.999     // 99.9% availability
  };
  
  async checkHealth(): Promise<HealthStatus> {
    const metrics = await this.collectMetrics();
    
    // Check against thresholds
    const violations = [];
    
    if (metrics.errorRate > this.thresholds.errorRate) {
      violations.push({
        metric: 'errorRate',
        current: metrics.errorRate,
        threshold: this.thresholds.errorRate
      });
    }
    
    if (metrics.latencyP95 > this.thresholds.latencyP95) {
      violations.push({
        metric: 'latencyP95',
        current: metrics.latencyP95,
        threshold: this.thresholds.latencyP95
      });
    }
    
    // Automatic rollback if critical
    if (violations.length > 0 && this.isCritical(violations)) {
      await this.initiateRollback();
    }
    
    return {
      healthy: violations.length === 0,
      violations,
      action: violations.length > 0 ? 'rollback' : 'continue'
    };
  }
}
```

## Data Migration Strategy

### 1. Schema Evolution
```sql
-- Add migration metadata to track progress
ALTER TABLE goals ADD COLUMN IF NOT EXISTS 
  migration_status VARCHAR(20) DEFAULT 'pending',
  migration_timestamp TIMESTAMP,
  sync_version INTEGER DEFAULT 1;

-- Create migration tracking table
CREATE TABLE migration_progress (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100),
  total_records INTEGER,
  migrated_records INTEGER,
  status VARCHAR(20),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_details JSONB
);
```

### 2. Batch Migration Process
```python
class DataMigrator:
    def __init__(self, source_db, target_db):
        self.source = source_db
        self.target = target_db
        self.batch_size = 1000
        
    async def migrate_table(self, table_name: str):
        """Migrate data in batches with progress tracking"""
        total_records = await self.count_records(table_name)
        migrated = 0
        
        # Create progress entry
        progress_id = await self.create_progress_entry(
            table_name, 
            total_records
        )
        
        try:
            while migrated < total_records:
                # Fetch batch
                batch = await self.fetch_batch(
                    table_name, 
                    offset=migrated,
                    limit=self.batch_size
                )
                
                # Transform if needed
                transformed = await self.transform_batch(batch, table_name)
                
                # Insert into new system
                await self.insert_batch(transformed, table_name)
                
                # Update progress
                migrated += len(batch)
                await self.update_progress(progress_id, migrated)
                
                # Rate limiting to avoid overload
                await asyncio.sleep(0.1)
                
        except Exception as e:
            await self.handle_migration_error(progress_id, e)
            raise
```

### 3. Data Validation
```typescript
export class DataValidator {
  async validateMigration(table: string): Promise<ValidationResult> {
    const checks = [
      this.checkRecordCounts(table),
      this.checkDataIntegrity(table),
      this.checkRelationships(table),
      this.spotCheckRecords(table)
    ];
    
    const results = await Promise.all(checks);
    
    return {
      table,
      valid: results.every(r => r.valid),
      checks: results,
      timestamp: new Date()
    };
  }
  
  private async checkRecordCounts(table: string) {
    const sourceCount = await this.sourceDb.count(table);
    const targetCount = await this.targetDb.count(table);
    
    return {
      check: 'record_count',
      valid: sourceCount === targetCount,
      source: sourceCount,
      target: targetCount,
      difference: Math.abs(sourceCount - targetCount)
    };
  }
}
```

## API Compatibility Layer

### 1. Adapter Pattern Implementation
```typescript
// Translate old API format to new microservices format
export class APICompatibilityAdapter {
  constructor(
    private goalService: GoalCoreService,
    private conversationService: ConversationEngineService
  ) {}
  
  // Old endpoint: POST /api/v1/goals/smart-translate
  async translateGoal(req: Request, res: Response) {
    try {
      // Map old request format
      const newFormat = {
        description: req.body.goalDescription,
        userId: req.user.id,
        context: {
          category: req.body.category,
          timeframe: req.body.timeframe
        }
      };
      
      // Call new service
      const result = await this.goalService.createGoal(newFormat);
      
      // Map response to old format
      const oldFormat = {
        id: result.goalId,
        originalGoal: req.body.goalDescription,
        smartGoal: {
          description: result.description,
          specific: result.smartScores.specific.feedback,
          measurable: result.smartScores.measurable.feedback,
          achievable: result.smartScores.achievable.feedback,
          relevant: result.smartScores.relevant.feedback,
          timeBound: result.smartScores.timeBound.feedback
        },
        score: result.smartScores.overall
      };
      
      res.json(oldFormat);
    } catch (error) {
      // Maintain old error format
      res.status(500).json({
        error: 'Failed to translate goal',
        message: error.message
      });
    }
  }
}
```

### 2. Deprecation Notices
```typescript
export class DeprecationMiddleware {
  private deprecatedEndpoints = new Map([
    ['/api/v1/goals/smart-translate', {
      newEndpoint: '/api/v2/goals',
      deprecationDate: '2025-12-31',
      migrationGuide: 'https://docs.personalea.com/migration/v2'
    }]
  ]);
  
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const deprecation = this.deprecatedEndpoints.get(req.path);
      
      if (deprecation) {
        res.setHeader('X-Deprecated', 'true');
        res.setHeader('X-Deprecation-Date', deprecation.deprecationDate);
        res.setHeader('X-New-Endpoint', deprecation.newEndpoint);
        res.setHeader('X-Migration-Guide', deprecation.migrationGuide);
        
        // Log usage for tracking
        logger.warn('Deprecated endpoint used', {
          endpoint: req.path,
          user: req.user?.id,
          timestamp: new Date()
        });
      }
      
      next();
    };
  }
}
```

## Rollback Strategy

### 1. Instant Rollback Mechanism
```yaml
# Kubernetes ConfigMap for routing
apiVersion: v1
kind: ConfigMap
metadata:
  name: routing-config
data:
  route-to-service: "microservices"  # or "monolith"
  
---
# Quick rollback script
#!/bin/bash
kubectl patch configmap routing-config \
  -p '{"data":{"route-to-service":"monolith"}}'
  
# Restart gateway to apply
kubectl rollout restart deployment/api-gateway
```

### 2. Data Rollback
```sql
-- Reverse replication setup
CREATE PUBLICATION microservices_rollback FOR TABLE 
  goals, milestones, wbs_tasks, dependencies
  WHERE (migration_status = 'completed');

-- In monolith database
CREATE SUBSCRIPTION monolith_rollback
  CONNECTION 'host=microservices-db'
  PUBLICATION microservices_rollback;
```

## Success Metrics

### Migration KPIs
1. **Zero Downtime**: No service interruptions
2. **Data Integrity**: 100% data consistency
3. **Performance**: ≤ 5% latency increase during migration
4. **Error Rate**: < 0.1% increase in errors
5. **Rollback Time**: < 5 minutes if needed

### Monitoring Dashboard
```yaml
Metrics to Track:
  - Request routing distribution (monolith vs microservices)
  - Error rates by service
  - Latency comparison (p50, p95, p99)
  - Database replication lag
  - Shadow mode discrepancies
  - Feature flag adoption rate
  - API compatibility layer usage
```

## Post-Migration Tasks

### 1. Monolith Decommissioning
- Archive monolith codebase
- Clean up unused infrastructure
- Document lessons learned
- Update all documentation

### 2. Optimization
- Remove compatibility layers
- Optimize service communication
- Fine-tune resource allocation
- Implement advanced features

### 3. Team Training
- Microservices best practices
- New deployment procedures
- Debugging distributed systems
- Monitoring and alerting

## Risk Mitigation

### Identified Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Dual-write pattern, validation checks |
| Service communication failures | Medium | Circuit breakers, retries, fallbacks |
| Performance degradation | Medium | Shadow mode testing, gradual rollout |
| Rollback complexity | High | Instant routing switch, data sync |
| Team knowledge gaps | Medium | Training, documentation, pair programming |

## Timeline Summary

- **Week 1**: Preparation and setup
- **Week 2**: Dual-write implementation
- **Week 3**: Canary deployment (5-10%)
- **Week 4-5**: Progressive rollout (10-100%)
- **Week 6**: Monolith decommissioning
- **Week 7**: Optimization and cleanup

This migration strategy ensures a smooth, safe transition from monolith to microservices with minimal risk and maximum flexibility for rollback if needed.