#!/usr/bin/env node

/**
 * Comprehensive API Test - Testing without potentially problematic headers
 */

const https = require('https');
const http = require('http');

function makeApiCall(options, postData) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;
    
    console.log('Making request with options:', {
      hostname: options.hostname,
      port: options.port,
      path: options.path,
      method: options.method,
      headers: Object.keys(options.headers).reduce((acc, key) => {
        acc[key] = key.includes('API-Key') ? options.headers[key].substring(0, 10) + '...' : options.headers[key];
        return acc;
      }, {})
    });

    const req = protocol.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Response body:', data);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      console.log('Sending data:', postData);
      req.write(postData);
    }
    
    req.end();
  });
}

async function testApi() {
  console.log('🧪 Comprehensive API Test');
  console.log('==========================');

  // Test 1: Health check
  console.log('\n1. Health Check');
  try {
    const healthResult = await makeApiCall({
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET',
      headers: {}
    });
    console.log('✅ Health check passed');
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: Goal translation without API key (should use environment)
  console.log('\n2. Goal Translation (Environment API Key)');
  try {
    const goalData = JSON.stringify({ raw_goal: 'I want to learn JavaScript' });
    const translateResult = await makeApiCall({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/goals/translate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(goalData)
      }
    }, goalData);
    
    if (translateResult.statusCode === 200) {
      console.log('✅ Goal translation passed');
      const response = JSON.parse(translateResult.body);
      console.log('📋 Goal title:', response.data?.title);
    } else {
      console.log('❌ Goal translation failed with status:', translateResult.statusCode);
    }
  } catch (error) {
    console.log('❌ Goal translation failed:', error.message);
  }

  // Test 3: Component question
  console.log('\n3. Component Question Test');
  try {
    const questionData = JSON.stringify({ 
      goalTitle: 'I want to learn JavaScript', 
      componentKey: 'specific' 
    });
    const questionResult = await makeApiCall({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/goals/component-question',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(questionData)
      }
    }, questionData);
    
    if (questionResult.statusCode === 200) {
      console.log('✅ Component question passed');
      const response = JSON.parse(questionResult.body);
      console.log('❓ Question:', response.data?.question);
    } else {
      console.log('❌ Component question failed with status:', questionResult.statusCode);
    }
  } catch (error) {
    console.log('❌ Component question failed:', error.message);
  }
}

if (require.main === module) {
  testApi().then(() => {
    console.log('\n🏁 Comprehensive API test completed');
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { testApi };