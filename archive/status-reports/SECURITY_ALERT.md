# SECURITY WARNING

The .env.staging file contains exposed secrets including an OpenAI API key.

IMPORTANT ACTIONS REQUIRED:
1. The exposed OpenAI API key should be rotated immediately
2. Never commit .env files with secrets to git
3. Use .env.example files as templates

Files updated:
- Added .env.staging, .env.production, .env.user to .gitignore
- Created .env.staging.example with placeholder values
