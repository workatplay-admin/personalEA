#!/bin/bash

# PersonalEA Production Environment Setup Script
# This script helps configure the production environment with secure values

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "=================================================="
echo "   PersonalEA Production Environment Setup"
echo "=================================================="
echo -e "${NC}"

# Check if running from project root
if [ ! -f "package.json" ] || [ ! -d "services" ]; then
    echo -e "${RED}Error: This script must be run from the PersonalEA project root directory${NC}"
    exit 1
fi

# Function to generate secure random strings
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

generate_hex_key() {
    openssl rand -hex 16
}

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        value=${value:-$default}
    else
        read -p "$prompt: " value
    fi
    
    eval "$var_name='$value'"
}

# Function to prompt for password (hidden input)
prompt_password() {
    local prompt="$1"
    local var_name="$2"
    
    read -s -p "$prompt: " value
    echo
    eval "$var_name='$value'"
}

# Start setup process
echo -e "${YELLOW}This script will help you set up your production environment.${NC}"
echo -e "${YELLOW}It will create a .env file with secure configuration values.${NC}"
echo
echo -e "${RED}WARNING: This will overwrite any existing .env file!${NC}"
read -p "Continue? (y/N): " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

# Backup existing .env if it exists
if [ -f ".env" ]; then
    backup_file=".env.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${BLUE}Backing up existing .env to $backup_file${NC}"
    cp .env "$backup_file"
fi

# Copy production template
echo -e "${BLUE}Creating .env from production template...${NC}"
cp .env.production .env

# Generate security keys
echo
echo -e "${GREEN}Generating secure keys...${NC}"
JWT_SECRET=$(generate_secret)
SESSION_SECRET=$(generate_secret)
EMAIL_ENCRYPTION_KEY=$(generate_hex_key)

# Update .env with generated secrets
sed -i.bak "s/JWT_SECRET=CHANGE_THIS_TO_SECURE_RANDOM_STRING_32_CHARS_MIN/JWT_SECRET=$JWT_SECRET/" .env
sed -i.bak "s/SESSION_SECRET=CHANGE_THIS_TO_ANOTHER_SECURE_RANDOM_STRING/SESSION_SECRET=$SESSION_SECRET/" .env
sed -i.bak "s/EMAIL_ENCRYPTION_KEY=CHANGE_THIS_TO_32_CHARACTER_HEX_STRING_HERE!!!!/EMAIL_ENCRYPTION_KEY=$EMAIL_ENCRYPTION_KEY/" .env

# Prompt for database password
echo
echo -e "${YELLOW}Database Configuration${NC}"
prompt_password "Enter PostgreSQL password (min 12 characters)" DB_PASSWORD

if [ ${#DB_PASSWORD} -lt 12 ]; then
    echo -e "${RED}Error: Password must be at least 12 characters long${NC}"
    exit 1
fi

sed -i.bak "s/POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_HERE/POSTGRES_PASSWORD=$DB_PASSWORD/" .env

# Prompt for Redis password
echo
echo -e "${YELLOW}Redis Configuration${NC}"
prompt_password "Enter Redis password (min 12 characters)" REDIS_PASSWORD

if [ ${#REDIS_PASSWORD} -lt 12 ]; then
    echo -e "${RED}Error: Password must be at least 12 characters long${NC}"
    exit 1
fi

sed -i.bak "s/REDIS_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_HERE/REDIS_PASSWORD=$REDIS_PASSWORD/" .env

# Prompt for OpenAI API key
echo
echo -e "${YELLOW}OpenAI Configuration${NC}"
echo -e "Get your API key from: ${BLUE}https://platform.openai.com/api-keys${NC}"
prompt_with_default "Enter your OpenAI API key" "" OPENAI_KEY

if [ -z "$OPENAI_KEY" ]; then
    echo -e "${RED}Warning: OpenAI API key is required for goal processing functionality!${NC}"
    echo "You can add it later by editing the .env file"
else
    sed -i.bak "s/OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE/OPENAI_API_KEY=$OPENAI_KEY/" .env
fi

# Optional: Gmail configuration
echo
echo -e "${YELLOW}Gmail Integration (Optional)${NC}"
read -p "Do you want to configure Gmail integration? (y/N): " configure_gmail

if [[ "$configure_gmail" =~ ^[Yy]$ ]]; then
    echo -e "Get credentials from: ${BLUE}https://console.cloud.google.com/apis/credentials${NC}"
    prompt_with_default "Enter Gmail Client ID" "" GMAIL_CLIENT_ID
    prompt_with_default "Enter Gmail Client Secret" "" GMAIL_CLIENT_SECRET
    
    if [ -n "$GMAIL_CLIENT_ID" ] && [ -n "$GMAIL_CLIENT_SECRET" ]; then
        sed -i.bak "s/GMAIL_CLIENT_ID=YOUR_GMAIL_CLIENT_ID_HERE/GMAIL_CLIENT_ID=$GMAIL_CLIENT_ID/" .env
        sed -i.bak "s/GMAIL_CLIENT_SECRET=YOUR_GMAIL_CLIENT_SECRET_HERE/GMAIL_CLIENT_SECRET=$GMAIL_CLIENT_SECRET/" .env
    fi
fi

# Clean up backup files
rm -f .env.bak

# Create necessary directories
echo
echo -e "${BLUE}Creating required directories...${NC}"
mkdir -p logs backups

# Set proper permissions
echo -e "${BLUE}Setting file permissions...${NC}"
chmod 600 .env
chmod 755 logs backups

# Generate summary
echo
echo -e "${GREEN}=================================================="
echo "   Setup Complete!"
echo "=================================================="
echo -e "${NC}"
echo "Your production environment has been configured."
echo
echo -e "${YELLOW}Generated Security Keys:${NC}"
echo "✓ JWT Secret (32 chars)"
echo "✓ Session Secret (32 chars)"
echo "✓ Email Encryption Key (32 chars)"
echo
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review the .env file and adjust any settings as needed"
echo "2. Ensure Docker and Docker Compose are installed"
echo "3. Run the database initialization script: ./scripts/init-databases.sh"
echo "4. Start the services: docker-compose -f docker-compose.staging.yml up -d"
echo "5. Check service health: ./scripts/health-check.sh"
echo
if [ -z "$OPENAI_KEY" ]; then
    echo -e "${RED}IMPORTANT: Don't forget to add your OpenAI API key to the .env file!${NC}"
fi
echo
echo -e "${BLUE}For detailed deployment instructions, see: ./docs/deployment-guide.md${NC}"