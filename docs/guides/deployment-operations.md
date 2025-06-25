# Deployment and Operations Guide

This guide covers deploying PersonalEA to various environments and maintaining operational excellence.

## Environment Overview

PersonalEA supports multiple deployment environments:

- **Development**: Local development with hot reload
- **Staging**: Production-like environment for testing
- **Production**: Live user-facing environment
- **Mock**: Testing environment with mock services

## Docker Deployment

### Development Environment

```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up

# Start specific services
docker-compose -f docker-compose.dev.yml up goal-strategy frontend

# Rebuild after changes
docker-compose -f docker-compose.dev.yml up --build
```

### Staging Environment

```bash
# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# View logs
docker-compose -f docker-compose.staging.yml logs -f

# Scale services
docker-compose -f docker-compose.staging.yml up -d --scale goal-strategy=3
```

### Production Deployment

```bash
# Production deployment with environment file
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Rolling update
docker-compose -f docker-compose.prod.yml up -d --no-deps goal-strategy

# Health check
docker-compose -f docker-compose.prod.yml exec goal-strategy npm run health
```

## Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Deploy with Helm

```bash
# Add PersonalEA Helm repository
helm repo add personalea https://charts.personalea.com
helm repo update

# Install PersonalEA
helm install personalea personalea/personalea \
  --namespace personalea \
  --create-namespace \
  --values values.yaml
```

### Custom Values

```yaml
# values.yaml
global:
  environment: production
  domain: personalea.com

goalStrategy:
  replicas: 3
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"

postgresql:
  enabled: true
  auth:
    postgresPassword: "secure-password"
  persistence:
    size: 20Gi

redis:
  enabled: true
  auth:
    enabled: true
    password: "secure-redis-password"
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: |
          docker build -t personalea/goal-strategy:${{ github.sha }} ./services/goal-strategy
          docker build -t personalea/frontend:${{ github.sha }} ./testing/goal-strategy-test
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push personalea/goal-strategy:${{ github.sha }}
          docker push personalea/frontend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/goal-strategy goal-strategy=personalea/goal-strategy:${{ github.sha }}
          kubectl set image deployment/frontend frontend=personalea/frontend:${{ github.sha }}
          kubectl rollout status deployment/goal-strategy
          kubectl rollout status deployment/frontend
```

## Monitoring and Observability

### Prometheus Metrics

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'personalea'
    static_configs:
      - targets: ['goal-strategy:3001', 'email-service:3002']
```

### Grafana Dashboards

Key metrics to monitor:

1. **Application Metrics**
   - Request rate and latency
   - Error rate
   - Active users
   - Goal creation rate

2. **Infrastructure Metrics**
   - CPU and memory usage
   - Database connections
   - Redis operations
   - Disk usage

3. **Business Metrics**
   - Goals created per day
   - Task completion rate
   - User engagement
   - API usage by endpoint

### Logging

#### Structured Logging Configuration

```javascript
// logging.config.js
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { service: 'goal-strategy' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

#### Log Aggregation

```yaml
# fluentd.conf
<source>
  @type forward
  port 24224
</source>

<match personalea.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name personalea
  type_name _doc
</match>
```

## Security Operations

### SSL/TLS Configuration

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.personalea.com;

    ssl_certificate /etc/ssl/certs/personalea.crt;
    ssl_certificate_key /etc/ssl/private/personalea.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://goal-strategy:3001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Security Scanning

```bash
# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Container scanning
docker scan personalea/goal-strategy:latest

# Kubernetes security
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml
```

## Backup and Recovery

### Database Backups

```bash
# PostgreSQL backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://personalea-backups/postgres/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Redis Backup

```bash
# Redis backup
redis-cli --rdb /backups/redis/dump.rdb
aws s3 cp /backups/redis/dump.rdb s3://personalea-backups/redis/dump_$(date +%Y%m%d).rdb
```

### Disaster Recovery

```bash
# Restore PostgreSQL
gunzip < backup_20250625.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Restore Redis
redis-cli --pipe < dump.rdb
```

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_goals_user_status ON goals(user_id, status);
CREATE INDEX idx_tasks_goal_status ON tasks(goal_id, status);

-- Analyze tables
ANALYZE goals;
ANALYZE tasks;
```

### Caching Strategy

```javascript
// Redis caching middleware
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    const cached = await redis.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      redis.setex(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};
```

## Operational Procedures

### Deployment Checklist

- [ ] Run all tests
- [ ] Update CHANGELOG.md
- [ ] Tag release version
- [ ] Build Docker images
- [ ] Push to registry
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Monitor metrics
- [ ] Announce release

### Incident Response

1. **Detection**
   - Monitor alerts
   - Check error rates
   - Review user reports

2. **Triage**
   - Assess severity
   - Identify affected services
   - Estimate impact

3. **Response**
   - Implement fix or rollback
   - Communicate status
   - Monitor recovery

4. **Post-Mortem**
   - Document timeline
   - Identify root cause
   - Create action items

### Maintenance Windows

```bash
# Maintenance mode
kubectl patch deployment frontend -p '{"spec":{"replicas":0}}'
kubectl apply -f maintenance-page.yaml

# Perform maintenance
# ...

# Resume service
kubectl patch deployment frontend -p '{"spec":{"replicas":3}}'
kubectl delete -f maintenance-page.yaml
```

## Health Checks

### Application Health

```javascript
// health.js
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  const healthy = checks.database && checks.redis;
  res.status(healthy ? 200 : 503).json(checks);
});
```

### Monitoring Script

```bash
#!/bin/bash
# health-check.sh

SERVICES=("goal-strategy:3001" "email-service:3002" "frontend:3000")

for service in "${SERVICES[@]}"; do
  response=$(curl -s -o /dev/null -w "%{http_code}" http://$service/health)
  if [ $response -ne 200 ]; then
    echo "Service $service is unhealthy"
    # Send alert
  fi
done
```

## Scaling Guidelines

### Horizontal Scaling

```bash
# Kubernetes autoscaling
kubectl autoscale deployment goal-strategy \
  --min=2 \
  --max=10 \
  --cpu-percent=70

# Manual scaling
kubectl scale deployment goal-strategy --replicas=5
```

### Vertical Scaling

```yaml
# Update resource limits
spec:
  containers:
  - name: goal-strategy
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "1Gi"
        cpu: "1000m"
```

## Cost Optimization

### Resource Monitoring

```bash
# Monitor resource usage
kubectl top nodes
kubectl top pods

# Identify over-provisioned resources
kubectl describe node | grep -A 5 "Allocated resources"
```

### Cost Reduction Strategies

1. **Right-sizing**: Match resources to actual usage
2. **Spot Instances**: Use for non-critical workloads
3. **Reserved Instances**: For predictable workloads
4. **Auto-scaling**: Scale down during low usage
5. **Caching**: Reduce database load

## Compliance and Auditing

### Audit Logging

```javascript
// Audit middleware
const auditLog = (req, res, next) => {
  const log = {
    timestamp: new Date(),
    user: req.user?.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };
  
  auditLogger.info(log);
  next();
};
```

### Compliance Checks

- GDPR compliance for user data
- SOC 2 Type II certification
- Regular security audits
- Penetration testing

## Support and Troubleshooting

### Common Issues

1. **High Memory Usage**
   ```bash
   # Check memory leaks
   npm run heapdump
   npm run analyze-heap
   ```

2. **Slow Queries**
   ```sql
   -- Find slow queries
   SELECT query, calls, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

3. **Connection Issues**
   ```bash
   # Check connectivity
   nc -zv goal-strategy 3001
   telnet redis 6379
   ```

### Support Contacts

- **On-call Engineer**: ops-oncall@personalea.com
- **DevOps Team**: devops@personalea.com
- **Emergency**: +1-555-PERSONALEA