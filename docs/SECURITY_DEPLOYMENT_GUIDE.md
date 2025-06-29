# Security Deployment Guide

## 🚨 Critical Security Setup

### API Key Security

**NEVER commit real API keys to version control!**

#### Secure OpenAI API Key Setup

1. **Get your OpenAI API Key**
   - Visit: https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-proj-` or `sk-`)

2. **Secure Key Storage**
   ```bash
   # Copy the example file
   cp .env.production.example .env
   
   # Edit with your real API key
   nano .env
   
   # Replace this line:
   OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
   # With your actual key:
   OPENAI_API_KEY=sk-proj-your-real-key-here
   ```

3. **Verify .env is gitignored**
   ```bash
   # .env should be in .gitignore (it already is)
   grep -n "\.env$" .gitignore
   ```

#### Gmail API Security (Optional)

If using email integration:

1. **Google Cloud Console Setup**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID
   - Add to your `.env` file

2. **Secure OAuth Storage**
   ```env
   GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your-client-secret
   ```

### Database Security

#### PostgreSQL Password

Generate secure password:
```bash
# Generate secure database password
openssl rand -base64 32
```

Update in `.env`:
```env
POSTGRES_PASSWORD=your-secure-generated-password-here
```

#### JWT Secrets

Generate secure JWT secrets:
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret  
openssl rand -base64 32

# Generate email encryption key
openssl rand -hex 32
```

### Privacy Controls

#### Email Processing Consent

PersonalEA will prompt users before processing email content:

- **Goals**: Processed without additional consent (user's own data)
- **Emails**: Requires explicit consent (contains third-party private information)

#### LLM Provider Options

Users can choose their preferred LLM provider:

1. **OpenAI GPT-4** (Cloud)
   - Requires API key
   - Data sent to OpenAI servers
   - Best performance

2. **Local Llama** (Private)
   - No API key required
   - Data stays on local machine
   - Requires Ollama installation
   - Maximum privacy

3. **Custom Endpoint** 
   - Any OpenAI-compatible API
   - User-configurable endpoint
   - Flexible privacy control

#### Local LLM Setup (Maximum Privacy)

For completely private AI processing:

1. **Install Ollama**
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Pull Llama model
   ollama pull llama2
   # or
   ollama pull codellama
   ```

2. **Configure PersonalEA**
   - Select "Local Llama" in LLM provider settings
   - Ensure Ollama is running on localhost:11434
   - No internet connection required for processing

### Production Security Checklist

#### Pre-Deployment

- [ ] All real API keys removed from codebase
- [ ] `.env` file created with actual credentials
- [ ] Database passwords generated securely
- [ ] JWT secrets generated and configured
- [ ] CORS origins configured for production URLs
- [ ] Rate limiting configured appropriately

#### Post-Deployment

- [ ] Health checks passing
- [ ] API key validation working
- [ ] Email consent prompts functioning
- [ ] LLM provider selection working
- [ ] Database connections secure
- [ ] Log files not exposing secrets

### Monitoring Security

#### Log Security

Logs are configured to avoid exposing sensitive data:

```env
# Secure logging configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=true
```

**What gets logged:**
- API request/response metadata
- Performance metrics
- Error messages (sanitized)

**What never gets logged:**
- API keys or tokens
- Email content
- Personal information
- Raw database queries with credentials

#### Security Headers

PersonalEA includes security headers:

```env
HELMET_ENABLED=true
CSRF_PROTECTION=true
XSS_PROTECTION=true
```

### Incident Response

#### Compromised API Key

If your OpenAI API key is compromised:

1. **Immediate Action**
   ```bash
   # Revoke the key immediately at:
   # https://platform.openai.com/api-keys
   
   # Generate new key
   # Update .env file
   # Restart services
   ```

2. **Check Usage**
   - Review OpenAI usage dashboard
   - Check for unexpected API calls
   - Monitor billing for unusual charges

#### Data Breach Response

If personal data is compromised:

1. **Assess Scope**
   - What data was accessed?
   - Email content, goals, or system data?
   - How many users affected?

2. **Immediate Actions**
   - Change all passwords and API keys
   - Review access logs
   - Notify affected users
   - Document the incident

### Compliance Considerations

#### GDPR Compliance

PersonalEA supports GDPR requirements:

- **Data Portability**: Export functionality (planned)
- **Right to Deletion**: Data deletion capabilities (planned)
- **Consent Management**: Email processing consent required
- **Data Minimization**: Only necessary data processed

#### Local Deployment Benefits

Running PersonalEA locally provides:

- **Data Sovereignty**: Your data stays on your hardware
- **Compliance Simplification**: No third-party data processors
- **Audit Trail**: Complete control over data processing
- **Privacy by Design**: Local LLM options available

### Security Updates

#### Regular Maintenance

- Update dependencies regularly
- Monitor security advisories
- Rotate API keys quarterly
- Review access logs monthly
- Test backup and recovery procedures

#### Staying Informed

- Follow PersonalEA security announcements
- Monitor OpenAI security updates
- Subscribe to database security alerts
- Keep containers and host OS updated

---

## Quick Start Security Setup

For impatient users who want secure setup fast:

```bash
# 1. Copy environment file
cp .env.production.example .env

# 2. Generate secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
echo "EMAIL_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> .env

# 3. Add your OpenAI API key
nano .env  # Replace YOUR_OPENAI_API_KEY_HERE

# 4. Start services
docker-compose up -d

# 5. Verify security
curl http://localhost:3000/health
```

Your PersonalEA instance is now running securely with:
- ✅ Secure API key storage
- ✅ Strong passwords and secrets
- ✅ Privacy controls enabled
- ✅ Security headers active