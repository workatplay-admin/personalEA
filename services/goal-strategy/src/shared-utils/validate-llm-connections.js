"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLLMConnections = validateLLMConnections;
exports.validateAPIKeyRuntime = validateAPIKeyRuntime;
exports.getValidatedOpenAIConfig = getValidatedOpenAIConfig;
const openai_1 = require("openai");
async function testOpenAIConnection(apiKey) {
    try {
        const openai = new openai_1.OpenAI({ apiKey });
        const response = await openai.models.list();
        return response.data && response.data.length > 0;
    }
    catch (error) {
        console.error('OpenAI connection test failed:', error.message);
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            throw new Error('OpenAI API key is invalid or unauthorized');
        }
        else if (error.message?.includes('429')) {
            throw new Error('OpenAI API rate limit exceeded');
        }
        else if (error.message?.includes('fetch')) {
            throw new Error('Network error connecting to OpenAI API');
        }
        throw error;
    }
}
async function testAnthropicConnection(apiKey) {
    try {
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
        return response.status !== 401 && response.status !== 403;
    }
    catch (error) {
        console.error('Anthropic connection test failed:', error.message);
        if (error.message?.includes('fetch')) {
            throw new Error('Network error connecting to Anthropic API');
        }
        throw error;
    }
}
async function validateLLMConnections() {
    console.log('🤖 Validating LLM API connections...\n');
    const tests = [
        {
            service: 'OpenAI',
            apiKey: process.env.OPENAI_API_KEY,
            endpoint: 'https://api.openai.com',
            testFunction: () => testOpenAIConnection(process.env.OPENAI_API_KEY)
        }
    ];
    if (process.env.CLAUDE_API_KEY) {
        tests.push({
            service: 'Anthropic/Claude',
            apiKey: process.env.CLAUDE_API_KEY,
            endpoint: 'https://api.anthropic.com',
            testFunction: () => testAnthropicConnection(process.env.CLAUDE_API_KEY)
        });
    }
    const failedConnections = [];
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
            }
            else {
                throw new Error('Connection test returned false');
            }
        }
        catch (error) {
            console.error(`  ❌ ${test.service}: Connection failed - ${error.message}`);
            failedConnections.push(`${test.service}: ${error.message}`);
        }
    }
    if (failedConnections.length > 0) {
        console.error('\n❌ LLM API connection validation failed:');
        failedConnections.forEach(msg => console.error(`   - ${msg}`));
        console.error('\n🛑 Please check your API keys and network connectivity');
        if (failedConnections.some(msg => msg.includes('OpenAI'))) {
            console.error('   OpenAI is required for core functionality\n');
            process.exit(1);
        }
    }
    else {
        console.log('\n✅ All LLM API connections validated successfully!\n');
    }
}
function validateAPIKeyRuntime(apiKey, service) {
    if (!apiKey) {
        throw new Error(`${service} API key not configured`);
    }
    if (apiKey.includes('YOUR_') || apiKey.includes('your-') || apiKey === 'test') {
        throw new Error(`${service} API key appears to be a placeholder`);
    }
    if (apiKey.startsWith('sk-test-')) {
        console.warn(`⚠️  Warning: Using test API key for ${service}`);
    }
}
function getValidatedOpenAIConfig() {
    const apiKey = process.env.OPENAI_API_KEY;
    validateAPIKeyRuntime(apiKey, 'OpenAI');
    return {
        apiKey: apiKey,
        baseURL: 'https://api.openai.com/v1'
    };
}
//# sourceMappingURL=validate-llm-connections.js.map