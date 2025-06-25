const https = require('https');

// Test function to check API endpoint
async function testApiEndpoint() {
  console.log('Testing Goal Strategy API endpoints...\n');

  // 1. Test health endpoint
  console.log('1. Testing Health Endpoint:');
  await testEndpoint('/health', 'GET');

  // 2. Test environment config
  console.log('\n2. Testing Environment Config:');
  await testEndpoint('/api/v1/config/environment', 'GET');

  // 3. Get test token
  console.log('\n3. Getting Test Token:');
  const token = await getTestToken();
  
  if (token) {
    // 4. Test translate endpoint
    console.log('\n4. Testing Translate Endpoint:');
    await testTranslateEndpoint(token);
  }
}

function testEndpoint(path, method) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'psychic-space-robot-vpw7gr9q6j39qv-8085.app.github.dev',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
        resolve(res.statusCode === 200);
      });
    });

    req.on('error', (e) => {
      console.error(`Error: ${e.message}`);
      resolve(false);
    });

    req.end();
  });
}

function getTestToken() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'psychic-space-robot-vpw7gr9q6j39qv-8085.app.github.dev',
      port: 443,
      path: '/api/v1/auth/test-token',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log(`Status: ${res.statusCode}`);
            console.log(`Token obtained: ${parsed.data.token.substring(0, 50)}...`);
            resolve(parsed.data.token);
          } catch (e) {
            console.error('Failed to parse token response');
            resolve(null);
          }
        } else {
          console.log(`Status: ${res.statusCode}`);
          console.log(`Response: ${data}`);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Error: ${e.message}`);
      resolve(null);
    });

    req.end();
  });
}

function testTranslateEndpoint(token) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      raw_goal: "I want to lose weight"
    });

    const options = {
      hostname: 'psychic-space-robot-vpw7gr9q6j39qv-8085.app.github.dev',
      port: 443,
      path: '/api/v1/goals/translate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log('Success! Goal transformed:');
            console.log(`Title: ${parsed.data.title}`);
            console.log(`Confidence: ${parsed.data.confidence}`);
          } catch (e) {
            console.log(`Response: ${data.substring(0, 500)}${data.length > 500 ? '...' : ''}`);
          }
        } else {
          console.log(`Response: ${data}`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`Error: ${e.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

// Run the test
testApiEndpoint().then(() => {
  console.log('\nTest completed!');
});