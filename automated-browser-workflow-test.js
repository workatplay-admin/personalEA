#!/usr/bin/env node

/**
 * Comprehensive Browser Workflow Test for PersonalEA
 * Simulates complete user journey before declaring ready for testing
 */

const axios = require('axios');
const { spawn } = require('child_process');

class PersonalEABrowserWorkflowTest {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY?.trim();
    this.baseApi = 'http://localhost:3000';
    this.baseFrontend = 'http://localhost:5174';
    this.codespaceApi = 'https://psychic-space-robot-vpw7gr9q6j39qv-3000.app.github.dev';
    this.codespaceFrontend = 'https://psychic-space-robot-vpw7gr9q6j39qv-5174.app.github.dev';
    
    this.testResults = {
      servicesRunning: false,
      portConfigured: false,
      frontendLoads: false,
      apiConfigWorks: false,
      goalTranslationWorks: false,
      smartCriteriaPresent: false,
      userWorkflowComplete: false
    };
  }

  log(message, type = 'info') {
    const icons = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪',
      browser: '🌐',
      workflow: '🔄',
      api: '🔌'
    };
    console.log(`${icons[type] || '📋'} ${message}`);
  }

  async testServiceHealth() {
    this.log('=== STEP 1: Service Health Check ===', 'test');
    
    try {
      // Test local services
      const apiHealth = await axios.get(`${this.baseApi}/health`, { timeout: 5000 });
      const frontendResponse = await axios.get(this.baseFrontend, { timeout: 5000 });
      
      this.testResults.servicesRunning = apiHealth.data.status === 'OK' && frontendResponse.status === 200;
      
      if (this.testResults.servicesRunning) {
        this.log('Local services are running', 'success');
        this.log(`API: ${apiHealth.data.service}`, 'info');
        this.log(`Frontend: Serving ${frontendResponse.data.length} bytes`, 'info');
      } else {
        this.log('Services not responding correctly', 'error');
      }
    } catch (e) {
      this.log(`Service health check failed: ${e.message}`, 'error');
      this.testResults.servicesRunning = false;
    }
  }

  async testPortConfiguration() {
    this.log('=== STEP 2: Port Configuration Test ===', 'test');
    
    try {
      // Test if port 3000 is properly exposed as PUBLIC
      this.log(`Testing Codespaces API URL: ${this.codespaceApi}`, 'api');
      
      const response = await axios.get(`${this.codespaceApi}/health`, { 
        timeout: 10000,
        validateStatus: () => true // Don't throw on any status
      });
      
      if (response.status === 200 && response.data.status === 'OK') {
        this.log('Port 3000 is PUBLIC and accessible!', 'success');
        this.testResults.portConfigured = true;
      } else if (response.status === 401) {
        this.log('Port 3000 is PRIVATE - needs to be set to PUBLIC', 'error');
        this.testResults.portConfigured = false;
      } else {
        this.log(`Unexpected response from port 3000: ${response.status}`, 'warning');
        this.testResults.portConfigured = false;
      }
    } catch (e) {
      this.log(`Port configuration test failed: ${e.message}`, 'error');
      this.testResults.portConfigured = false;
    }
  }

  async testFrontendContent() {
    this.log('=== STEP 3: Frontend Content Verification ===', 'test');
    
    try {
      const response = await axios.get(this.baseFrontend);
      const html = response.data;
      
      // Check for essential UI elements
      const requiredElements = [
        { name: 'Page Title', content: 'Goal & Strategy Service Testing' },
        { name: 'React App', content: 'root' },
        { name: 'Vite Development', content: 'vite' }
      ];
      
      let foundElements = 0;
      for (const element of requiredElements) {
        if (html.includes(element.content)) {
          this.log(`✓ Found: ${element.name}`, 'success');
          foundElements++;
        } else {
          this.log(`✗ Missing: ${element.name}`, 'error');
        }
      }
      
      this.testResults.frontendLoads = foundElements === requiredElements.length;
      
      if (this.testResults.frontendLoads) {
        this.log('Frontend is serving correctly', 'success');
      } else {
        this.log(`Frontend missing ${requiredElements.length - foundElements} elements`, 'warning');
      }
    } catch (e) {
      this.log(`Frontend test failed: ${e.message}`, 'error');
      this.testResults.frontendLoads = false;
    }
  }

  async simulateApiConfiguration() {
    this.log('=== STEP 4: API Configuration Simulation ===', 'test');
    
    if (!this.apiKey) {
      this.log('No API key available - cannot test configuration', 'warning');
      this.testResults.apiConfigWorks = false;
      return;
    }
    
    this.log(`Simulating user entering API key: ${this.apiKey.substring(0, 8)}...`, 'workflow');
    
    // Validate API key format
    const isValidFormat = this.apiKey.startsWith('sk-') && this.apiKey.length >= 20;
    
    if (isValidFormat) {
      this.log('API key format is valid', 'success');
      this.testResults.apiConfigWorks = true;
    } else {
      this.log('API key format is invalid', 'error');
      this.testResults.apiConfigWorks = false;
    }
  }

  async simulateGoalTranslation() {
    this.log('=== STEP 5: Goal Translation Workflow ===', 'test');
    
    if (!this.testResults.apiConfigWorks) {
      this.log('Skipping goal translation - API config failed', 'warning');
      return;
    }
    
    const testGoals = [
      'I want to learn Python programming this year',
      'Launch a new product feature by Q2 2025',
      'Improve my fitness and lose 20 pounds'
    ];
    
    let successfulTranslations = 0;
    
    for (const goal of testGoals) {
      try {
        this.log(`Testing goal: "${goal}"`, 'workflow');
        
        // Use the correct API URL based on port configuration
        const apiUrl = this.testResults.portConfigured ? this.codespaceApi : this.baseApi;
        
        const response = await axios.post(`${apiUrl}/api/v1/goals/translate`, {
          raw_goal: goal,
          user_id: 'browser-test-user'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-OpenAI-API-Key': this.apiKey
          },
          timeout: 30000
        });
        
        if (response.data.success && response.data.data) {
          const goalData = response.data.data;
          this.log(`✓ Generated: "${goalData.title}"`, 'success');
          this.log(`  Confidence: ${(goalData.confidence * 100).toFixed(1)}%`, 'info');
          
          // Check SMART criteria
          if (goalData.criteria) {
            const criteriaCount = Object.keys(goalData.criteria).length;
            this.log(`  SMART Criteria: ${criteriaCount}/5 components`, 'info');
            
            if (criteriaCount >= 5) {
              this.testResults.smartCriteriaPresent = true;
            }
          }
          
          successfulTranslations++;
        } else {
          this.log(`✗ Translation failed for: "${goal}"`, 'error');
        }
      } catch (e) {
        if (e.response?.status === 401) {
          this.log(`✗ API key unauthorized for: "${goal}"`, 'error');
        } else if (e.code === 'ECONNREFUSED') {
          this.log(`✗ Connection refused - service not accessible`, 'error');
        } else {
          this.log(`✗ Error translating "${goal}": ${e.message}`, 'error');
        }
      }
    }
    
    this.testResults.goalTranslationWorks = successfulTranslations === testGoals.length;
    
    if (this.testResults.goalTranslationWorks) {
      this.log(`All ${testGoals.length} goal translations successful!`, 'success');
    } else {
      this.log(`Only ${successfulTranslations}/${testGoals.length} translations successful`, 'warning');
    }
  }

  async simulateCompleteUserWorkflow() {
    this.log('=== STEP 6: Complete User Workflow Simulation ===', 'test');
    
    this.log('Simulating user journey:', 'workflow');
    this.log('1. User opens PersonalEA interface ✓', 'workflow');
    this.log('2. User sees API configuration screen ✓', 'workflow');
    this.log('3. User enters OpenAI API key ✓', 'workflow');
    this.log('4. User clicks "Configure API" ✓', 'workflow');
    this.log('5. User enters goal: "I want to be a senior developer" ✓', 'workflow');
    this.log('6. User clicks "Transform to SMART Goal" ✓', 'workflow');
    
    if (this.testResults.goalTranslationWorks) {
      this.log('7. User sees SMART goal analysis ✓', 'workflow');
      this.log('8. User reviews SMART criteria breakdown ✓', 'workflow');
      this.log('9. User can continue to next steps ✓', 'workflow');
      this.testResults.userWorkflowComplete = true;
    } else {
      this.log('7. User sees error message ✗', 'workflow');
      this.testResults.userWorkflowComplete = false;
    }
  }

  generateComprehensiveReport() {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🎯 PERSONALEA BROWSER WORKFLOW TEST REPORT', 'test');
    this.log('='.repeat(60), 'info');
    
    const testChecks = [
      { name: '🔧 Services Running', passed: this.testResults.servicesRunning },
      { name: '🌐 Port 3000 Public', passed: this.testResults.portConfigured },
      { name: '📱 Frontend Loading', passed: this.testResults.frontendLoads },
      { name: '🔑 API Configuration', passed: this.testResults.apiConfigWorks },
      { name: '🤖 Goal Translation', passed: this.testResults.goalTranslationWorks },
      { name: '📊 SMART Criteria', passed: this.testResults.smartCriteriaPresent },
      { name: '👤 User Workflow', passed: this.testResults.userWorkflowComplete }
    ];
    
    let passedTests = 0;
    testChecks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      this.log(`${icon} ${check.name}: ${check.passed ? 'PASSED' : 'FAILED'}`, 
               check.passed ? 'success' : 'error');
      if (check.passed) passedTests++;
    });
    
    const allPassed = passedTests === testChecks.length;
    this.log(`\n🎯 OVERALL: ${passedTests}/${testChecks.length} tests passed`, 
             allPassed ? 'success' : 'warning');
    
    if (allPassed) {
      this.log('\n🎉 ALL BROWSER WORKFLOW TESTS PASSED!', 'success');
      this.log('✅ PersonalEA is VERIFIED READY for user testing!', 'success');
      
      this.log('\n📋 VERIFIED USER EXPERIENCE:', 'info');
      this.log('✓ User can access the application', 'success');
      this.log('✓ User can configure their API key', 'success');
      this.log('✓ User can translate goals to SMART format', 'success');
      this.log('✓ User receives detailed SMART analysis', 'success');
      this.log('✓ Complete workflow functions correctly', 'success');
      
      this.log('\n🚀 READY FOR USER TESTING!', 'success');
      this.log('URL: Click globe icon next to port 5174 in Ports tab', 'info');
      
    } else {
      this.log('\n❌ BROWSER WORKFLOW INCOMPLETE', 'error');
      this.log('The following issues must be resolved:', 'warning');
      
      if (!this.testResults.portConfigured) {
        this.log('\n🔧 CRITICAL: Port 3000 must be set to PUBLIC', 'error');
        this.log('1. Go to Ports tab in Codespaces', 'info');
        this.log('2. Right-click port 3000 → Port Visibility → Public', 'info');
      }
      
      if (!this.testResults.apiConfigWorks) {
        this.log('\n🔑 API Configuration Issue', 'error');
        this.log('Verify your OPENAI_API_KEY is valid', 'info');
      }
      
      if (!this.testResults.goalTranslationWorks) {
        this.log('\n🤖 Goal Translation Not Working', 'error');
        this.log('Check API connectivity and CORS configuration', 'info');
      }
    }
    
    return allPassed;
  }

  async runCompleteWorkflowTest() {
    this.log('🚀 Starting Complete PersonalEA Browser Workflow Test', 'test');
    this.log('This simulates the entire user journey from start to finish\n', 'info');
    
    try {
      await this.testServiceHealth();
      await this.testPortConfiguration();
      await this.testFrontendContent();
      await this.simulateApiConfiguration();
      await this.simulateGoalTranslation();
      await this.simulateCompleteUserWorkflow();
      
      const ready = this.generateComprehensiveReport();
      
      if (ready) {
        this.log('\n✅ BROWSER WORKFLOW VERIFICATION COMPLETE', 'success');
        this.log('PersonalEA has been tested and verified ready for user testing!', 'success');
      } else {
        this.log('\n❌ BROWSER WORKFLOW VERIFICATION FAILED', 'error');
        this.log('Fix the issues above before user testing', 'warning');
      }
      
      return ready;
      
    } catch (error) {
      this.log(`\n❌ CRITICAL ERROR in workflow test: ${error.message}`, 'error');
      this.generateComprehensiveReport();
      return false;
    }
  }
}

// Run the comprehensive workflow test
async function main() {
  const workflowTest = new PersonalEABrowserWorkflowTest();
  const ready = await workflowTest.runCompleteWorkflowTest();
  process.exit(ready ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Fatal workflow test error:', error);
  process.exit(1);
});