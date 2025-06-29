# PersonalEA Production Architecture Design

## Executive Summary

This document outlines the production-ready architecture for PersonalEA, including all required API keys, security measures, and deployment strategies for a scalable, secure personal AI assistant system.

## Required API Keys and Credentials

### Critical Production Keys

1. **OpenAI API Key**
   - **Environment Variable**: `OPENAI_API_KEY`
   - **Format**: `sk-[48 alphanumeric characters]`
   - **Purpose**: Powers all AI functionality (email summarization, goal translation, task breakdown)
   - **Cost Considerations**: ~$0.01-0.03 per request depending on model
   - **Security**: Store in secure vault, never commit to repository

2. **JWT Signing Secret**
   - **Environment Variable**: `JWT_SECRET`
   - **Format**: 64-character random string (use `openssl rand -hex 32`)
   - **Purpose**: Signs authentication tokens
   - **Rotation**: Every 90 days
   - **Example Generation**: `openssl rand -hex 32`

3. **Session Secret**
   - **Environment Variable**: `SESSION_SECRET`
   - **Format**: 64-character random string
   - **Purpose**: Secures web sessions
   - **Rotation**: Every 90 days
   - **Example Generation**: `openssl rand -hex 32`

4. **Email Encryption Key**
   - **Environment Variable**: `EMAIL_ENCRYPTION_KEY`
   - **Format**: Exactly 32 characters
   - **Purpose**: Encrypts stored email credentials
   - **Algorithm**: AES-256
   - **Example Generation**: `openssl rand -hex 16`

5. **Database Password**
   - **Environment Variable**: `DB_PASSWORD`
   - **Format**: Complex password, 20+ characters
   - **Purpose**: PostgreSQL authentication
   - **Example Generation**: `openssl rand -base64 20`

6. **Redis Password**
   - **Environment Variable**: `REDIS_PASSWORD`
   - **Format**: Complex password, 20+ characters
   - **Purpose**: Redis cache authentication
   - **Example Generation**: `openssl rand -base64 20`

### OAuth Credentials (When Implemented)

1. **Gmail Integration**
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   - `GMAIL_REDIRECT_URI`
   - **Setup**: Google Cloud Console → APIs & Services → Credentials

2. **Google Calendar Integration**
   - `GOOGLE_CALENDAR_CLIENT_ID`
   - `GOOGLE_CALENDAR_CLIENT_SECRET`
   - `GOOGLE_CALENDAR_REDIRECT_URI`
   - **Note**: Currently missing calendar service implementation

## Production Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                             │
│                    (SSL Termination, DDoS Protection)            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                        API Gateway                               │
│              (Authentication, Rate Limiting, Routing)            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┬─────────────────────┐
        │                           │                       │
┌───────▼────────┐         ┌───────▼────────┐     ┌───────▼────────┐
│ Goal Strategy  │         │Email Processing│     │Calendar Service│
│   Service      │         │    Service     │     │   (Missing)    │
│   Port 3000    │         │   Port 3001    │     │   Port 3003    │
└───────┬────────┘         └───────┬────────┘     └───────┬────────┘
        │                           │                       │
        └───────────────┬───────────┴─────────────────────┘
                        │
        ┌───────────────┴───────────┬─────────────────────┐
        │                           │                       │
┌───────▼────────┐         ┌───────▼────────┐     ┌───────▼────────┐
│   PostgreSQL   │         │     Redis      │     │   OpenAI API   │
│   Primary DB   │         │     Cache      │     │   (External)   │
└────────────────┘         └────────────────┘     └────────────────┘
```

### Container Architecture

```yaml
version: '3.8'

services:
  # API Gateway (nginx or Kong)
  api-gateway:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "443:443"
      - "80:80"
    depends_on:
      - goal-strategy-service
      - email-processing-service

  # Goal Strategy Service
  goal-strategy-service:
    build:
      context: ./services/goal-strategy
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/personalea
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Email Processing Service
  email-processing-service:
    build:
      context: ./services/email-processing
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/personalea
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - EMAIL_ENCRYPTION_KEY=${EMAIL_ENCRYPTION_KEY}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G

  # PostgreSQL Database
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: personalea
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  # Redis Cache
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

## Security Implementation

### API Key Management

```bash
# Production API Key Setup Script
#!/bin/bash

# Generate secure secrets
export JWT_SECRET=$(openssl rand -hex 32)
export SESSION_SECRET=$(openssl rand -hex 32)
export EMAIL_ENCRYPTION_KEY=$(openssl rand -hex 16)
export DB_PASSWORD=$(openssl rand -base64 20)
export REDIS_PASSWORD=$(openssl rand -base64 20)

# Store in secure vault (example using HashiCorp Vault)
vault kv put secret/personalea/production \
  jwt_secret="$JWT_SECRET" \
  session_secret="$SESSION_SECRET" \
  email_encryption_key="$EMAIL_ENCRYPTION_KEY" \
  db_password="$DB_PASSWORD" \
  redis_password="$REDIS_PASSWORD" \
  openai_api_key="$OPENAI_API_KEY"

# Create production .env file
cat > .env.production <<EOF
# Auto-generated production configuration
# DO NOT COMMIT THIS FILE
NODE_ENV=production

# Secrets loaded from vault at runtime
JWT_SECRET=\${VAULT_JWT_SECRET}
SESSION_SECRET=\${VAULT_SESSION_SECRET}
EMAIL_ENCRYPTION_KEY=\${VAULT_EMAIL_ENCRYPTION_KEY}
DB_PASSWORD=\${VAULT_DB_PASSWORD}
REDIS_PASSWORD=\${VAULT_REDIS_PASSWORD}
OPENAI_API_KEY=\${VAULT_OPENAI_API_KEY}

# Service Configuration
DATABASE_URL=postgresql://personalea:\${DB_PASSWORD}@postgres:5432/personalea
REDIS_URL=redis://:\${REDIS_PASSWORD}@redis:6379

# Security Settings
CORS_ORIGIN=https://your-domain.com
SECURE_COOKIES=true
CSRF_PROTECTION=true
RATE_LIMITING=true
EOF
```

### Environment-Specific Configuration

```javascript
// config/production.js
module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    trustProxy: true
  },
  
  security: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h',
      refreshExpiresIn: '7d',
      algorithm: 'HS256'
    },
    
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: 100000
    },
    
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || [],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false
    },
    
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }
  },
  
  database: {
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.DB_SSL_CA
    },
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    }
  },
  
  redis: {
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    retryStrategy: (times) => Math.min(times * 50, 2000)
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID,
    model: 'gpt-4',
    maxTokens: 4000,
    temperature: 0.7,
    rateLimit: {
      maxRequests: 60,
      perMinutes: 1
    }
  },
  
  logging: {
    level: 'info',
    format: 'json',
    transports: [
      {
        type: 'console',
        colorize: false
      },
      {
        type: 'file',
        filename: '/var/log/personalea/app.log',
        maxsize: 10485760, // 10MB
        maxFiles: 5
      }
    ]
  },
  
  monitoring: {
    healthCheck: {
      interval: 30000,
      timeout: 5000,
      startPeriod: 40000,
      retries: 3
    },
    metrics: {
      enabled: true,
      port: 9090,
      path: '/metrics'
    }
  }
};
```

## Deployment Strategy

### Cloud Provider Setup

#### Option 1: AWS Deployment

```bash
# AWS ECS Task Definition
{
  "family": "personalea-production",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "goal-strategy-service",
      "image": "your-registry/goal-strategy:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:personalea/openai-key"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:personalea/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/personalea",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "goal-strategy"
        }
      }
    }
  ]
}
```

#### Option 2: Railway Deployment

```toml
# railway.toml
[build]
builder = "dockerfile"
dockerfilePath = "./Dockerfile"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "always"

[[services]]
name = "goal-strategy"
port = 3000

[[services]]
name = "email-processing"
port = 3001

[environment]
NODE_ENV = "production"
```

### Monitoring and Alerting

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'personalea-services'
    static_configs:
      - targets: 
        - 'goal-strategy-service:9090'
        - 'email-processing-service:9090'
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

# Alert rules
groups:
  - name: personalea_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: OpenAIAPIFailure
        expr: openai_api_errors_total > 10
        for: 2m
        annotations:
          summary: "OpenAI API failures detected"
          
      - alert: DatabaseConnectionFailure
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "Database connection lost"
```

## Best Practices Summary

1. **Never commit API keys** - Use environment variables and secure vaults
2. **Rotate secrets regularly** - Implement 90-day rotation policy
3. **Monitor API usage** - Track OpenAI costs and rate limits
4. **Use SSL everywhere** - Encrypt all traffic
5. **Implement rate limiting** - Protect against abuse
6. **Regular backups** - Automated daily backups with encryption
7. **Audit logging** - Track all API key usage and access
8. **Principle of least privilege** - Services only get keys they need
9. **Health monitoring** - Proactive alerting for service issues
10. **Disaster recovery plan** - Document recovery procedures