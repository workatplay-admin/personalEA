#!/bin/bash
# Script to sanitize environment files and create proper examples

echo "🔒 Sanitizing environment files..."

# Function to replace sensitive values with placeholders
sanitize_file() {
    local input_file=$1
    local output_file=$2
    
    echo "Processing $input_file -> $output_file"
    
    # Copy the file
    cp "$input_file" "$output_file"
    
    # Replace various password patterns
    sed -i 's/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=your-secure-postgres-password-here/' "$output_file"
    sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=your-secure-database-password-here/' "$output_file"
    sed -i 's/REDIS_PASSWORD=.*/REDIS_PASSWORD=your-secure-redis-password-here/' "$output_file"
    
    # Replace JWT and session secrets
    sed -i 's/JWT_SECRET=.*/JWT_SECRET=your-super-secret-jwt-key-change-this/' "$output_file"
    sed -i 's/SESSION_SECRET=.*/SESSION_SECRET=your-super-secret-session-key-change-this/' "$output_file"
    
    # Replace encryption keys
    sed -i 's/EMAIL_ENCRYPTION_KEY=.*/EMAIL_ENCRYPTION_KEY=your-32-char-encryption-key-here/' "$output_file"
    sed -i 's/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=your-encryption-key-here/' "$output_file"
    sed -i 's/OAUTH_ENCRYPTION_KEY=.*/OAUTH_ENCRYPTION_KEY=your-oauth-encryption-key-here/' "$output_file"
    
    # Replace OpenAI API keys
    sed -i 's/OPENAI_API_KEY=sk-[^ ]*/OPENAI_API_KEY=sk-proj-YOUR-OPENAI-API-KEY-HERE/' "$output_file"
    sed -i 's/OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE/OPENAI_API_KEY=sk-proj-YOUR-OPENAI-API-KEY-HERE/' "$output_file"
    
    # Replace database URLs with passwords
    sed -i 's|postgresql://[^:]*:[^@]*@|postgresql://personalea:your-secure-database-password-here@|g' "$output_file"
    sed -i 's|redis://:[^@]*@|redis://:your-secure-redis-password-here@|g' "$output_file"
    
    # Replace Gmail credentials
    sed -i 's/GMAIL_CLIENT_ID=.*/GMAIL_CLIENT_ID=your-gmail-client-id-here/' "$output_file"
    sed -i 's/GMAIL_CLIENT_SECRET=.*/GMAIL_CLIENT_SECRET=your-gmail-client-secret-here/' "$output_file"
    
    # Replace other API keys/secrets
    sed -i 's/GOOGLE_CALENDAR_CLIENT_ID=.*/GOOGLE_CALENDAR_CLIENT_ID=your-calendar-client-id-here/' "$output_file"
    sed -i 's/GOOGLE_CALENDAR_CLIENT_SECRET=.*/GOOGLE_CALENDAR_CLIENT_SECRET=your-calendar-client-secret-here/' "$output_file"
    
    # Replace monitoring passwords
    sed -i 's/GRAFANA_ADMIN_PASSWORD=.*/GRAFANA_ADMIN_PASSWORD=your-grafana-admin-password-here/' "$output_file"
    
    echo "✅ Sanitized $output_file"
}

# Process production file
if [ -f ".env.production" ]; then
    sanitize_file ".env.production" ".env.production.example"
fi

# Process staging file
if [ -f ".env.staging" ]; then
    sanitize_file ".env.staging" ".env.staging.example"
fi

# Process user file
if [ -f ".env.user" ]; then
    sanitize_file ".env.user" ".env.user.example"
fi

echo ""
echo "⚠️  SECURITY NOTICE:"
echo "1. The exposed API keys and passwords should be rotated immediately"
echo "2. Never commit .env files with real secrets to version control"
echo "3. Always use .env.example files as templates"
echo ""
echo "🔒 Added to .gitignore:"
echo "   - .env.staging"
echo "   - .env.production"
echo "   - .env.user"
echo ""
echo "📝 Created example files:"
echo "   - .env.production.example"
echo "   - .env.staging.example"
echo "   - .env.user.example (if applicable)"