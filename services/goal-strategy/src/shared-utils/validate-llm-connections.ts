/**
 * LLM API Connection Validation
 * Tests actual connectivity to LLM services during startup
 */

import { OpenAI } from 'openai';

interface LLMConnectionTest {
  service: string;
  apiKey: string | undefined;
  endpoint?: string;
  testFunction: () => Promise<boolean>;
}

/**
 * Test OpenAI API connection
 */
async function testOpenAIConnection(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey });
    
    // Test with a minimal API call
    const response = await openai.models.list();
    
    // Check if we got valid models back
    return response.data && response.data.length > 0;
  } catch (error: any) {
    console.error('OpenAI connection test failed:', error.message);
    
    // Check for specific error types
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('OpenAI API key is invalid or unauthorized');
    } else if (error.message?.includes('429')) {
      throw new Error('OpenAI API rate limit exceeded');
    } else if (error.message?.includes('fetch')) {
      throw new Error('Network error connecting to OpenAI API');
    }
    
    throw error;
  }
}

/**
 * Test Anthropic/Claude API connection
 */
async function testAnthropicConnection(apiKey: string): Promise<boolean> {
  try {
    // Direct API call since we're not using SDK
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
    });
    
    // Even a 400 error means the API is reachable and key is valid
    return response.status !== 401 && response.status !== 403;
  } catch (error: any) {
    console.error('Anthropic connection test failed:', error.message);
    
    if (error.message?.includes('fetch')) {
      throw new Error('Network error connecting to Anthropic API');
    }
    
    throw error;
  }
}

/**
 * Validate all LLM connections at startup
 */
export async function validateLLMConnections(): Promise<void> {
  console.log('🤖 Validating LLM API connections...\n');
  
  const tests: LLMConnectionTest[] = [
    {
      service: 'OpenAI',
      apiKey: process.env.OPENAI_API_KEY,
      endpoint: 'https://api.openai.com',
      testFunction: () => testOpenAIConnection(process.env.OPENAI_API_KEY!)
    }
  ];
  
  // Add Anthropic test if key is present
  if (process.env.CLAUDE_API_KEY) {
    tests.push({
      service: 'Anthropic/Claude',
      apiKey: process.env.CLAUDE_API_KEY,
      endpoint: 'https://api.anthropic.com',
      testFunction: () => testAnthropicConnection(process.env.CLAUDE_API_KEY!)
    });
  }
  
  const failedConnections: string[] = [];
  
  for (const test of tests) {
    if (!test.apiKey) {
      console.log(`  ⏭️  ${test.service}: Skipped (no API key)`);
      continue;
    }
    
    try {
      console.log(`  🔄 Testing ${test.service} connection...`);
      const success = await test.testFunction();
      
      if (success) {
        console.log(`  ✅ ${test.service}: Connected successfully (${test.endpoint})`);
      } else {
        throw new Error('Connection test returned false');
      }
    } catch (error: any) {
      console.error(`  ❌ ${test.service}: Connection failed - ${error.message}`);
      failedConnections.push(`${test.service}: ${error.message}`);
    }
  }
  
  if (failedConnections.length > 0) {
    console.error('\n❌ LLM API connection validation failed:');
    failedConnections.forEach(msg => console.error(`   - ${msg}`));
    console.error('\n🛑 Please check your API keys and network connectivity');
    
    // Only exit if critical services fail
    if (failedConnections.some(msg => msg.includes('OpenAI'))) {
      console.error('   OpenAI is required for core functionality\n');
      process.exit(1);
    }
  } else {
    console.log('\n✅ All LLM API connections validated successfully!\n');
  }
}

/**
 * Runtime validation for API calls
 */
export function validateAPIKeyRuntime(apiKey: string | undefined, service: string): void {
  if (!apiKey) {
    throw new Error(`${service} API key not configured`);
  }
  
  if (apiKey.includes('YOUR_') || apiKey.includes('your-') || apiKey === 'test') {
    throw new Error(`${service} API key appears to be a placeholder`);
  }
  
  // Check for test keys
  if (apiKey.startsWith('sk-test-')) {
    console.warn(`⚠️  Warning: Using test API key for ${service}`);
  }
}

/**
 * Get validated API configuration
 */
export function getValidatedOpenAIConfig(): { apiKey: string; baseURL?: string } {
  const apiKey = process.env.OPENAI_API_KEY;
  
  validateAPIKeyRuntime(apiKey, 'OpenAI');
  
  return {
    apiKey: apiKey!,
    // Ensure we're using production endpoint
    baseURL: 'https://api.openai.com/v1'
  };
}