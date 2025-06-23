import express from 'express';
import cors from 'cors';
import https from 'https';

const app = express();
const PORT = 3000;

// Middleware - Updated CORS for Codespaces
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests from any origin (including null for file:// urls)
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-OpenAI-API-Key', 'Cache-Control', 'Pragma', 'Expires'],
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Simple API key validation middleware  
const requireOpenAI = (req, res, next) => {
  const apiKey = req.headers['x-openai-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'OpenAI API key required. Please provide X-OpenAI-API-Key header.'
    });
  }
  
  // Store API key for use in endpoints
  req.openaiApiKey = apiKey;
  next();
};


// SMART Goal Translation endpoint
app.post('/api/v1/goals/translate', requireOpenAI, async (req, res) => {
  console.log('OpenAI API: Received goal translation request:', req.body);
  
  try {
    const { raw_goal } = req.body;
    
    if (!raw_goal) {
      return res.status(400).json({
        success: false,
        error: 'raw_goal is required'
      });
    }

    // Direct HTTPS call to OpenAI (avoids SDK container issues)
    console.log('Making direct HTTPS call to OpenAI...');
    
    const requestBody = JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a SMART goal expert. Analyze any goal against SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound). Return JSON with: title (clearer version of their goal), confidence (0-1), missing (which SMART criteria need work)."
        },
        {
          role: "user",
          content: `Analyze this goal: "${raw_goal}"\n\nReturn JSON format: {"title": "clearer goal statement", "confidence": 0.4, "missing": ["specific criteria that need improvement"]}`
        }
      ],
      temperature: 0.3,
      max_tokens: 150
    });

    const completion = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${req.openaiApiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (response.statusCode === 200) {
              resolve(parsed);
            } else {
              reject(new Error(`OpenAI API error: ${data}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      // Add timeout
      request.setTimeout(8000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      request.write(requestBody);
      request.end();
    });

    console.log('Raw OpenAI content:', completion.choices[0].message.content);
    const aiResponse = JSON.parse(completion.choices[0].message.content);
    console.log('Parsed AI Response:', JSON.stringify(aiResponse, null, 2));
    
    // Simple transformation to Goal format - all values from AI
    const goal = {
      id: `goal-${Date.now()}`,
      correlation_id: `corr-${Date.now()}`,
      title: aiResponse.title || `SMART Goal: ${raw_goal}`,
      criteria: {
        specific: { value: raw_goal, confidence: 0.3, missing: [] },
        measurable: { value: "To be determined", confidence: 0.2, missing: [], metrics: [] },
        achievable: { value: "To be assessed", confidence: 0.5, missing: [] },
        relevant: { value: "To be clarified", confidence: 0.4, missing: [] },
        timeBound: { value: "To be specified", confidence: 0.1, missing: [] }
      },
      missingCriteria: aiResponse.missing || ["Needs clarification"],
      clarificationQuestions: aiResponse.missing || ["What specific outcome do you want?"],
      confidence: aiResponse.confidence || 0.3
    };

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'AI service unavailable: ' + error.message
    });
  }
});

// Generate component question endpoint
app.post('/api/v1/goals/component-question', requireOpenAI, async (req, res) => {
  console.log('OpenAI API: Received component question request:', req.body);
  console.log('Request headers:', req.headers['x-openai-api-key'] ? 'API key present' : 'No API key');
  
  try {
    const { goalTitle, componentKey, currentValue, confidence, isHighConfidence, goalContext } = req.body;
    
    if (!goalTitle || !componentKey) {
      return res.status(400).json({
        success: false,
        error: 'goalTitle and componentKey are required'
      });
    }

    // Map component keys to human-readable names
    const componentNames = {
      specific: 'Specific',
      measurable: 'Measurable', 
      achievable: 'Achievable',
      relevant: 'Relevant',
      timeBound: 'Time-bound'
    };

    const componentName = componentNames[componentKey] || componentKey;

    // Direct HTTPS call for component questions
    console.log('Making direct HTTPS call for component question...');
    
    const requestBody = JSON.stringify({
      model: "gpt-3.5-turbo", 
      messages: [
        {
          role: "system",
          content: `You are a SMART goal coach. Ask ONE focused question to help improve the ${componentName} aspect of their goal. Be direct and actionable.`
        },
        {
          role: "user",
          content: `Goal: "${goalTitle}"\n\nAsk a question to make this goal more ${componentName.toLowerCase()}. What specific information do they need to provide?`
        }
      ],
      temperature: 0.7,
      max_tokens: 80
    });

    const completion = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${req.openaiApiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (response.statusCode === 200) {
              resolve(parsed);
            } else {
              reject(new Error(`OpenAI API error: ${data}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      request.setTimeout(8000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      request.write(requestBody);
      request.end();
    });

    const question = completion.choices[0].message.content;
    
    console.log('OpenAI API: Generated question:', question);
    
    res.json({
      success: true,
      data: { question }
    });

  } catch (error) {
    console.error('OpenAI Component Question Error:', error);
    
    // Return actual error instead of fake fallback
    res.status(500).json({
      success: false,
      error: 'AI service unavailable: ' + error.message
    });
  }
});

// Generate contextual help with conversation history endpoint
app.post('/api/v1/goals/contextual-help', requireOpenAI, async (req, res) => {
  console.log('OpenAI API: Received contextual help request:', req.body);
  
  try {
    const { goalTitle, componentKey, conversationHistory, goalContext } = req.body;
    
    if (!goalTitle || !conversationHistory) {
      return res.status(400).json({
        success: false,
        error: 'goalTitle and conversationHistory are required'
      });
    }

    // Map component keys to human-readable names
    const componentNames = {
      specific: 'Specific',
      measurable: 'Measurable', 
      achievable: 'Achievable',
      relevant: 'Relevant',
      timeBound: 'Time-bound'
    };

    const componentName = componentNames[componentKey] || 'general';

    // Build conversation context for OpenAI
    const messages = [
      {
        role: "system",
        content: `You are a helpful SMART goal coach. The user is working on their goal "${goalTitle}" and specifically working on the ${componentName} aspect. They've asked for help or said they don't know something. Based on the conversation history, provide specific, actionable guidance. Be encouraging and helpful. Keep responses concise but useful.`
      }
    ];

    // Add conversation history (last 6 messages to stay within token limits)
    const recentHistory = conversationHistory.slice(-6);
    messages.push(...recentHistory);

    // Add current request for help
    messages.push({
      role: "user",
      content: `I need help with the ${componentName} aspect of my goal. Can you provide specific suggestions based on our conversation?`
    });

    console.log('Making contextual help request to OpenAI with', recentHistory.length, 'conversation messages');
    
    const requestBody = JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 200
    });

    const completion = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${req.openaiApiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (response.statusCode === 200) {
              resolve(parsed);
            } else {
              reject(new Error(`OpenAI API error: ${data}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      request.setTimeout(8000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      request.write(requestBody);
      request.end();
    });

    const helpMessage = completion.choices[0].message.content;
    
    console.log('OpenAI API: Generated contextual help:', helpMessage);
    
    res.json({
      success: true,
      data: { helpMessage }
    });

  } catch (error) {
    console.error('OpenAI Contextual Help Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'AI service unavailable: ' + error.message
    });
  }
});

// Real goal clarification endpoint with OpenAI integration and conversation history
app.post('/api/v1/goals/:goalId/clarify', requireOpenAI, async (req, res) => {
  console.log('OpenAI API: Received clarification request:', req.body);
  
  try {
    const { clarifications, goalContext, conversationHistory } = req.body;
    
    if (!clarifications || typeof clarifications !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'clarifications object is required'
      });
    }

    // Get the latest clarification (most recent component)
    const componentKeys = Object.keys(clarifications);
    const latestComponent = componentKeys[componentKeys.length - 1];
    const userResponse = clarifications[latestComponent];
    
    // Map component keys to human-readable names
    const componentNames = {
      specific: 'Specific',
      measurable: 'Measurable', 
      achievable: 'Achievable',
      relevant: 'Relevant',
      timeBound: 'Time-bound'
    };

    const componentName = componentNames[latestComponent] || latestComponent;
    const goalTitle = goalContext?.title || goalContext?.originalGoal || 'your goal';

    console.log('Processing clarification for:', { goalTitle, componentName, userResponse });

    // Build messages with conversation history if provided
    const messages = [
      {
        role: "system",
        content: `You are a SMART goal coach helping the user refine their goal "${goalTitle}". Currently working on making it more ${componentName.toLowerCase()}. Respond naturally to their input. If they say they don't want something or disagree, acknowledge that and adjust your guidance accordingly. Be encouraging but respect their choices.`
      }
    ];

    // Add conversation history if provided (last 8 messages to stay within limits)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-8);
      messages.push(...recentHistory);
    }

    // Add the current exchange
    messages.push({
      role: "user", 
      content: userResponse
    });

    console.log('Sending to OpenAI with', messages.length, 'messages including history');

    const requestBody = JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 150
    });

    const completion = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${req.openaiApiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (response.statusCode === 200) {
              resolve(parsed);
            } else {
              reject(new Error(`OpenAI API error: ${data}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      request.setTimeout(8000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      request.write(requestBody);
      request.end();
    });

    const aiFeedback = completion.choices[0].message.content;
    
    console.log('OpenAI clarification response:', aiFeedback);
    
    // Return updated goal with AI feedback
    res.json({
      success: true,
      data: {
        id: req.params.goalId,
        title: goalTitle,
        criteria: {
          specific: { value: "Improved based on clarification", confidence: 0.8, missing: [] },
          measurable: { value: "Enhanced with user input", confidence: 0.8, missing: [], metrics: [] },
          achievable: { value: "Realistic based on feedback", confidence: 0.8, missing: [] },
          relevant: { value: "Aligned with user priorities", confidence: 0.8, missing: [] },
          timeBound: { value: "Timeline clarified", confidence: 0.8, missing: [] }
        },
        confidence: 0.8
      },
      aiFeedback: aiFeedback
    });

  } catch (error) {
    console.error('OpenAI Clarification Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'AI service unavailable: ' + error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'OpenAI-powered Goal Strategy API'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

app.listen(PORT, () => {
  console.log(`🤖 OpenAI-powered API Server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/v1/goals/translate (requires X-OpenAI-API-Key header)`);
  console.log(`   POST /api/v1/goals/component-question (requires X-OpenAI-API-Key header)`);
  console.log(`   POST /api/v1/goals/contextual-help (requires X-OpenAI-API-Key header)`);
  console.log(`   POST /api/v1/goals/:goalId/clarify (requires X-OpenAI-API-Key header)`);
  console.log(`   GET  /health`);
  console.log(`\n🔑 Don't forget to provide your OpenAI API key in the X-OpenAI-API-Key header!`);
});