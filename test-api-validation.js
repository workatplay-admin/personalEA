#!/usr/bin/env node

/**
 * Test script to verify API key validation
 * Run this script to test the API key enforcement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Testing API Key Validation System\n');
console.log('=====================================\n');

// Backup current .env if it exists
const envPath = path.join(__dirname, '.env');
const envBackupPath = path.join(__dirname, '.env.backup.test');

if (fs.existsSync(envPath)) {
  console.log('📦 Backing up current .env file...');
  fs.copyFileSync(envPath, envBackupPath);
}

// Test scenarios
const testScenarios = [
  {
    name: 'Missing OPENAI_API_KEY',
    env: {
      JWT_SECRET: 'test-jwt-secret-32-characters-long',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      // OPENAI_API_KEY is missing
    },
    expectedToFail: true
  },
  {
    name: 'Invalid OPENAI_API_KEY format',
    env: {
      JWT_SECRET: 'test-jwt-secret-32-characters-long',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      OPENAI_API_KEY: 'invalid-key-format'
    },
    expectedToFail: true
  },
  {
    name: 'Placeholder OPENAI_API_KEY',
    env: {
      JWT_SECRET: 'test-jwt-secret-32-characters-long',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      OPENAI_API_KEY: 'sk-YOUR-OPENAI-API-KEY-HERE'
    },
    expectedToFail: true
  },
  {
    name: 'Valid configuration',
    env: {
      JWT_SECRET: 'test-jwt-secret-32-characters-long',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      OPENAI_API_KEY: 'sk-proj-APAwNsmvxz8VS4UwoYIXI82n0ddaI6GFQ2T8XCJz'
    },
    expectedToFail: false
  }
];

// Function to create test .env file
function createTestEnv(envVars) {
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.writeFileSync(envPath, envContent);
}

// Function to test service startup
function testServiceStartup(servicePath, scenario) {
  console.log(`\n📋 Test: ${scenario.name}`);
  console.log('   Environment:', JSON.stringify(scenario.env, null, 2));
  
  createTestEnv(scenario.env);
  
  try {
    // Try to start the service (dry run - just validate)
    const result = execSync(`cd ${servicePath} && node -e "require('./src/config/environment')"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (scenario.expectedToFail) {
      console.log('   ❌ FAILED: Service started when it should have failed!');
      return false;
    } else {
      console.log('   ✅ PASSED: Service validated successfully');
      return true;
    }
  } catch (error) {
    if (scenario.expectedToFail) {
      console.log('   ✅ PASSED: Service correctly rejected invalid configuration');
      return true;
    } else {
      console.log('   ❌ FAILED: Service failed to start with valid configuration');
      console.log('   Error:', error.message);
      return false;
    }
  }
}

// Run tests
console.log('🔍 Testing Goal Strategy Service\n');
let passedTests = 0;
let totalTests = 0;

for (const scenario of testScenarios) {
  totalTests++;
  if (testServiceStartup(path.join(__dirname, 'services/goal-strategy'), scenario)) {
    passedTests++;
  }
}

// Restore original .env
if (fs.existsSync(envBackupPath)) {
  console.log('\n📦 Restoring original .env file...');
  fs.copyFileSync(envBackupPath, envPath);
  fs.unlinkSync(envBackupPath);
} else {
  // Clean up test .env
  fs.unlinkSync(envPath);
}

// Summary
console.log('\n=====================================');
console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
console.log('=====================================\n');

if (passedTests === totalTests) {
  console.log('✅ All API key validation tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some API key validation tests failed!');
  process.exit(1);
}