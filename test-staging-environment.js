#!/usr/bin/env node

/**
 * Automated Testing Script for PersonalEA Staging Environment
 * This script verifies that all services are running and functional
 */

const axios = require('axios').default;

const BASE_URL = 'http://localhost';
const API_PORT = 3000;
const FRONTEND_PORT = 5174;

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  testApiKey: process.env.OPENAI_API_KEY || 'test-key-for-validation'
};

class StagingTester {
  constructor() {
    this.results = {
      apiHealth: false,
      frontendHealth: false,
      goalTranslation: false,
      apiValidation: false,
      overallStatus: false
    };
  }

  async runAllTests() {
    console.log('🧪 Starting PersonalEA Staging Environment Tests...\n');
    
    try {
      await this.testApiHealth();
      await this.testFrontendHealth();
      await this.testApiValidation();
      await this.testGoalTranslation();
      
      this.calculateOverallStatus();
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed with error:', error.message);
      process.exit(1);
    }
  }

  async testApiHealth() {
    console.log('🔍 Testing API Server Health...');
    
    try {
      const response = await axios.get(`${BASE_URL}:${API_PORT}/health`, {
        timeout: TEST_CONFIG.timeout
      });
      
      if (response.status === 200 && response.data.status === 'OK') {
        console.log('   ✅ API Server is healthy');
        console.log(`   📊 Service: ${response.data.service}`);
        console.log(`   🕒 Timestamp: ${response.data.timestamp}`);
        this.results.apiHealth = true;
      } else {
        console.log('   ❌ API Server health check failed');
        console.log('   📄 Response:', response.data);
      }
    } catch (error) {
      console.log('   ❌ API Server is not responding');
      console.log(`   🔍 Error: ${error.message}`);
      console.log(`   🌐 URL: ${BASE_URL}:${API_PORT}/health`);
    }
    console.log('');
  }

  async testFrontendHealth() {
    console.log('🖥️  Testing Frontend Interface...');
    
    try {
      const response = await axios.get(`${BASE_URL}:${FRONTEND_PORT}`, {
        timeout: TEST_CONFIG.timeout
      });
      
      if (response.status === 200 && response.data.includes('Goal & Strategy Service Testing Interface')) {
        console.log('   ✅ Frontend is serving correctly');
        console.log('   📄 Title: Goal & Strategy Service Testing Interface');
        console.log(`   🌐 URL: ${BASE_URL}:${FRONTEND_PORT}`);
        this.results.frontendHealth = true;
      } else {
        console.log('   ❌ Frontend is not serving expected content');
        console.log('   📄 Content preview:', response.data.substring(0, 200));
      }
    } catch (error) {
      console.log('   ❌ Frontend is not responding');
      console.log(`   🔍 Error: ${error.message}`);
      console.log(`   🌐 URL: ${BASE_URL}:${FRONTEND_PORT}`);
    }
    console.log('');
  }

  async testApiValidation() {
    console.log('🔑 Testing API Request Validation...');
    
    try {
      // Test invalid request (should fail)
      const invalidResponse = await axios.post(
        `${BASE_URL}:${API_PORT}/api/v1/goals/translate`,
        { goal: 'test goal' }, // Wrong format
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: TEST_CONFIG.timeout,
          validateStatus: () => true // Don't throw on 4xx/5xx
        }
      );
      
      if (invalidResponse.status === 401 && invalidResponse.data.error === 'OpenAI API key required. Please provide X-OpenAI-API-Key header.') {
        console.log('   ✅ API validation working correctly');
        console.log('   📋 Properly rejects requests without API key');
        this.results.apiValidation = true;
      } else if (invalidResponse.status === 400 && invalidResponse.data.error === 'raw_goal is required') {
        console.log('   ✅ API validation working correctly');
        console.log('   📋 Properly rejects invalid requests');
        this.results.apiValidation = true;
      } else {
        console.log('   ❌ API validation not working as expected');
        console.log('   📄 Response:', invalidResponse.data);
      }
    } catch (error) {
      console.log('   ❌ API validation test failed');
      console.log(`   🔍 Error: ${error.message}`);
    }
    console.log('');
  }

  async testGoalTranslation() {
    console.log('🎯 Testing Goal Translation Feature...');
    
    if (!TEST_CONFIG.testApiKey || TEST_CONFIG.testApiKey === 'test-key-for-validation') {
      console.log('   ⚠️  Skipping goal translation test - no valid OpenAI API key');
      console.log('   💡 Set OPENAI_API_KEY environment variable to test this feature');
      console.log('');
      return;
    }
    
    try {
      const goalTranslationResponse = await axios.post(
        `${BASE_URL}:${API_PORT}/api/v1/goals/translate`,
        { 
          raw_goal: 'I want to learn programming',
          user_id: 'test-user-staging'
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            'X-OpenAI-API-Key': String(TEST_CONFIG.testApiKey).trim()
          },
          timeout: 30000, // Longer timeout for AI processing
          validateStatus: () => true
        }
      );
      
      if (goalTranslationResponse.status === 200 && goalTranslationResponse.data.success && goalTranslationResponse.data.data) {
        console.log('   ✅ Goal translation working correctly');
        console.log('   🎯 Input: "I want to learn programming"');
        console.log('   📝 SMART Goal Generated:', goalTranslationResponse.data.data.title.substring(0, 100) + '...');
        console.log('   📊 Confidence:', goalTranslationResponse.data.data.confidence);
        this.results.goalTranslation = true;
      } else {
        console.log('   ❌ Goal translation failed');
        console.log('   📄 Response:', goalTranslationResponse.data);
      }
    } catch (error) {
      console.log('   ❌ Goal translation test failed');
      console.log(`   🔍 Error: ${error.message}`);
    }
    console.log('');
  }

  calculateOverallStatus() {
    const requiredTests = ['apiHealth', 'frontendHealth', 'apiValidation'];
    const allRequiredPassed = requiredTests.every(test => this.results[test]);
    this.results.overallStatus = allRequiredPassed;
  }

  printResults() {
    console.log('📊 Test Results Summary:');
    console.log('========================');
    console.log(`API Server Health:      ${this.results.apiHealth ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Frontend Interface:     ${this.results.frontendHealth ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`API Validation:         ${this.results.apiValidation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Goal Translation:       ${this.results.goalTranslation ? '✅ PASS' : '⚠️  SKIP (no API key)'}`);
    console.log('');
    console.log(`Overall Status:         ${this.results.overallStatus ? '✅ STAGING READY' : '❌ STAGING NOT READY'}`);
    console.log('');

    if (this.results.overallStatus) {
      console.log('🎉 PersonalEA Staging Environment is Ready for Testing!');
      console.log('');
      console.log('🔗 Access Points:');
      console.log(`   🎯 Testing Interface:  ${BASE_URL}:${FRONTEND_PORT}`);
      console.log(`   📊 API Server:         ${BASE_URL}:${API_PORT}`);
      console.log(`   🏥 Health Check:       ${BASE_URL}:${API_PORT}/health`);
      console.log('');
      console.log('📋 To start user testing:');
      console.log('   1. Open your browser to: http://localhost:5174');
      console.log('   2. Enter your OpenAI API key in the configuration');
      console.log('   3. Start testing goal translation features');
      console.log('');
      console.log('⚠️  Remember: This is partial testing (~35% of PersonalEA)');
      console.log('   - Calendar Service is missing');
      console.log('   - Data Sovereignty Framework not implemented');
      console.log('   - Do not enter sensitive personal information');
    } else {
      console.log('❌ Staging Environment Issues Detected');
      console.log('');
      console.log('🔧 Troubleshooting Steps:');
      if (!this.results.apiHealth) {
        console.log('   1. Check if API server is running: curl http://localhost:3000/health');
        console.log('   2. Restart API server if needed');
      }
      if (!this.results.frontendHealth) {
        console.log('   1. Check if frontend is running: curl http://localhost:5174');
        console.log('   2. Restart frontend if needed');
      }
      console.log('   3. Try restarting the entire environment: ./start-goal-testing.sh');
    }
  }

  async runSimpleConnectivityTest() {
    console.log('🔌 Running Simple Connectivity Test...\n');
    
    const endpoints = [
      { name: 'API Health', url: `${BASE_URL}:${API_PORT}/health` },
      { name: 'Frontend Interface', url: `${BASE_URL}:${FRONTEND_PORT}` }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { timeout: 5000 });
        console.log(`✅ ${endpoint.name}: HTTP ${response.status} - RESPONDING`);
      } catch (error) {
        console.log(`❌ ${endpoint.name}: ${error.message}`);
      }
    }
    console.log('');
  }
}

// Run tests based on command line argument
async function main() {
  const tester = new StagingTester();
  
  const testType = process.argv[2] || 'full';
  
  if (testType === 'simple') {
    await tester.runSimpleConnectivityTest();
  } else {
    await tester.runAllTests();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});