#!/usr/bin/env node

const https = require('https');

const testOpenAI = async () => {
  const data = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a SMART goal expert. Analyze any goal against SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound). Return JSON with: title (clearer version of their goal), confidence (0-1), missing (which SMART criteria need work)."
      },
      {
        role: "user",
        content: `Analyze this goal: "I want to be a racecar driver"\n\nReturn JSON format: {"title": "clearer goal statement", "confidence": 0.4, "missing": ["specific criteria that need improvement"]}`
      }
    ],
    temperature: 0.3,
    max_tokens: 150
  });

  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY?.trim()}`,
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          console.log('Full OpenAI Response:');
          console.log(JSON.stringify(parsed, null, 2));
          
          if (parsed.choices && parsed.choices[0]) {
            console.log('\nContent:');
            console.log(parsed.choices[0].message.content);
            
            try {
              const contentJSON = JSON.parse(parsed.choices[0].message.content);
              console.log('\nParsed Content JSON:');
              console.log(JSON.stringify(contentJSON, null, 2));
            } catch (e) {
              console.log('\nContent is not valid JSON:', e.message);
            }
          }
          
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

    req.write(data);
    req.end();
  });
};

testOpenAI().catch(console.error);