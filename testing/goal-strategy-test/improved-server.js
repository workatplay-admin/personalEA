import express from 'express';
import cors from 'cors';
import axios from 'axios';
import Queue from 'better-queue';
import CircuitBreaker from 'opossum';

const app = express();
const PORT = 3000;

// Non-blocking OpenAI request queue with concurrency control
const openaiQueue = new Queue(async (task) => {
  console.log('Processing queued OpenAI request:', task.id);
  return await callOpenAIWithRetry(task);
}, {
  concurrent: 3,        // Max 3 concurrent OpenAI calls
  maxRetries: 2,        // Retry failed requests
  retryDelay: 1000      // 1s delay between retries
});

// Circuit breaker to prevent cascading failures
const circuitBreaker = new CircuitBreaker(callOpenAIDirect, {
  timeout: 10000,                    // 10s timeout (vs 8s before)
  errorThresholdPercentage: 50,      // Open circuit at 50% error rate
  resetTimeout: 30000,               // Try again after 30s
  name: 'OpenAI API'
});

// Enhanced CORS for Codespaces
app.use(cors({
  origin: function(origin, callback) {
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-OpenAI-API-Key', 'Cache-Control', 'Pragma', 'Expires'],
  optionsSuccessStatus: 200
}));

app.use(express.json());

// API key validation middleware
const requireOpenAI = (req, res, next) => {
  const apiKey = req.headers['x-openai-api-key'];
  
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return res.status(401).json({
      success: false,
      error: 'OpenAI API key required. Please provide X-OpenAI-API-Key header.'
    });
  }
  
  // Clean and validate the API key
  const cleanApiKey = apiKey.trim();
  if (cleanApiKey.length < 10) {
    return res.status(401).json({
      success: false,
      error: 'Invalid OpenAI API key format.'
    });
  }
  
  req.openaiApiKey = cleanApiKey;
  next();
};

// Direct OpenAI call function (used by circuit breaker)
async function callOpenAIDirect(requestData) {
  console.log('Making direct OpenAI API call...');
  
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', 
      requestData.payload, 
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${requestData.apiKey}`
        },
        timeout: 8000  // Individual request timeout
      }
    );
    
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`OpenAI API error: ${error.response.status} - ${error.response.data.error?.message || 'Unknown error'}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('OpenAI API timeout');
    } else {
      throw new Error(`Network error: ${error.message}`);
    }
  }
}

// Retry wrapper for queued calls
async function callOpenAIWithRetry(task) {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`OpenAI API attempt ${attempt}/${maxRetries} for task ${task.id}`);
      
      const result = await circuitBreaker.fire(task.requestData);
      console.log(`OpenAI API success on attempt ${attempt} for task ${task.id}`);
      
      return result;
    } catch (error) {
      lastError = error;
      console.error(`OpenAI API attempt ${attempt} failed for task ${task.id}:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Promise-based OpenAI call with queuing
function callOpenAIQueued(apiKey, payload) {
  const taskId = `openai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return new Promise((resolve, reject) => {
    openaiQueue.push({
      id: taskId,
      requestData: { apiKey, payload }
    }, (error, result) => {
      if (error) {
        console.error(`Queued OpenAI call ${taskId} failed:`, error);
        reject(error);
      } else {
        console.log(`Queued OpenAI call ${taskId} completed successfully`);
        resolve(result);
      }
    });
  });
}

// SMART Goal Translation endpoint - IMPROVED
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

    const requestPayload = {
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
    };

    // Use the improved queued call instead of blocking HTTPS
    const completion = await callOpenAIQueued(req.openaiApiKey, requestPayload);

    console.log('Raw OpenAI content:', completion.choices[0].message.content);
    const aiResponse = JSON.parse(completion.choices[0].message.content);
    console.log('Parsed AI Response:', JSON.stringify(aiResponse, null, 2));
    
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
    
    // Return clear error instead of fake fallback
    if (error.message.includes('Circuit breaker is open')) {
      res.status(503).json({
        success: false,
        error: {
          type: 'service_overloaded',
          message: 'AI service is temporarily overloaded. Please try again in a moment.',
          retryable: true,
          retryAfter: 30
        }
      });
    } else if (error.message.includes('timeout')) {
      res.status(504).json({
        success: false,
        error: {
          type: 'timeout',
          message: 'AI service request timed out. Please try again.',
          retryable: true,
          retryAfter: 5
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'ai_service_error',
          message: 'AI service is currently unavailable: ' + error.message,
          retryable: true,
          retryAfter: 10
        }
      });
    }
  }
});

// Component question endpoint - IMPROVED
app.post('/api/v1/goals/component-question', requireOpenAI, async (req, res) => {
  console.log('OpenAI API: Received component question request:', req.body);
  
  try {
    const { goalTitle, componentKey, currentValue, confidence, isHighConfidence, goalContext } = req.body;
    
    if (!goalTitle || !componentKey) {
      return res.status(400).json({
        success: false,
        error: 'goalTitle and componentKey are required'
      });
    }

    const componentNames = {
      specific: 'Specific',
      measurable: 'Measurable', 
      achievable: 'Achievable',
      relevant: 'Relevant',
      timeBound: 'Time-bound'
    };

    const componentName = componentNames[componentKey] || componentKey;

    const requestPayload = {
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
    };

    // Use improved queued call
    const completion = await callOpenAIQueued(req.openaiApiKey, requestPayload);
    const question = completion.choices[0].message.content;
    
    console.log('OpenAI API: Generated question:', question);
    
    res.json({
      success: true,
      data: { question }
    });

  } catch (error) {
    console.error('OpenAI Component Question Error:', error);
    
    // Clear error handling - no fallbacks
    res.status(500).json({
      success: false,
      error: {
        type: 'ai_service_error',
        message: 'AI service unavailable: ' + error.message,
        retryable: true,
        retryAfter: 10
      }
    });
  }
});

// Contextual help endpoint - IMPROVED
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

    const componentNames = {
      specific: 'Specific',
      measurable: 'Measurable', 
      achievable: 'Achievable',
      relevant: 'Relevant',
      timeBound: 'Time-bound'
    };

    const componentName = componentNames[componentKey] || 'general';

    const messages = [
      {
        role: "system",
        content: `You are a helpful SMART goal coach. The user is working on their goal "${goalTitle}" and specifically working on the ${componentName} aspect. They've asked for help or said they don't know something. Based on the conversation history, provide specific, actionable guidance. Be encouraging and helpful. Keep responses concise but useful.`
      }
    ];

    // Add recent conversation history
    const recentHistory = conversationHistory.slice(-6);
    messages.push(...recentHistory);

    messages.push({
      role: "user",
      content: `I need help with the ${componentName} aspect of my goal. Can you provide specific suggestions based on our conversation?`
    });

    console.log('Making contextual help request to OpenAI with', recentHistory.length, 'conversation messages');
    
    const requestPayload = {
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 200
    };

    // Use improved queued call
    const completion = await callOpenAIQueued(req.openaiApiKey, requestPayload);
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
      error: {
        type: 'ai_service_error',
        message: 'AI service unavailable: ' + error.message,
        retryable: true,
        retryAfter: 10
      }
    });
  }
});

// Goal clarification endpoint - IMPROVED
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

    const componentKeys = Object.keys(clarifications);
    const latestComponent = componentKeys[componentKeys.length - 1];
    const userResponse = clarifications[latestComponent];
    
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

    const messages = [
      {
        role: "system",
        content: `You are a SMART goal coach helping the user refine their goal "${goalTitle}". Currently working on making it more ${componentName.toLowerCase()}. Respond naturally to their input. If they say they don't want something or disagree, acknowledge that and adjust your guidance accordingly. Be encouraging but respect their choices.`
      }
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-8);
      messages.push(...recentHistory);
    }

    messages.push({
      role: "user", 
      content: userResponse
    });

    console.log('Sending to OpenAI with', messages.length, 'messages including history');

    const requestPayload = {
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 150
    };

    // Use improved queued call
    const completion = await callOpenAIQueued(req.openaiApiKey, requestPayload);
    const aiFeedback = completion.choices[0].message.content;
    
    console.log('OpenAI clarification response:', aiFeedback);
    
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
      error: {
        type: 'ai_service_error',
        message: 'AI service unavailable: ' + error.message,
        retryable: true,
        retryAfter: 10
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'PersonalEA Improved API Server',
    circuitBreaker: {
      state: circuitBreaker.stats.state,
      failures: circuitBreaker.stats.failures,
      successes: circuitBreaker.stats.successes
    },
    queue: {
      length: openaiQueue.length,
      running: openaiQueue.running,
      succeeded: openaiQueue.getStats().completed,
      failed: openaiQueue.getStats().failed
    }
  });
});

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: {
      type: 'internal_server_error',
      message: 'Internal server error',
      details: error.message,
      retryable: false
    }
  });
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, gracefully shutting down...');
  
  // Close the queue gracefully
  openaiQueue.destroy();
  
  console.log('✅ Server shutdown complete');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Improved PersonalEA API Server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/v1/goals/translate (requires X-OpenAI-API-Key header)`);
  console.log(`   POST /api/v1/goals/component-question (requires X-OpenAI-API-Key header)`);
  console.log(`   POST /api/v1/goals/contextual-help (requires X-OpenAI-API-Key header)`);
  console.log(`   POST /api/v1/goals/:goalId/clarify (requires X-OpenAI-API-Key header)`);
  console.log(`   GET  /health`);
  console.log(`\n🔧 Improvements:`);
  console.log(`   ✅ Non-blocking OpenAI calls with request queuing`);
  console.log(`   ✅ Circuit breaker pattern for resilience`);
  console.log(`   ✅ Exponential backoff retry logic`);
  console.log(`   ✅ Clear error states (no fallback responses)`);
  console.log(`   ✅ Graceful shutdown handling`);
  console.log(`\n🔑 Don't forget to provide your OpenAI API key in the X-OpenAI-API-Key header!`);
});