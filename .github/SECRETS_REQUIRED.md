# GitHub Actions Secrets Required

This document lists all the secrets that need to be configured in GitHub for the CI/CD pipeline to work correctly.

## Required Secrets

### API Keys (CRITICAL - Must be real, valid keys)

1. **OPENAI_API_KEY_STAGING**
   - Description: OpenAI API key for staging environment
   - Format: `sk-proj-...` (valid OpenAI key)
   - Usage: Integration tests and staging deployment
   - ⚠️ Must have sufficient quota for testing

2. **OPENAI_API_KEY_PROD**
   - Description: OpenAI API key for production environment
   - Format: `sk-proj-...` (valid OpenAI key)
   - Usage: Production deployment and canary validation
   - ⚠️ Must have production-level quota

### Deployment Credentials

3. **STAGING_HOST**
   - Description: Staging server hostname/IP
   - Example: `staging.personalea.com`

4. **STAGING_USER**
   - Description: SSH username for staging
   - Example: `deploy`

5. **STAGING_SSH_KEY**
   - Description: Private SSH key for staging deployment
   - Format: Full SSH private key including headers

6. **PROD_HOST**
   - Description: Production server hostname/IP
   - Example: `api.personalea.com`

7. **PROD_USER**
   - Description: SSH username for production
   - Example: `deploy`

8. **PROD_SSH_KEY**
   - Description: Private SSH key for production deployment
   - Format: Full SSH private key including headers

### Monitoring & Alerting

9. **DATADOG_API_KEY** (Optional but recommended)
   - Description: Datadog API key for metrics
   - Usage: Canary deployment monitoring

10. **SLACK_WEBHOOK**
    - Description: Slack webhook URL for notifications
    - Format: `https://hooks.slack.com/services/...`
    - Usage: Deployment notifications

11. **PROMETHEUS_URL**
    - Description: Prometheus server URL
    - Example: `http://prometheus.internal:9090`
    - Usage: Canary metrics queries

12. **CANARY_URL**
    - Description: URL for canary endpoint testing
    - Example: `https://canary.personalea.com`

### Additional Services

13. **PAGERDUTY_KEY** (Optional)
    - Description: PagerDuty integration key
    - Usage: Critical alerts

## Setting Up Secrets

### Via GitHub UI:
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with the exact name listed above

### Via GitHub CLI:
```bash
# Example for setting OpenAI key
gh secret set OPENAI_API_KEY_STAGING < openai-staging-key.txt

# Set from environment variable
echo $OPENAI_API_KEY | gh secret set OPENAI_API_KEY_STAGING
```

## Environment-Specific Configuration

### Staging Environment
- Uses `OPENAI_API_KEY_STAGING`
- Lower rate limits acceptable
- Can use smaller models (gpt-3.5-turbo)
- Shorter monitoring periods

### Canary Environment
- Uses `OPENAI_API_KEY_PROD` 
- Requires production-grade monitoring
- Full rate limit capacity needed
- Extended validation periods

### Production Environment
- Uses `OPENAI_API_KEY_PROD`
- Highest reliability requirements
- Full monitoring suite active
- Automatic rollback enabled

## Security Best Practices

1. **Rotate Keys Regularly**
   - OpenAI keys: Every 90 days
   - SSH keys: Every 180 days
   - Webhook URLs: When compromised

2. **Limit Scope**
   - Use deployment-specific SSH keys
   - Restrict API keys to necessary permissions
   - Use separate keys for each environment

3. **Monitor Usage**
   - Set up billing alerts for API usage
   - Monitor for unusual patterns
   - Review deployment logs regularly

4. **Access Control**
   - Limit who can modify secrets
   - Use branch protection rules
   - Require PR reviews for workflow changes

## Troubleshooting

### Common Issues:

1. **"Invalid API key" errors**
   - Verify key format (no extra spaces/newlines)
   - Check key hasn't been revoked
   - Ensure using correct environment's key

2. **SSH deployment failures**
   - Verify SSH key format (includes headers)
   - Check server allows key-based auth
   - Ensure deploy user has necessary permissions

3. **Monitoring failures**
   - Verify Prometheus URL is accessible
   - Check metrics are being exported
   - Ensure correct query syntax

## Validation Checklist

Before first deployment, verify:
- [ ] All required secrets are set
- [ ] API keys have been tested locally
- [ ] SSH access has been verified
- [ ] Monitoring endpoints are accessible
- [ ] Notification channels are configured
- [ ] Rate limits are sufficient for testing