# Conversational SMART Goal System - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the conversational SMART goal system to staging and production environments.

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed
- PostgreSQL 15+ database
- Redis 7+ cache server
- Valid OpenAI API key
- CI/CD pipeline access (GitHub Actions)

## Quick Start (Development)

### 1. Clone Repository

```bash
git clone https://github.com/your-org/personalEA.git
cd personalEA/services/goal-strategy
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
vim .env
```

Required environment variables:
```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/goals_dev

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4-turbo-preview

# Security
JWT_SECRET=your-secret-key
API_RATE_LIMIT=100
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Seed database (optional)
npm run db:seed
```

### 5. Start Development Server

```bash
# Start all services
npm run dev

# Or start individually
npm run dev:api     # API server only
npm run dev:worker  # Background workers only
```

## Staging Deployment

### 1. Build Docker Image

```bash
# Build for staging
docker build -t goal-service:staging \
  --build-arg NODE_ENV=staging \
  -f Dockerfile .
```

### 2. Docker Compose Setup

Create `docker-compose.staging.yml`:

```yaml
version: '3.8'

services:
  goal-service:
    image: goal-service:staging
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: goals_staging
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/staging.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - goal-service

volumes:
  postgres_data:
  redis_data:
```

### 3. Deploy to Staging

```bash
# Set environment variables
export DATABASE_URL="postgresql://user:pass@postgres:5432/goals_staging"
export OPENAI_API_KEY="sk-your-staging-key"
export DB_USER="staging_user"
export DB_PASSWORD="secure_password"
export REDIS_PASSWORD="redis_password"

# Deploy
docker-compose -f docker-compose.staging.yml up -d

# Run migrations
docker-compose -f docker-compose.staging.yml exec goal-service \
  npx prisma migrate deploy

# Check logs
docker-compose -f docker-compose.staging.yml logs -f goal-service
```

### 4. Verify Deployment

```bash
# Health check
curl http://staging.personalea.com/health

# API test
curl -X POST http://staging.personalea.com/api/v1/conversations/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"message": "I want to learn programming"}'
```

## Production Deployment

### 1. Infrastructure Setup (AWS Example)

```terraform
# terraform/main.tf
provider "aws" {
  region = "us-east-1"
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "personalea-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier = "personalea-goals-prod"
  
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  storage_encrypted     = true
  
  db_name  = "goals_production"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "personalea-goals-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "personalea-cache-prod"
  engine              = "redis"
  node_type           = "cache.t3.micro"
  num_cache_nodes     = 1
  parameter_group_name = "default.redis7"
  port                = 6379
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "personalea-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Load Balancer
resource "aws_lb" "main" {
  name               = "personalea-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets
  
  enable_deletion_protection = true
  enable_http2              = true
}
```

### 2. Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: goal-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: goal-service
  template:
    metadata:
      labels:
        app: goal-service
    spec:
      containers:
      - name: goal-service
        image: registry.personalea.com/goal-service:v1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: goal-service-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: goal-service-secrets
              key: redis-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: goal-service-secrets
              key: openai-api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: goal-service
  namespace: production
spec:
  selector:
    app: goal-service
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: goal-service
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.personalea.com
    secretName: personalea-tls
  rules:
  - host: api.personalea.com
    http:
      paths:
      - path: /api/v1/conversations
        pathType: Prefix
        backend:
          service:
            name: goal-service
            port:
              number: 80
```

### 3. CI/CD Pipeline

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  release:
    types: [published]

env:
  REGISTRY: registry.personalea.com
  IMAGE_NAME: goal-service

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: |
          npm run test
          npm run test:integration
          npm run test:e2e
      
      - name: Security scan
        run: npm audit --production

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.meta.outputs.version }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ./services/goal-strategy
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Update Kubernetes deployment
        run: |
          aws eks update-kubeconfig --name personalea-cluster
          kubectl set image deployment/goal-service \
            goal-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ needs.build.outputs.version }} \
            -n production
      
      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/goal-service -n production
      
      - name: Run smoke tests
        run: |
          npm run test:smoke -- --url https://api.personalea.com

  notify:
    needs: [deploy]
    runs-on: ubuntu-latest
    if: always()
    
    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Production deployment ${{ job.status }}
            Version: ${{ needs.build.outputs.version }}
            Actor: ${{ github.actor }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 4. Production Monitoring

```yaml
# monitoring/prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: goal-service-alerts
  namespace: production
spec:
  groups:
  - name: goal-service
    interval: 30s
    rules:
    - alert: HighErrorRate
      expr: |
        rate(http_requests_total{job="goal-service",status=~"5.."}[5m]) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: High error rate on goal service
        description: "Error rate is {{ $value | humanizePercentage }}"
    
    - alert: HighResponseTime
      expr: |
        histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: High response time on goal service
        description: "95th percentile response time is {{ $value }}s"
    
    - alert: LowConversionRate
      expr: |
        rate(conversations_completed_total[1h]) / rate(conversations_started_total[1h]) < 0.3
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: Low conversation completion rate
        description: "Completion rate is {{ $value | humanizePercentage }}"
```

## Post-Deployment Tasks

### 1. Database Migrations

```bash
# Production migration
kubectl exec -it deployment/goal-service -n production -- \
  npx prisma migrate deploy

# Verify migration
kubectl exec -it deployment/goal-service -n production -- \
  npx prisma migrate status
```

### 2. Health Checks

```bash
# API health
curl https://api.personalea.com/health

# Database connectivity
curl https://api.personalea.com/health/db

# Redis connectivity
curl https://api.personalea.com/health/redis

# OpenAI connectivity
curl https://api.personalea.com/health/ai
```

### 3. Performance Testing

```bash
# Load test with k6
k6 run scripts/load-test.js

# Stress test
k6 run --vus 100 --duration 5m scripts/stress-test.js
```

### 4. Security Scanning

```bash
# Vulnerability scan
npm audit --production

# Docker image scan
docker scan goal-service:latest

# API security test
zap-cli quick-scan https://api.personalea.com
```

## Rollback Procedures

### Quick Rollback

```bash
# Kubernetes rollback
kubectl rollout undo deployment/goal-service -n production

# Docker rollback
docker-compose -f docker-compose.prod.yml up -d \
  --scale goal-service=0
docker-compose -f docker-compose.prod.yml up -d \
  --scale goal-service=3
```

### Database Rollback

```bash
# Create backup before deployment
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore if needed
psql $DATABASE_URL < backup-20240110-120000.sql
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   ```bash
   # Check memory
   kubectl top pods -n production
   
   # Increase limits if needed
   kubectl edit deployment goal-service -n production
   ```

2. **Database Connection Issues**
   ```bash
   # Check connection pool
   kubectl logs deployment/goal-service -n production | grep "database"
   
   # Verify credentials
   kubectl get secret goal-service-secrets -n production -o yaml
   ```

3. **OpenAI Rate Limits**
   ```bash
   # Check rate limit headers
   kubectl logs deployment/goal-service -n production | grep "x-ratelimit"
   
   # Implement backoff strategy
   ```

### Debug Commands

```bash
# Get pod logs
kubectl logs -f deployment/goal-service -n production

# SSH into pod
kubectl exec -it deployment/goal-service -n production -- /bin/sh

# Port forward for debugging
kubectl port-forward deployment/goal-service 3001:3001 -n production

# Check environment variables
kubectl exec deployment/goal-service -n production -- env | sort
```

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review error logs
   - Check API performance metrics
   - Update dependencies

2. **Monthly**
   - Security patches
   - Database optimization
   - Cost analysis

3. **Quarterly**
   - Load testing
   - Disaster recovery drill
   - Architecture review

### Backup Strategy

```bash
# Automated daily backups
0 2 * * * /scripts/backup-database.sh
0 3 * * * /scripts/backup-redis.sh

# Weekly full backup
0 4 * * 0 /scripts/full-backup.sh
```

## Support

- **Documentation**: [docs.personalea.com](https://docs.personalea.com)
- **Issues**: [github.com/personalea/issues](https://github.com/personalea/issues)
- **Slack**: #goal-service-support
- **On-call**: PagerDuty rotation