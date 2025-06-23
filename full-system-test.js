#!/usr/bin/env node

/**
 * Complete System Test for PersonalEA
 * Verifies everything is working before telling user to test
 */

const axios = require('axios');

class PersonalEASystemTest {
  constructor() {
    this.apiUrl = 'http://localhost:3000';
    this.frontendUrl = 'http://localhost:5174';
    this.apiKey = process.env.OPENAI_API_KEY;
    this.testsPassed = 0;
    this.totalTests = 0;
  }

  log(message, type = 'info') {
    const icons = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    };
    console.log(`${icons[type] || '📋'} ${message}`);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testService(url, name) {
    this.totalTests++;
    try {
      const response = await axios.get(url, { timeout: 5000 });
      this.log(`${name} is responding`, 'success');
      this.testsPassed++;
      return true;
    } catch (e) {
      this.log(`${name} is NOT responding: ${e.message}`, 'error');
      return false;
    }
  }

  async testCORS() {
    this.totalTests++;
    try {
      // Get Codespaces URL from environment or construct it
      const codespaceUrl = 'https://psychic-space-robot-vpw7gr9q6j39qv-3000.app.github.dev';
      
      this.log(`Testing CORS from simulated browser origin...`, 'test');
      
      const response = await axios.post(`${this.apiUrl}/api/v1/goals/translate`, {
        raw_goal: 'Test CORS',
        user_id: 'cors-test'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Origin': codespaceUrl.replace('-3000', '-5174'),
          'X-OpenAI-API-Key': 'test-key'
        },
        validateStatus: () => true // Don't throw on any status
      });
      
      // Check for CORS headers in response
      const headers = response.headers;
      const hasCORS = headers['access-control-allow-origin'] !== undefined;
      
      if (hasCORS) {
        this.log(`CORS headers present: ${headers['access-control-allow-origin']}`, 'success');
        this.testsPassed++;
        return true;
      } else {
        this.log('CORS headers missing - port 3000 may need to be PUBLIC', 'error');
        return false;
      }
    } catch (e) {
      this.log(`CORS test error: ${e.message}`, 'error');
      return false;
    }
  }

  async testAPIEndpoint() {
    this.totalTests++;
    
    if (!this.apiKey) {
      this.log('No API key in environment - testing with mock', 'warning');
      return false;
    }
    
    try {
      this.log(`Testing API with key: ${this.apiKey.substring(0, 8)}...`, 'test');
      
      const response = await axios.post(`${this.apiUrl}/api/v1/goals/translate`, {
        raw_goal: 'I want to learn Python programming',
        user_id: 'test-user'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-API-Key': this.apiKey
        },
        timeout: 30000
      });
      
      if (response.data.success && response.data.data) {
        this.log('Goal translation working!', 'success');
        this.log(`Generated: ${response.data.data.title}`, 'info');
        this.testsPassed++;
        return true;
      } else {
        this.log('Goal translation failed', 'error');
        return false;
      }
    } catch (e) {
      if (e.response?.status === 401) {
        this.log('API key invalid or unauthorized', 'error');
      } else {
        this.log(`API error: ${e.message}`, 'error');
      }
      return false;
    }
  }

  async testFrontend() {
    this.totalTests++;
    try {
      const response = await axios.get(this.frontendUrl);
      const html = response.data;
      
      // Check for key elements
      const hasTitle = html.includes('Goal & Strategy Service Testing');
      const hasApiConfig = html.includes('OpenAI API Key') || html.includes('Configure API');
      
      if (hasTitle && hasApiConfig) {
        this.log('Frontend UI elements verified', 'success');
        this.testsPassed++;
        return true;
      } else {
        this.log('Frontend missing required elements', 'error');
        return false;
      }
    } catch (e) {
      this.log(`Frontend test error: ${e.message}`, 'error');
      return false;
    }
  }

  async runAllTests() {
    this.log('🚀 PERSONALEA COMPLETE SYSTEM VERIFICATION', 'test');
    this.log('=' .repeat(50), 'info');
    
    // Wait for services to stabilize
    this.log('Waiting for services to stabilize...', 'info');
    await this.wait(3000);
    
    // Run all tests
    const apiUp = await this.testService(`${this.apiUrl}/health`, 'API Server');
    const frontendUp = await this.testService(this.frontendUrl, 'Frontend');
    const corsWorking = await this.testCORS();
    const apiWorking = await this.testAPIEndpoint();
    const uiWorking = await this.testFrontend();
    
    // Generate report
    this.log('\n' + '=' .repeat(50), 'info');
    this.log(`📊 TEST RESULTS: ${this.testsPassed}/${this.totalTests} passed`, 
             this.testsPassed === this.totalTests ? 'success' : 'warning');
    
    if (this.testsPassed === this.totalTests) {
      this.log('\n✅ ALL TESTS PASSED! PersonalEA is ready for user testing!', 'success');
      this.log('\n📋 TO START TESTING:', 'info');
      this.log('1. Go to Ports tab in Codespaces', 'info');
      this.log('2. Click globe icon next to port 5174', 'info');
      this.log('3. Enter your OpenAI API key', 'info');
      this.log('4. Test goal translation!', 'info');
    } else {
      this.log('\n❌ SYSTEM NOT READY - Issues found:', 'error');
      
      if (!corsWorking) {
        this.log('\n🔧 CORS FIX:', 'warning');
        this.log('1. Go to Ports tab', 'info');
        this.log('2. Right-click port 3000 → Port Visibility → Public', 'info');
        this.log('3. Restart this test', 'info');
      }
      
      if (!apiWorking && this.apiKey) {
        this.log('\n🔧 API KEY ISSUE:', 'warning');
        this.log('1. Verify your API key is valid', 'info');
        this.log('2. Check it starts with "sk-"', 'info');
      }
    }
    
    return this.testsPassed === this.totalTests;
  }
}

// Run the test
async function main() {
  const tester = new PersonalEASystemTest();
  const ready = await tester.runAllTests();
  process.exit(ready ? 0 : 1);
}

main();