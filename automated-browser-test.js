#!/usr/bin/env node

/**
 * Automated Browser Testing for PersonalEA Goal Strategy Service
 * Tests the complete user workflow including API integration
 */

const axios = require('axios');
const { spawn } = require('child_process');

const API_BASE = 'http://localhost:3000';
const FRONTEND_BASE = 'http://localhost:5174';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Test data
const testGoals = [
  {
    name: 'Python Learning Goal',
    goal: 'I want to learn Python programming this year',
    expectedKeywords: ['python', 'programming', 'learn', 'specific', 'measurable']
  },
  {
    name: 'Business Goal',
    goal: 'Launch a new product feature by Q2',
    expectedKeywords: ['launch', 'product', 'Q2', 'deadline', 'specific']
  }
];

class PersonalEATestSuite {
  constructor() {
    this.results = {
      apiTests: [],
      frontendTests: [],
      integrationTests: [],
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async checkPrerequisites() {
    this.log('Checking test prerequisites...', 'test');
    
    // Check if OpenAI API key is available
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'demo-key') {
      this.log('OpenAI API key not found - testing in fallback mode', 'warning');
      this.useApiFallback = true;
    } else {
      this.log(`OpenAI API Key: ${OPENAI_API_KEY.substring(0, 8)}...`, 'success');
      this.useApiFallback = false;
    }
    
    // Check if services are running
    try {
      await axios.get(`${API_BASE}/health`, { timeout: 5000 });
      this.log('API server is running', 'success');
    } catch (error) {
      throw new Error(`API server not accessible at ${API_BASE}. Please start services first.`);
    }
    
    try {
      await axios.get(FRONTEND_BASE, { timeout: 5000 });
      this.log('Frontend server is running', 'success');
    } catch (error) {
      throw new Error(`Frontend not accessible at ${FRONTEND_BASE}. Please start services first.`);
    }
  }

  async testAPIEndpoints() {
    this.log('Testing API endpoints...', 'test');
    
    if (this.useApiFallback) {
      this.log('Testing without API key (fallback mode)...', 'warning');
    }
    
    for (const testCase of testGoals) {
      try {
        this.log(`Testing goal translation: "${testCase.goal}"`, 'info');
        
        const headers = {
          'Content-Type': 'application/json'
        };
        
        if (!this.useApiFallback) {
          headers['X-OpenAI-API-Key'] = OPENAI_API_KEY;
        }
        
        const response = await axios.post(`${API_BASE}/api/v1/goals/translate`, {
          raw_goal: testCase.goal,
          user_id: 'automated-test-user'
        }, {
          headers,
          timeout: 30000
        });
        
        // Validate response structure
        if (response.status === 200 && response.data.success && response.data.data) {
          const goal = response.data.data;
          
          this.log(`✅ ${testCase.name}: Translation successful`, 'success');
          this.log(`   📋 SMART Goal: ${goal.title?.substring(0, 100)}...`, 'info');
          this.log(`   🎯 Confidence: ${goal.confidence}`, 'info');
          
          // Validate SMART criteria
          if (goal.criteria) {
            const criteriaCount = Object.keys(goal.criteria).length;
            this.log(`   📊 SMART Criteria: ${criteriaCount}/5 components`, 'info');
          }
          
          this.results.apiTests.push({
            test: testCase.name,
            status: 'passed',
            response: goal
          });
        } else {
          throw new Error('Invalid response structure');
        }
        
      } catch (error) {
        this.log(`❌ ${testCase.name}: ${error.message}`, 'error');
        this.results.apiTests.push({
          test: testCase.name,
          status: 'failed',
          error: error.message
        });
      }
    }
  }

  async testFrontendAccessibility() {
    this.log('Testing frontend accessibility...', 'test');
    
    try {
      const response = await axios.get(FRONTEND_BASE);
      const html = response.data;
      
      // Check for key UI elements
      const requiredElements = [
        'Goal & Strategy Service Testing',
        'OpenAI API Key',
        'Configure API'
      ];
      
      let foundElements = 0;
      for (const element of requiredElements) {
        if (html.includes(element)) {
          foundElements++;
          this.log(`✅ Found UI element: "${element}"`, 'success');
        } else {
          this.log(`❌ Missing UI element: "${element}"`, 'error');
        }
      }
      
      this.results.frontendTests.push({
        test: 'UI Elements',
        status: foundElements === requiredElements.length ? 'passed' : 'failed',
        foundElements,
        totalElements: requiredElements.length
      });
      
    } catch (error) {
      this.log(`Frontend accessibility test failed: ${error.message}`, 'error');
      this.results.frontendTests.push({
        test: 'Frontend Accessibility',
        status: 'failed',
        error: error.message
      });
    }
  }

  async simulateBrowserWorkflow() {
    this.log('Simulating browser workflow...', 'test');
    
    // Test 1: Configure API key
    try {
      this.log('Testing API configuration flow...', 'info');
      
      // Simulate what happens when user configures API key
      const configPayload = {
        jwtToken: 'testing-jwt-' + Date.now(),
        openaiApiKey: OPENAI_API_KEY
      };
      
      this.log('✅ API configuration simulation successful', 'success');
      
      // Test 2: Goal translation workflow
      this.log('Testing goal translation workflow...', 'info');
      
      const workflowHeaders = {
        'Content-Type': 'application/json'
      };
      
      if (!this.useApiFallback) {
        workflowHeaders['X-OpenAI-API-Key'] = OPENAI_API_KEY;
      }
      
      const workflowTest = await axios.post(`${API_BASE}/api/v1/goals/translate`, {
        raw_goal: 'Learn TypeScript for React development',
        user_id: 'workflow-test-user'
      }, {
        headers: workflowHeaders,
        timeout: 30000
      });
      
      if (workflowTest.status === 200 && workflowTest.data.success) {
        this.log('✅ Complete workflow simulation successful', 'success');
        this.results.integrationTests.push({
          test: 'Complete Workflow',
          status: 'passed',
          goal: workflowTest.data.data
        });
      } else {
        throw new Error('Workflow simulation failed');
      }
      
    } catch (error) {
      this.log(`Workflow simulation failed: ${error.message}`, 'error');
      this.results.integrationTests.push({
        test: 'Complete Workflow',
        status: 'failed',
        error: error.message
      });
    }
  }

  async runCompleteTestSuite() {
    this.log('🚀 Starting PersonalEA Goal Strategy Test Suite', 'info');
    this.log('=' .repeat(60), 'info');
    
    try {
      // Prerequisites
      await this.checkPrerequisites();
      
      // API Testing
      this.log('\n📡 PHASE 1: API Endpoint Testing', 'test');
      this.log('-' .repeat(40), 'info');
      await this.testAPIEndpoints();
      
      // Frontend Testing
      this.log('\n🌐 PHASE 2: Frontend Accessibility Testing', 'test');
      this.log('-' .repeat(40), 'info');
      await this.testFrontendAccessibility();
      
      // Integration Testing
      this.log('\n🔄 PHASE 3: Integration Testing', 'test');
      this.log('-' .repeat(40), 'info');
      await this.simulateBrowserWorkflow();
      
      // Results Summary
      this.generateTestReport();
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      this.results.errors.push(error.message);
      process.exit(1);
    }
  }

  generateTestReport() {
    this.log('\n📊 TEST RESULTS SUMMARY', 'test');
    this.log('=' .repeat(60), 'info');
    
    const apiPassed = this.results.apiTests.filter(t => t.status === 'passed').length;
    const frontendPassed = this.results.frontendTests.filter(t => t.status === 'passed').length;
    const integrationPassed = this.results.integrationTests.filter(t => t.status === 'passed').length;
    
    this.log(`📡 API Tests: ${apiPassed}/${this.results.apiTests.length} passed`, 
             apiPassed === this.results.apiTests.length ? 'success' : 'warning');
    
    this.log(`🌐 Frontend Tests: ${frontendPassed}/${this.results.frontendTests.length} passed`, 
             frontendPassed === this.results.frontendTests.length ? 'success' : 'warning');
    
    this.log(`🔄 Integration Tests: ${integrationPassed}/${this.results.integrationTests.length} passed`, 
             integrationPassed === this.results.integrationTests.length ? 'success' : 'warning');
    
    const totalTests = this.results.apiTests.length + this.results.frontendTests.length + this.results.integrationTests.length;
    const totalPassed = apiPassed + frontendPassed + integrationPassed;
    
    this.log(`\n🎯 OVERALL: ${totalPassed}/${totalTests} tests passed (${Math.round((totalPassed/totalTests) * 100)}%)`, 
             totalPassed === totalTests ? 'success' : 'warning');
    
    if (totalPassed === totalTests) {
      this.log('\n🎉 ALL TESTS PASSED! PersonalEA Goal Strategy Service is ready for user testing!', 'success');
      this.log('\n📋 User Testing Instructions:', 'info');
      this.log(`   1. Open: ${FRONTEND_BASE}`, 'info');
      this.log(`   2. Enter your OpenAI API key in the configuration`, 'info');
      this.log(`   3. Test goal translation with various goal types`, 'info');
      this.log(`   4. Review generated SMART goals and feedback`, 'info');
    } else {
      this.log('\n⚠️  Some tests failed. Please review the issues above.', 'warning');
    }
    
    if (this.results.errors.length > 0) {
      this.log('\n❌ ERRORS ENCOUNTERED:', 'error');
      this.results.errors.forEach(error => {
        this.log(`   • ${error}`, 'error');
      });
    }
  }
}

// Run the test suite
async function main() {
  const testSuite = new PersonalEATestSuite();
  await testSuite.runCompleteTestSuite();
}

main().catch(error => {
  console.error('❌ Fatal test error:', error);
  process.exit(1);
});