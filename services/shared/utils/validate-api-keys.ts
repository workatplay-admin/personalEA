/**
 * API Key Validation Utility
 * Ensures all required API keys are configured before service startup
 */

interface APIKeyRequirement {
  key: string;
  service: string;
  required: boolean;
}

const API_KEY_REQUIREMENTS: APIKeyRequirement[] = [
  { key: 'OPENAI_API_KEY', service: 'OpenAI', required: true },
  { key: 'CLAUDE_API_KEY', service: 'Claude', required: false }, // Optional for now
  { key: 'GMAIL_CLIENT_ID', service: 'Gmail', required: false },
  { key: 'GMAIL_CLIENT_SECRET', service: 'Gmail', required: false },
];

export function validateAPIKeys(): void {
  console.log('🔐 Validating API keys...\n');
  
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  
  for (const requirement of API_KEY_REQUIREMENTS) {
    const value = process.env[requirement.key];
    
    if (!value || value.trim() === '' || !checkAPIKeyFormat(requirement.key, value)) {
      if (requirement.required) {
        missingRequired.push(`  ❌ ${requirement.key} (${requirement.service} - REQUIRED)`);
      } else {
        missingOptional.push(`  ⚠️  ${requirement.key} (${requirement.service} - optional)`);
      }
    } else {
      // Mask the key for security
      const masked = value.substring(0, 10) + '...' + value.substring(value.length - 4);
      console.log(`  ✅ ${requirement.key}: ${masked}`);
    }
  }
  
  if (missingOptional.length > 0) {
    console.log('\n⚠️  Missing optional API keys (some features may be limited):');
    missingOptional.forEach(msg => console.log(msg));
  }
  
  if (missingRequired.length > 0) {
    console.error('\n❌ Missing REQUIRED API keys:');
    missingRequired.forEach(msg => console.error(msg));
    console.error('\n🛑 Application cannot start without required API keys!');
    console.error('📋 Please configure the following in your .env file:');
    console.error('   1. Copy .env.example to .env');
    console.error('   2. Add your API keys to the .env file');
    console.error('   3. Never commit your .env file to version control\n');
    process.exit(1);
  }
  
  console.log('\n✅ All required API keys validated successfully!\n');
}

export function checkAPIKeyFormat(key: string, value: string): boolean {
  // Strict format validation for API keys - NO TEST/PLACEHOLDER VALUES
  const patterns: Record<string, RegExp> = {
    OPENAI_API_KEY: /^sk-(?!test|proj-X{3,})[a-zA-Z0-9]{20,}$/,
    CLAUDE_API_KEY: /^sk-ant-(?!test|X{3,})[a-zA-Z0-9]{20,}$/,
    GMAIL_CLIENT_ID: /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/,
    GMAIL_CLIENT_SECRET: /^[a-zA-Z0-9_-]{20,}$/,
  };
  
  // Check for common placeholder patterns
  const placeholderPatterns = [
    /YOUR_.*_HERE/i,
    /your-.*-here/i,
    /test.*key/i,
    /dummy.*key/i,
    /fake.*key/i,
    /placeholder/i,
    /X{5,}/
  ];
  
  if (placeholderPatterns.some(p => p.test(value))) {
    return false;
  }
  
  const pattern = patterns[key];
  if (!pattern) return true; // No pattern defined, assume valid
  
  return pattern.test(value);
}