#!/usr/bin/env node

const https = require('https');

const data = JSON.stringify({
  model: "gpt-3.5-turbo",
  messages: [
    { role: "system", content: "You are helpful." },
    { role: "user", content: "Say 'test successful'" }
  ],
  max_tokens: 10
});

const options = {
  hostname: 'api.openai.com',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Testing basic HTTPS to OpenAI...');
const start = Date.now();

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    const elapsed = Date.now() - start;
    console.log(`✅ Response in ${elapsed}ms:`, JSON.parse(responseData).choices[0].message.content);
  });
});

req.on('error', (error) => {
  console.log('❌ HTTPS Error:', error.message);
});

req.write(data);
req.end();