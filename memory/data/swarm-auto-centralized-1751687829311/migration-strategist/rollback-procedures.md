# Rollback Procedures for Goal Strategy Service Migration

## Overview

This document provides step-by-step rollback procedures for each phase of the goal strategy service migration. Each procedure is designed to be executed quickly with minimal service disruption.

## Rollback Decision Matrix

| Trigger | Severity | Decision Time | Rollback Phase |
|---------|----------|---------------|----------------|
| Data corruption | Critical | Immediate | Any phase |
| >5% error rate | High | 5 minutes | Phase 2-4 |
| Performance degradation >50% | High | 15 minutes | Phase 2-4 |
| Security vulnerability | Critical | Immediate | Any phase |
| User complaints >10% | Medium | 1 hour | Phase 2-3 |
| Integration failures | High | 30 minutes | Any phase |

## Phase-Specific Rollback Procedures

### Phase 1 Rollback: Parallel Implementation

**Trigger Conditions**:
- New service fails health checks consistently
- Data sync lag exceeds 5 minutes
- Resource consumption exceeds limits

**Rollback Duration**: 15-30 minutes

#### Step 1: Stop New Service Traffic (2 minutes)
```bash
# Remove from load balancer
kubectl patch service goal-strategy-v2 \
  -p '{"spec":{"selector":{"version":"none"}}}'

# Verify no active connections
kubectl exec -it goal-strategy-v2-pod -- netstat -an | grep ESTABLISHED
```

#### Step 2: Halt Data Synchronization (5 minutes)
```bash
# Stop sync jobs
kubectl scale deployment data-sync-job --replicas=0

# Disable database triggers
psql goal_strategy_v2 << EOF
ALTER TABLE goals DISABLE TRIGGER sync_to_v1;
ALTER TABLE milestones DISABLE TRIGGER sync_to_v1;
ALTER TABLE tasks DISABLE TRIGGER sync_to_v1;
EOF

# Clear sync queues
redis-cli DEL goal_sync_queue:*
```

#### Step 3: Preserve State for Analysis (5 minutes)
```bash
# Backup current state
pg_dump goal_strategy_v2 > rollback_backup_$(date +%Y%m%d_%H%M%S).sql

# Export logs
kubectl logs deployment/goal-strategy-v2 --all-containers > v2_logs_rollback.txt

# Capture metrics
curl http://prometheus:9090/api/v1/query_range \
  -d 'query=service_metrics{service="goal-strategy-v2"}' \
  -d 'start=1hour_ago' > v2_metrics_rollback.json
```

#### Step 4: Clean Up Resources (5 minutes)
```bash
# Scale down deployment
kubectl scale deployment goal-strategy-v2 --replicas=0

# Remove configuration
kubectl delete configmap goal-strategy-v2-config

# Clean up persistent volumes (after backup)
kubectl delete pvc goal-strategy-v2-data
```

#### Verification Checklist:
- [ ] All traffic routed to v1 service
- [ ] No active v2 connections
- [ ] Sync jobs stopped
- [ ] State preserved for analysis
- [ ] Resources cleaned up

### Phase 2 Rollback: Feature Flag Rollout

**Trigger Conditions**:
- Error rate spike in new service
- Performance regression detected
- Critical bug discovered

**Rollback Duration**: 5-10 minutes

#### Step 1: Immediate Traffic Diversion (1 minute)
```typescript
// Emergency feature flag override
await featureFlagService.update({
  flag: 'useNewGoalService',
  enabled: false,
  percentage: 0,
  override: 'EMERGENCY_ROLLBACK',
  reason: 'Performance degradation detected'
});

// Force cache refresh
await redis.del('feature_flags:*');
await broadcastConfigUpdate();
```

#### Step 2: Circuit Breaker Activation (2 minutes)
```typescript
// Activate circuit breaker to prevent retry storms
circuitBreaker.open('goal-strategy-v2');

// Update service mesh configuration
const serviceConfig = {
  'goal-strategy-v2': {
    circuitBreaker: {
      state: 'OPEN',
      fallback: 'goal-strategy-v1'
    }
  }
};

await updateServiceMesh(serviceConfig);
```

#### Step 3: User Session Migration (5 minutes)
```typescript
// Migrate active sessions back to v1
const activeSessions = await redis.keys('session:v2:*');

for (const sessionKey of activeSessions) {
  const sessionData = await redis.get(sessionKey);
  const v1Key = sessionKey.replace(':v2:', ':v1:');
  
  await redis.set(v1Key, sessionData);
  await redis.del(sessionKey);
}

// Clear v2 session cache
await redis.del('session:v2:*');
```

#### Step 4: Monitoring and Validation (2 minutes)
```bash
# Verify all traffic on v1
watch -n 1 'kubectl top pods -l app=goal-strategy'

# Check error rates returning to normal
curl -s http://prometheus:9090/api/v1/query \
  -d 'query=rate(http_errors_total[5m])' | jq '.data.result'

# Validate user experience
./scripts/smoke_test.sh --service v1
```

#### Communication Template:
```markdown
Subject: Goal Strategy Service - Rollback Initiated

Team,

We've initiated a rollback of the new goal strategy service due to [ISSUE].

**Impact**: Minimal - Users automatically routed to stable service
**Duration**: Rollback complete, monitoring for 30 minutes
**Action Required**: None - Automated systems handling transition

Details: [Link to incident]
```

### Phase 3 Rollback: Data Migration

**Trigger Conditions**:
- Data integrity check failures
- Missing data detected
- Transformation errors

**Rollback Duration**: 1-2 hours

#### Step 1: Stop All Write Operations (5 minutes)
```sql
-- Enable read-only mode on v2
ALTER DATABASE goal_strategy_v2 SET default_transaction_read_only = true;

-- Revoke write permissions
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public 
FROM goal_service_user;

-- Kill active write connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'goal_strategy_v2'
AND state = 'active'
AND query LIKE '%INSERT%' OR query LIKE '%UPDATE%' OR query LIKE '%DELETE%';
```

#### Step 2: Restore from Backup (45 minutes)
```bash
#!/bin/bash
# Restoration script

BACKUP_FILE="/backups/pre_migration_backup.sql"
RESTORE_LOG="/var/log/restore_$(date +%Y%m%d_%H%M%S).log"

echo "Starting database restore at $(date)" >> $RESTORE_LOG

# Drop v2 database
psql -U postgres << EOF
DROP DATABASE IF EXISTS goal_strategy_v2;
CREATE DATABASE goal_strategy_v2;
EOF

# Restore from backup
pg_restore -U postgres -d goal_strategy_v2 -v $BACKUP_FILE 2>&1 | tee -a $RESTORE_LOG

# Verify restoration
psql -U postgres -d goal_strategy_v2 << EOF
SELECT 
  COUNT(*) as goals_count,
  MAX(updated_at) as latest_update
FROM goals;
EOF
```

#### Step 3: Revert Service Configuration (10 minutes)
```yaml
# revert-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: goal-strategy-config
data:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/goal_strategy"
  REDIS_URL: "redis://redis:6379/0"
  SERVICE_VERSION: "v1"
  MIGRATION_STATUS: "rolled_back"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: goal-strategy
spec:
  template:
    spec:
      containers:
      - name: goal-strategy
        image: goal-strategy:v1-stable
        env:
        - name: DATABASE_URL
          value: "postgresql://user:pass@postgres:5432/goal_strategy"
```

```bash
kubectl apply -f revert-config.yaml
kubectl rollout restart deployment/goal-strategy
```

#### Step 4: Data Validation (20 minutes)
```typescript
// Comprehensive validation script
async function validateRollback() {
  const checks = {
    recordCounts: await validateRecordCounts(),
    dataIntegrity: await validateDataIntegrity(),
    relationships: await validateRelationships(),
    businessRules: await validateBusinessRules()
  };
  
  const report = {
    timestamp: new Date().toISOString(),
    rollbackPhase: 'data_migration',
    validationResults: checks,
    success: Object.values(checks).every(check => check.passed)
  };
  
  await saveValidationReport(report);
  
  if (!report.success) {
    await notifyOpsTeam('Rollback validation failed', report);
  }
  
  return report;
}
```

### Phase 4 Rollback: Service Deprecation

**Trigger Conditions**:
- Critical issues discovered post-deprecation
- Major feature gaps identified
- Compliance requirements not met

**Rollback Duration**: 30 minutes - 1 hour

#### Step 1: Rapid Service Restoration (10 minutes)
```bash
#!/bin/bash
# Emergency restoration script

# Pull and deploy v1 from registry
docker pull registry.company.com/goal-strategy:v1-final
docker tag registry.company.com/goal-strategy:v1-final goal-strategy:active

# Deploy using saved configuration
kubectl apply -f /backups/v1-deployment-final.yaml

# Scale up immediately
kubectl scale deployment goal-strategy-v1 --replicas=5

# Update service selector
kubectl patch service goal-strategy \
  -p '{"spec":{"selector":{"version":"v1"}}}'
```

#### Step 2: DNS and Load Balancer Updates (10 minutes)
```bash
# Update load balancer configuration
cat > /etc/haproxy/haproxy.cfg << EOF
backend goal_service
  balance roundrobin
  server v1-1 goal-strategy-v1-1:3000 check
  server v1-2 goal-strategy-v1-2:3000 check
  server v1-3 goal-strategy-v1-3:3000 check
  server v1-4 goal-strategy-v1-4:3000 check
  server v1-5 goal-strategy-v1-5:3000 check
EOF

# Reload configuration
systemctl reload haproxy

# Update DNS if needed
nsupdate << EOF
update delete api.goals.company.com A
update add api.goals.company.com 300 A 10.0.0.100
send
EOF
```

#### Step 3: Re-enable Integrations (10 minutes)
```typescript
// Re-enable all integrations
const integrations = [
  { service: 'email-processor', endpoint: 'http://goal-strategy:3000' },
  { service: 'calendar-service', endpoint: 'http://goal-strategy:3000' },
  { service: 'notification-service', endpoint: 'http://goal-strategy:3000' }
];

for (const integration of integrations) {
  await updateServiceRegistry({
    service: integration.service,
    config: {
      goalServiceUrl: integration.endpoint,
      version: 'v1',
      enabled: true
    }
  });
}

// Verify connectivity
for (const integration of integrations) {
  const health = await checkIntegrationHealth(integration.service);
  if (!health.ok) {
    console.error(`Integration ${integration.service} failed health check`);
  }
}
```

#### Step 4: User Communication (Throughout)
```typescript
// In-app notification
await notificationService.broadcast({
  type: 'system',
  priority: 'high',
  message: 'We are experiencing technical difficulties and have temporarily reverted to our previous system. Your data is safe and no action is required.',
  duration: 3600000 // 1 hour
});

// Email communication
await emailService.sendBulk({
  template: 'service_rollback',
  recipients: 'all_active_users',
  data: {
    reason: 'stability improvements',
    impact: 'minimal',
    eta: '24 hours'
  }
});
```

## Automated Rollback System

### Rollback Orchestrator
```typescript
class RollbackOrchestrator {
  private phases = {
    phase1: new Phase1Rollback(),
    phase2: new Phase2Rollback(),
    phase3: new Phase3Rollback(),
    phase4: new Phase4Rollback()
  };
  
  async executeRollback(phase: string, reason: string) {
    const rollback = this.phases[phase];
    
    try {
      // Pre-rollback checks
      await this.validateRollbackPossible(phase);
      
      // Create rollback checkpoint
      const checkpoint = await this.createCheckpoint();
      
      // Execute rollback
      await rollback.execute({
        reason,
        checkpoint,
        automated: true
      });
      
      // Validate rollback success
      const validation = await this.validateRollback(phase);
      
      if (!validation.success) {
        throw new Error('Rollback validation failed');
      }
      
      // Notify stakeholders
      await this.notifyStakeholders(phase, reason, 'success');
      
    } catch (error) {
      await this.handleRollbackFailure(phase, error);
      throw error;
    }
  }
  
  private async validateRollbackPossible(phase: string): Promise<void> {
    const checks = await this.runPreRollbackChecks(phase);
    
    if (!checks.canRollback) {
      throw new Error(`Cannot rollback ${phase}: ${checks.reason}`);
    }
  }
  
  private async handleRollbackFailure(phase: string, error: Error) {
    await this.notifyOncall({
      severity: 'critical',
      phase,
      error: error.message,
      runbook: `https://runbooks.company.com/rollback-failed-${phase}`
    });
  }
}
```

### Monitoring During Rollback
```yaml
rollback_monitoring:
  alerts:
    - name: rollback_in_progress
      condition: rollback_status == "active"
      notification: immediate
      
    - name: rollback_duration_exceeded
      condition: rollback_duration > expected_duration * 1.5
      severity: warning
      
    - name: rollback_failed
      condition: rollback_status == "failed"
      severity: critical
      page: true
  
  dashboards:
    rollback_progress:
      - rollback_phase_status
      - services_affected
      - traffic_distribution
      - error_rates_comparison
      - user_impact_metrics
    
    system_health:
      - service_availability
      - database_connections
      - queue_depths
      - cache_hit_rates
      - api_response_times
```

## Post-Rollback Actions

### Immediate (First 2 hours)
1. **Stabilization**
   - Monitor all services for stability
   - Verify no data loss
   - Check integration health

2. **Communication**
   - Update status page
   - Send stakeholder updates
   - Brief support team

3. **Documentation**
   - Record rollback timeline
   - Document trigger cause
   - Note any issues encountered

### Short-term (First 24 hours)
1. **Root Cause Analysis**
   - Gather all logs and metrics
   - Interview involved engineers
   - Create incident timeline

2. **Impact Assessment**
   - Calculate user impact
   - Assess data consistency
   - Review financial impact

3. **Planning**
   - Define fixes needed
   - Update migration plan
   - Schedule retry timeline

### Long-term (First week)
1. **Process Improvements**
   - Update rollback procedures
   - Enhance monitoring
   - Improve testing

2. **Technical Fixes**
   - Implement identified fixes
   - Add missing tests
   - Update documentation

3. **Stakeholder Management**
   - Present lessons learned
   - Update project timeline
   - Adjust resource allocation

## Rollback Success Criteria

Each rollback must meet these criteria:

1. **Service Availability**: >99.9% uptime during rollback
2. **Data Integrity**: Zero data loss confirmed
3. **User Impact**: <1% of users affected
4. **Duration**: Within expected timeframe
5. **Communication**: All stakeholders informed

## Emergency Contacts

| Role | Contact | When to Call |
|------|---------|--------------|
| On-call Engineer | PagerDuty | Any rollback |
| Database Admin | DBA Team Slack | Data issues |
| Security Team | security@ | Security concerns |
| VP Engineering | Direct line | Phase 3-4 rollback |
| PR Team | pr@ | Public impact |

## Conclusion

These rollback procedures provide clear, actionable steps for safely reverting the goal strategy service migration at any phase. Regular drills and updates ensure the team remains prepared to execute these procedures effectively when needed.