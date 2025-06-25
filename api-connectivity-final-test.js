#!/usr/bin/env node

/**
 * Final API Connectivity Test - Verify all fixes are working
 */

const http = require('http');

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function runFinalTests() {
  console.log('🔍 Final API Connectivity Test Suite');
  console.log('=====================================');
  
  const tests = [
    {
      name: 'Backend Health Check',
      options: {
        hostname: 'localhost',
        port: 3000,
        path: '/health',
        method: 'GET'
      }
    },
    {
      name: 'Environment Configuration Endpoint',
      options: {
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/config/environment',
        method: 'GET'
      }
    },
    {
      name: 'Goal Translation (Environment Key)',
      options: {
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/goals/translate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      data: JSON.stringify({ raw_goal: 'Final test - I want to master Node.js' })
    },
    {
      name: 'Component Question Generation',
      options: {
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/goals/component-question',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      data: JSON.stringify({ 
        goalTitle: 'I want to master Node.js', 
        componentKey: 'timeBound' 
      })
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    
    try {
      if (test.data && test.options.headers) {
        test.options.headers['Content-Length'] = Buffer.byteLength(test.data);
      }

      const result = await makeRequest(test.options, test.data);
      
      if (result.statusCode === 200) {
        console.log(`   ✅ SUCCESS (${result.statusCode})`);
        
        try {
          const parsed = JSON.parse(result.body);
          if (test.name.includes('Environment Configuration')) {
            console.log(`   🔧 Environment configured: ${parsed.data?.environmentConfigured}`);
            console.log(`   🔑 Auto-config supported: ${parsed.data?.autoConfigurationSupported}`);
          } else if (test.name.includes('Goal Translation')) {
            console.log(`   🎯 Goal created: ${parsed.data?.title}`);
            console.log(`   📊 Confidence: ${parsed.data?.confidence}`);
          } else if (test.name.includes('Component Question')) {
            console.log(`   ❓ Question: ${parsed.data?.question}`);
          }
        } catch (e) {
          console.log(`   📄 Response: ${result.body.substring(0, 100)}...`);
        }
        
        results.push({ test: test.name, status: 'PASS', code: result.statusCode });
      } else {
        console.log(`   ❌ FAILED (${result.statusCode})`);
        console.log(`   📄 Response: ${result.body}`);
        results.push({ test: test.name, status: 'FAIL', code: result.statusCode });
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.push({ test: test.name, status: 'ERROR', error: error.message });
    }
  }

  // Summary
  console.log('\n📊 Final Test Results');
  console.log('=====================');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status !== 'PASS').length;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`📈 Success Rate: ${Math.round((passed / results.length) * 100)}%`);

  if (passed === results.length) {
    console.log('\n🎉 ALL TESTS PASSED - API Connectivity Fixed!');
    console.log('\n✅ Fixes Implemented:');
    console.log('   • Backend environment configuration endpoint added');
    console.log('   • Frontend auto-configuration with backend environment');
    console.log('   • Vite proxy configuration for seamless API calls');
    console.log('   • Improved error handling and authentication flow');
  } else {
    console.log('\n⚠️  Some tests failed - additional fixes may be needed');
  }

  return results;
}

if (require.main === module) {
  runFinalTests().then(() => {
    console.log('\n🏁 Final connectivity test completed');
  }).catch(error => {
    console.error('Final test failed:', error);
    process.exit(1);
  });
}

module.exports = { runFinalTests };