#!/usr/bin/env node

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testOpenAI() {
  console.log('Testing OpenAI API call...');
  
  try {
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a SMART goal expert. Return only: {'test': 'success'}"
          },
          {
            role: "user", 
            content: "Test goal: I want to be a racecar driver"
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OpenAI API timeout')), 10000)
      )
    ]);

    console.log('✅ OpenAI API working!');
    console.log('Response:', completion.choices[0].message.content);
  } catch (error) {
    console.log('❌ OpenAI API failed:');
    console.log('Error:', error.message);
  }
}

testOpenAI();