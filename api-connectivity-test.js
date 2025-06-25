#!/usr/bin/env node

/**
 * API Connectivity Test
 * Tests the complete API flow from frontend perspective
 */

const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:3000/api/v1';
const FRONTEND_URL = 'http://localhost:5174';

// Test scenarios
const testScenarios = [
  {
    name: 'Health Check',
    method: 'GET',
    url: 'http://localhost:3000/health',
    headers: {},
    data: null
  },
  {
    name: 'Goal Translation - Without API Key (using env)',
    method: 'POST',
    url: `${API_BASE_URL}/goals/translate`,
    headers: { 'Content-Type': 'application/json' },
    data: { raw_goal: 'I want to learn React' }
  },
  {
    name: 'Goal Translation - With API Key Header',
    method: 'POST',
    url: `${API_BASE_URL}/goals/translate`,
    headers: { 
      'Content-Type': 'application/json',
      'X-OpenAI-API-Key': process.env.OPENAI_API_KEY
    },
    data: { raw_goal: 'I want to become a better developer' }
  },
  {
    name: 'Component Question Test',
    method: 'POST',
    url: `${API_BASE_URL}/goals/component-question`,
    headers: { 'Content-Type': 'application/json' },
    data: { 
      goalTitle: 'I want to learn React', 
      componentKey: 'measurable' 
    }
  },
  {
    name: 'Frontend Accessibility Test',
    method: 'GET',
    url: FRONTEND_URL,
    headers: {},
    data: null
  }
];

// Test execution
async function runTests() {
  console.log('🔍 API Connectivity Test Suite');
  console.log('================================');
  console.log(`Backend API: ${API_BASE_URL}`);
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log('');

  const results = [];

  for (const test of testScenarios) {
    console.log(`🧪 Testing: ${test.name}`);
    
    try {
      const startTime = Date.now();
      
      const config = {
        method: test.method,
        url: test.url,
        headers: test.headers,
        timeout: 15000, // 15 second timeout
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      };

      if (test.data) {
        config.data = test.data;
      }

      const response = await axios(config);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const result = {
        test: test.name,
        status: 'SUCCESS',
        httpStatus: response.status,
        duration: `${duration}ms`,
        responseSize: JSON.stringify(response.data).length,
        data: response.data
      };

      console.log(`   ✅ Success (${response.status}) - ${duration}ms`);
      console.log(`   📊 Response size: ${result.responseSize} chars`);
      
      if (test.name.includes('Goal Translation')) {
        console.log(`   🎯 Goal created: ${response.data?.data?.title || 'N/A'}`);
        console.log(`   🔮 Confidence: ${response.data?.data?.confidence || 'N/A'}`);
      }
      
      results.push(result);

    } catch (error) {
      const result = {
        test: test.name,
        status: 'FAILED',
        error: error.message,
        httpStatus: error.response?.status || 'NETWORK_ERROR',
        details: error.response?.data || null
      };

      console.log(`   ❌ Failed: ${error.message}`);
      if (error.response) {
        console.log(`   📄 HTTP Status: ${error.response.status}`);
        console.log(`   📝 Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      
      results.push(result);
    }
    
    console.log('');
  }

  // Summary
  console.log('📊 Test Summary');
  console.log('===============');
  
  const passed = results.filter(r => r.status === 'SUCCESS').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / results.length) * 100)}%`);
  
  console.log('\n🔍 Detailed Results:');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.test}: ${result.status}`);
    if (result.status === 'FAILED') {
      console.log(`   Error: ${result.error}`);
    } else if (result.duration) {
      console.log(`   Duration: ${result.duration}, Status: ${result.httpStatus}`);
    }
  });

  // Diagnostic Information
  console.log('\n🔧 Diagnostic Information:');
  console.log(`Node.js Version: ${process.version}`);
  console.log(`Current Directory: ${process.cwd()}`);
  console.log(`Environment Variables: OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? 'SET' : 'NOT_SET'}`);
  
  return results;
}

// Cross-origin test
async function testCrossOrigin() {
  console.log('\n🌐 Cross-Origin Request Test');
  console.log('============================');
  
  try {
    // Simulate what the frontend would do
    const response = await axios.post(`${API_BASE_URL}/goals/translate`, 
      { raw_goal: 'Cross-origin test goal' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL,  // Simulate frontend origin
          'X-OpenAI-API-Key': process.env.OPENAI_API_KEY
        },
        timeout: 15000
      }
    );
    
    console.log('✅ Cross-origin request successful');
    console.log(`📊 Status: ${response.status}`);
    console.log(`🎯 Goal: ${response.data?.data?.title}`);
    
  } catch (error) {
    console.log('❌ Cross-origin request failed');
    console.log(`Error: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
    }
  }
}

// Run all tests
async function main() {
  try {
    const results = await runTests();
    await testCrossOrigin();
    
    // Export results for memory storage
    const testReport = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'SUCCESS').length,
        failed: results.filter(r => r.status === 'FAILED').length
      },
      results: results,
      environment: {
        nodeVersion: process.version,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        backendUrl: API_BASE_URL,
        frontendUrl: FRONTEND_URL
      }
    };
    
    console.log('\n💾 Test report generated for memory storage');
    return testReport;
    
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().then(report => {
    console.log('\n🏁 API connectivity test completed');
    process.exit(report.summary.failed > 0 ? 1 : 0);
  });
}

module.exports = { runTests, testCrossOrigin, main };