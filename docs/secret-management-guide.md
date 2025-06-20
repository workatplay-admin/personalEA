# PersonalEA Secret Management Guide

## 🔑 Overview

PersonalEA implements a centralized secret management system that provides security, consistency, and ease of maintenance across all services. This guide explains how to properly manage API keys, secrets, and sensitive configuration data.

## 🏗️ Architecture

### Centralized Configuration Structure

```
personalEA/
├── .env                          # Root environment variables (secrets)
├── .env.example                  # Template for new installations
├── config/
│   └── default.json             # Central configuration with variable references
└── services/
    ├── email-processing/
    │   └── .env.example         # Service-specific non-secret config
    └── goal-strategy/
        └── .env.example         # Service-specific non-secret config
```

### How It Works

1. **Root Configuration**: [`config/default.json`](../config/default.json) references environment variables
   ```json
   {
     "openaiApiKey": "${OPENAI_API_KEY}"
   }
   ```

2. **Environment Variables**: Root [`.env`](../.env.example) file contains actual secrets
   ```bash
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. **Service Inheritance**: Services automatically inherit configuration through `dotenv.config()`

## 🔒 Security Best Practices

### 1. Secret Storage

**✅ DO:**
- Store all API keys in the root `.env` file
- Use the `.env.example` template for new installations
- Keep secrets out of version control (`.env` is in `.gitignore`)
- Use strong, unique secrets for each environment

**❌ DON'T:**
- Hardcode secrets in configuration files
- Duplicate API keys across service-specific `.env` files
- Commit real secrets to version control
- Use default or weak secrets in production

### 2. Secret Rotation

**Regular Rotation Schedule:**
- API Keys: Every 90 days or when compromised
- JWT Secrets: Every 30 days in production
- Database Passwords: Every 60 days
- Encryption Keys: Every 180 days

**Rotation Process:**
1. Generate new secret
2. Update root `.env` file
3. Restart all services
4. Verify functionality
5. Revoke old secret

### 3. Environment Separation

**Development:**
```bash
# .env.development
OPENAI_API_KEY=sk-dev-key-here
JWT_SECRET=dev-jwt-secret-32-chars-minimum
```

**Production:**
```bash
# .env.production
OPENAI_API_KEY=sk-prod-key-here
JWT_SECRET=prod-jwt-secret-32-chars-minimum
```

## 🛠️ Configuration Management

### Setting Up New Installation

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure secrets:**
   ```bash
   # Edit .env file
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here
   JWT_SECRET=your-secure-jwt-secret-minimum-32-characters
   DATABASE_URL=postgresql://user:password@localhost:5432/personalea
   ```

3. **Verify configuration:**
   ```bash
   # Check that services can access the configuration
   npm run validate:config
   ```

### Adding New Secrets

1. **Add to root configuration:**
   ```json
   // config/default.json
   {
     "openaiApiKey": "${OPENAI_API_KEY}",
     "newApiKey": "${NEW_API_KEY}"
   }
   ```

2. **Update environment template:**
   ```bash
   # .env.example
   OPENAI_API_KEY=sk-************************
   NEW_API_KEY=your-new-api-key-here
   ```

3. **Update service configuration:**
   ```typescript
   // services/*/src/config/environment.ts
   const envSchema = z.object({
     // ... existing config
     NEW_API_KEY: z.string().min(1),
   });
   ```

### Service-Specific Configuration

Services should only define non-secret, service-specific configuration:

```bash
# services/goal-strategy/.env.example
# Service-specific configuration (non-secrets)
PORT=8085
NODE_ENV=development
FEATURE_AI_GOAL_TRANSLATION=true

# Note: OPENAI_API_KEY is configured at the root level
# This service inherits it automatically from /.env
```

## 🔍 Verification and Testing

### Configuration Validation

**Check environment loading:**
```bash
# Verify environment variables are loaded
node -e "require('dotenv').config(); console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET')"
```

**Test service configuration:**
```bash
# Test individual service configuration
cd services/goal-strategy
npm run test:config
```

### Security Audit

**Regular security checks:**
```bash
# Check for exposed secrets in code
git log --all -S "sk-" --source --all
grep -r "sk-" . --exclude-dir=node_modules --exclude=".env*"

# Verify .gitignore is protecting secrets
git check-ignore .env
```

## 🚨 Incident Response

### Secret Compromise

**Immediate Actions:**
1. **Revoke compromised secret** at the provider (OpenAI, etc.)
2. **Generate new secret** with the same provider
3. **Update root `.env` file** with new secret
4. **Restart all services** to pick up new configuration
5. **Verify functionality** across all services
6. **Document incident** for future reference

**Prevention:**
- Regular secret rotation
- Access logging and monitoring
- Principle of least privilege
- Secure development practices

### Configuration Errors

**Common Issues:**
- Missing environment variables
- Incorrect variable names
- Service startup failures
- Authentication errors

**Troubleshooting:**
```bash
# Check environment variable loading
npm run debug:env

# Validate configuration schema
npm run validate:config

# Test service connectivity
npm run test:services
```

## 📋 Compliance and Auditing

### Audit Trail

**Track configuration changes:**
- Version control for configuration templates
- Change logs for secret rotations
- Access logs for configuration updates
- Regular security assessments

### Compliance Requirements

**GDPR/Privacy:**
- Data encryption at rest and in transit
- Secure key management
- Right to deletion compliance
- Data residency controls

**SOC 2:**
- Access controls and monitoring
- Change management processes
- Incident response procedures
- Regular security reviews

## 🔧 Tools and Automation

### Recommended Tools

**Secret Management:**
- HashiCorp Vault (enterprise)
- AWS Secrets Manager (cloud)
- Azure Key Vault (cloud)
- Local encrypted storage (development)

**Automation Scripts:**
```bash
# Secret rotation script
./scripts/rotate-secrets.sh

# Configuration validation
./scripts/validate-config.sh

# Security audit
./scripts/security-audit.sh
```

### Monitoring and Alerting

**Set up alerts for:**
- Failed authentication attempts
- Configuration validation errors
- Secret expiration warnings
- Unusual access patterns

## 📚 Additional Resources

- [Configuration Management Plan](configuration-management-plan.md)
- [User Installation Guide](user-installation-guide.md)
- [Security Best Practices](security-best-practices.md)
- [Deployment Guide](deployment-guide.md)

---

**Remember:** Security is everyone's responsibility. When in doubt, err on the side of caution and consult the security team.