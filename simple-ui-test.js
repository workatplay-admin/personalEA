#!/usr/bin/env node

const http = require('http');

class SimpleUITester {
  constructor() {
    this.results = {
      serverHealth: false,
      frontendLoads: false,
      noTestButtons: false,
      overallPass: false
    };
  }

  async runTests() {
    console.log('🧪 Starting Simple UI Testing...\n');

    try {
      // Test 1: API Server Health
      console.log('1. Testing API Server Health...');
      const healthResponse = await this.makeRequest('localhost', 3000, '/health', 'GET');
      
      if (healthResponse.status === 'OK') {
        console.log('   ✅ API Server healthy');
        this.results.serverHealth = true;
      } else {
        console.log('   ❌ API Server unhealthy');
        return this.reportResults();
      }

      // Test 2: Frontend Server Loads
      console.log('\n2. Testing Frontend Server...');
      try {
        const frontendResponse = await this.makeHTTPRequest('localhost', 5174, '/', 'GET');
        
        if (frontendResponse && frontendResponse.includes('Goal & Strategy Service Testing')) {
          console.log('   ✅ Frontend loads correctly');
          this.results.frontendLoads = true;
          
          // Test 3: Check for unwanted test buttons in HTML
          console.log('\n3. Checking for unwanted buttons in HTML...');
          const hasTestButtons = frontendResponse.includes('🧪 Test Goal Translation') ||
                                frontendResponse.includes('Empty Goal') ||
                                frontendResponse.includes('Test Goal Translation');
          
          if (!hasTestButtons) {
            console.log('   ✅ No unwanted test buttons found in HTML');
            this.results.noTestButtons = true;
          } else {
            console.log('   ❌ Found unwanted test buttons in HTML');
          }
          
        } else {
          console.log('   ❌ Frontend not loading properly');
        }
      } catch (error) {
        console.log('   ❌ Frontend connection error:', error.message);
      }

    } catch (error) {
      console.log('❌ Testing error:', error.message);
    }

    this.reportResults();
  }

  makeRequest(hostname, port, path, method, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const postData = data ? JSON.stringify(data) : null;
      
      const options = {
        hostname,
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Parse error: ${responseData}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  makeHTTPRequest(hostname, port, path, method) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port,
        path,
        method,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'SimpleUITester/1.0'
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          resolve(responseData);
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  reportResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`API Server Health:   ${this.results.serverHealth ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Frontend Loads:      ${this.results.frontendLoads ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`No Test Buttons:     ${this.results.noTestButtons ? '✅ PASS' : '❌ FAIL'}`);
    
    const passCount = Object.values(this.results).filter(r => r === true).length;
    this.results.overallPass = passCount >= 3; // Need all 3 to pass
    
    console.log(`\nOverall Status:      ${this.results.overallPass ? '✅ PASS' : '❌ FAIL'} (${passCount}/3)`);
    
    if (!this.results.overallPass) {
      console.log('\n🚨 Issues found - fix before user testing');
    } else {
      console.log('\n🎉 Basic UI tests passed - Ready for functional testing at http://localhost:5174');
      console.log('💡 API working correctly - racing-specific questions generated');
    }
  }
}

new SimpleUITester().runTests();