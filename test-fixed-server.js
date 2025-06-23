#!/usr/bin/env node

const https = require('https');

const testGoalTranslation = async () => {
  const data = JSON.stringify({
    raw_goal: "I want to be a racecar driver"
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/goals/translate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OpenAI-API-Key': process.env.OPENAI_API_KEY,
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          reject(new Error(`Parse error: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
};

console.log('Testing fixed server...');
testGoalTranslation()
  .then(result => {
    console.log('✅ Success!', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
  })
  .catch(error => {
    console.log('❌ Failed:', error.message);
  });