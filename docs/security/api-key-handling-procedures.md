# API Key Handling Procedures

## Overview

This document provides comprehensive procedures for securely handling API keys throughout the PersonalEA application lifecycle, from development to production deployment.

## API Key Types and Sensitivity Levels

### Critical API Keys (High Sensitivity)
- **OpenAI API Keys** (`sk-proj-*`, `sk-*`)
  - Direct cost implications
  - Access to AI capabilities
  - Must be rotated every 90 days
  
- **Gmail OAuth Credentials**
  - Access to user email data
  - Privacy implications
  - Requires consent management

### Infrastructure Keys (Medium Sensitivity)
- **JWT Secrets**
  - Authentication token signing
  - Session management
  - Rotate every 30 days in production

- **Database Passwords**
  - Direct data access
  - System integrity
  - Rotate every 60 days

### Encryption Keys (High Sensitivity)
- **Email Encryption Keys**
  - Protects stored email data
  - GDPR compliance requirement
  - Rotate every 180 days

## Development Environment Procedures

### Initial Setup

1. **Never Use Production Keys in Development**
   ```bash
   # Create development-specific keys
   cp .env.example .env.development
   nano .env.development
   ```

2. **Use Test/Sandbox Keys When Available**
   - OpenAI: Use lower rate limit keys
   - Gmail: Use test OAuth app
   - Database: Local development credentials

3. **Mark Development Keys Clearly**
   ```env
   # .env.development
   # DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION
   OPENAI_API_KEY=sk-dev-test-key-only
   ```

### Local Development Security

1. **Secure Local Storage**
   ```bash
   # Set restrictive permissions on .env files
   chmod 600 .env
   chmod 600 .env.development
   ```

2. **Use Git Hooks for Protection**
   ```bash
   # Install pre-commit hook
   cat > .git/hooks/pre-commit << 'EOF'
   #!/bin/bash
   # Check for API keys in staged files
   if git diff --cached | grep -E "(sk-proj-|sk-|AIza|ya29\.|AKIA)"; then
     echo "ERROR: Potential API key detected in commit!"
     echo "Please remove the key and try again."
     exit 1
   fi
   EOF
   chmod +x .git/hooks/pre-commit
   ```

3. **Development Key Isolation**
   - Use separate OpenAI organizations for dev/prod
   - Create project-specific API keys
   - Enable key usage alerts

## Production Environment Procedures

### Pre-Deployment Checklist

- [ ] All development keys removed from codebase
- [ ] Production keys generated and stored securely
- [ ] Key rotation schedule documented
- [ ] Access logging configured
- [ ] Rate limiting enabled
- [ ] Key usage monitoring active

### Secure Key Deployment

1. **Environment Variable Injection**
   ```bash
   # Option 1: Docker Secrets (Recommended)
   docker secret create openai_api_key ./secret_key.txt
   
   # Option 2: CI/CD Variable Injection
   # Configure in GitHub Actions, GitLab CI, etc.
   
   # Option 3: Cloud Provider Secrets
   # AWS Secrets Manager, Azure Key Vault, etc.
   ```

2. **Runtime Validation**
   ```typescript
   // Validate keys on startup
   function validateApiKeys() {
     const requiredKeys = [
       'OPENAI_API_KEY',
       'JWT_SECRET',
       'DATABASE_URL'
     ];
     
     for (const key of requiredKeys) {
       if (!process.env[key] || process.env[key].includes('YOUR_')) {
         throw new Error(`Invalid or missing ${key}`);
       }
     }
   }
   ```

3. **Secure Key Format Validation**
   ```typescript
   // Validate OpenAI key format
   function validateOpenAIKey(key: string): boolean {
     return /^sk-proj-[a-zA-Z0-9]{48}$/.test(key) || 
            /^sk-[a-zA-Z0-9]{48}$/.test(key);
   }
   ```

## Key Rotation Procedures

### Automated Rotation Process

1. **Schedule Regular Rotations**
   ```yaml
   # .github/workflows/key-rotation-reminder.yml
   name: Key Rotation Reminder
   on:
     schedule:
       - cron: '0 0 1 */3 *'  # Every 3 months
   jobs:
     remind:
       runs-on: ubuntu-latest
       steps:
         - name: Create rotation issue
           uses: actions/github-script@v6
           with:
             script: |
               github.rest.issues.create({
                 owner: context.repo.owner,
                 repo: context.repo.repo,
                 title: 'API Key Rotation Due',
                 body: 'Time to rotate API keys according to security policy.'
               })
   ```

2. **Rotation Steps**
   ```bash
   # 1. Generate new key from provider
   # 2. Update staging environment
   # 3. Test functionality
   # 4. Update production
   # 5. Monitor for issues
   # 6. Revoke old key after 24 hours
   ```

3. **Zero-Downtime Rotation**
   - Support multiple valid keys temporarily
   - Implement key versioning
   - Gradual rollout strategy

### Emergency Rotation

1. **Immediate Actions**
   ```bash
   # 1. Revoke compromised key immediately
   # 2. Generate new key
   # 3. Deploy to all environments
   # 4. Audit access logs
   ```

2. **Incident Response**
   - Document time of compromise
   - Review usage during compromise window
   - Notify affected users if necessary
   - Update security procedures

## Key Storage Best Practices

### Development Storage

1. **Local .env Files**
   - Never commit to version control
   - Use .env.example as template
   - Regular cleanup of old keys

2. **IDE Configuration**
   ```json
   // .vscode/settings.json
   {
     "files.exclude": {
       "**/.env": true,
       "**/.env.*": true
     }
   }
   ```

### Production Storage Options

1. **Environment Variables (Basic)**
   - Suitable for simple deployments
   - Limited security features
   - Easy to implement

2. **Secret Management Services (Recommended)**
   ```yaml
   # HashiCorp Vault Example
   vault:
     enabled: true
     path: secret/personalea
     keys:
       - openai_api_key
       - jwt_secret
   ```

3. **Cloud Provider Solutions**
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Secret Manager
   - Automatic rotation support

## Monitoring and Auditing

### Usage Monitoring

1. **API Key Usage Tracking**
   ```typescript
   // Log API key usage
   logger.info('API call made', {
     provider: 'openai',
     endpoint: '/v1/completions',
     keyId: getKeyIdentifier(apiKey), // Last 4 chars only
     timestamp: new Date().toISOString()
   });
   ```

2. **Anomaly Detection**
   - Unusual usage patterns
   - Geographic anomalies
   - Rate limit approaches
   - Failed authentication attempts

### Audit Requirements

1. **Access Logging**
   - Who accessed keys
   - When keys were accessed
   - What operations were performed
   - From which IP addresses

2. **Compliance Reporting**
   - Key rotation history
   - Access audit trails
   - Security incident reports
   - Compliance certifications

## Common Mistakes to Avoid

### Development Mistakes
- Hardcoding keys in source code
- Using production keys in development
- Committing .env files
- Logging full API keys
- Sharing keys between developers

### Production Mistakes
- Using default/example keys
- Storing keys in container images
- Exposing keys in error messages
- Insufficient key rotation
- Poor access controls

### Security Anti-Patterns
```javascript
// ❌ NEVER DO THIS
const API_KEY = "sk-proj-abc123...";

// ❌ AVOID THIS
console.log(`Using API key: ${process.env.OPENAI_API_KEY}`);

// ✅ DO THIS INSTEAD
const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) throw new Error('API key not configured');

// ✅ Safe logging
console.log(`API key configured: ${API_KEY.slice(-4)}`);
```

## Compliance Considerations

### GDPR Requirements
- Encryption key management
- Access control documentation
- Data processor agreements
- Audit trail maintenance

### SOC 2 Requirements
- Key rotation policies
- Access control matrices
- Incident response procedures
- Regular security reviews

### Industry Standards
- Follow OWASP guidelines
- Implement NIST recommendations
- Regular penetration testing
- Third-party security audits

## Quick Reference

### Key Rotation Schedule
| Key Type | Rotation Frequency | Priority |
|----------|-------------------|----------|
| API Keys | 90 days | High |
| JWT Secrets | 30 days | Critical |
| DB Passwords | 60 days | High |
| Encryption Keys | 180 days | Medium |

### Security Contacts
- Security Team: security@personalea.com
- Incident Response: incident@personalea.com
- Compliance: compliance@personalea.com

### Emergency Procedures
1. Revoke compromised key immediately
2. Generate and deploy new key
3. Audit logs for unauthorized access
4. Document incident
5. Review and update procedures

---

Remember: API keys are like passwords - treat them with the same level of security and never share them unnecessarily.