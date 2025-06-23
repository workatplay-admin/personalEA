#!/usr/bin/env node

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 8000,
  maxRetries: 1
});

async function testSimpleCall() {
  console.log('Testing simplified OpenAI call...');
  
  try {
    const start = Date.now();
    
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a SMART goal expert. Analyze goals and return a simple JSON with title, confidence score (0-1), and missing criteria."
          },
          {
            role: "user",
            content: 'Analyze: "I want to be a racecar driver". Return JSON: {"title": "improved goal", "confidence": 0.3, "missing": ["what needs work"]}'
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      )
    ]);

    const elapsed = Date.now() - start;
    console.log(`✅ Success in ${elapsed}ms`);
    console.log('Response:', completion.choices[0].message.content);
    
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
}

testSimpleCall();