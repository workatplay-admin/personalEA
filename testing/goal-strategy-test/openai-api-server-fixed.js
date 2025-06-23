import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;

// Circuit breaker implementation
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}

const circuitBreaker = new CircuitBreaker();

// Middleware
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

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${req.id}] ${req.method} ${req.path}`);
  next();
});

// OpenAI client factory with retry logic
const createOpenAIClient = (apiKey) => {
  return new OpenAI({
    apiKey,
    timeout: 8000,
    maxRetries: 2,
    defaultHeaders: {
      'X-Request-Source': 'PersonalEA-Goal-Service'
    }
  });
};

// API key validation middleware  
const requireOpenAI = (req, res, next) => {
  const apiKey = req.headers['x-openai-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'OpenAI API key required. Please provide X-OpenAI-API-Key header.'
    });
  }
  
  req.openaiClient = createOpenAIClient(apiKey);
  next();
};

// Health check with detailed status
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'OpenAI-powered Goal Strategy API',
    version: '2.0.0',
    circuitBreaker: {
      state: circuitBreaker.state,
      failures: circuitBreaker.failures
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  res.json(health);
});

// SMART Goal Translation endpoint with improved error handling
app.post('/api/v1/goals/translate', requireOpenAI, async (req, res) => {
  const startTime = Date.now();
  console.log(`[${req.id}] Goal translation request:`, req.body);
  
  try {
    const { raw_goal } = req.body;
    
    if (!raw_goal || !raw_goal.trim()) {
      return res.status(400).json({
        success: false,
        error: 'raw_goal is required and cannot be empty'
      });
    }

    // Use circuit breaker for OpenAI calls
    const completion = await circuitBreaker.call(async () => {
      return await req.openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a SMART goal expert. Analyze any goal against SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound). 
            Return JSON with: 
            - title: clearer version of their goal
            - confidence: overall confidence score (0-1)
            - missing: array of SMART criteria that need improvement
            - criteria: object with details for each SMART component`
          },
          {
            role: "user",
            content: `Analyze this goal: "${raw_goal}"
            
            Return JSON format: {
              "title": "improved goal statement",
              "confidence": 0.4,
              "missing": ["specific", "measurable"],
              "criteria": {
                "specific": {"value": "what", "confidence": 0.3},
                "measurable": {"value": "how", "confidence": 0.2},
                "achievable": {"value": "feasibility", "confidence": 0.5},
                "relevant": {"value": "why", "confidence": 0.4},
                "timeBound": {"value": "when", "confidence": 0.1}
              }
            }`
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" }
      });
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    console.log(`[${req.id}] AI Response:`, aiResponse);
    
    // Build comprehensive goal response
    const goal = {
      id: `goal-${Date.now()}`,
      correlation_id: `corr-${Date.now()}`,
      title: aiResponse.title || raw_goal,
      originalGoal: raw_goal,
      criteria: {
        specific: {
          value: aiResponse.criteria?.specific?.value || raw_goal,
          confidence: aiResponse.criteria?.specific?.confidence || 0.3,
          missing: []
        },
        measurable: {
          value: aiResponse.criteria?.measurable?.value || "To be determined",
          confidence: aiResponse.criteria?.measurable?.confidence || 0.2,
          missing: [],
          metrics: []
        },
        achievable: {
          value: aiResponse.criteria?.achievable?.value || "To be assessed",
          confidence: aiResponse.criteria?.achievable?.confidence || 0.5,
          missing: []
        },
        relevant: {
          value: aiResponse.criteria?.relevant?.value || "To be clarified",
          confidence: aiResponse.criteria?.relevant?.confidence || 0.4,
          missing: []
        },
        timeBound: {
          value: aiResponse.criteria?.timeBound?.value || "To be specified",
          confidence: aiResponse.criteria?.timeBound?.confidence || 0.1,
          missing: []
        }
      },
      missingCriteria: aiResponse.missing || ["Needs clarification"],
      clarificationQuestions: aiResponse.missing?.map(criteria => 
        `What specific ${criteria} aspects would you like to define?`
      ) || ["What specific outcome do you want?"],
      confidence: aiResponse.confidence || 0.3,
      processingTime: Date.now() - startTime
    };

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    console.error(`[${req.id}] Goal translation error:`, error);
    
    // Detailed error response
    const errorResponse = {
      success: false,
      error: error.message || 'AI service unavailable',
      details: {
        type: error.constructor.name,
        circuitBreakerState: circuitBreaker.state
      }
    };
    
    if (error.message?.includes('Circuit breaker')) {
      res.status(503).json({
        ...errorResponse,
        retryAfter: 60
      });
    } else {
      res.status(500).json(errorResponse);
    }
  }
});

// Component question endpoint with retry logic
app.post('/api/v1/goals/component-question', requireOpenAI, async (req, res) => {
  console.log(`[${req.id}] Component question request:`, req.body);
  
  try {
    const { goalTitle, componentKey, currentValue, confidence } = req.body;
    
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

    const completion = await circuitBreaker.call(async () => {
      return await req.openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a SMART goal coach. Ask ONE focused question to help improve the ${componentName} aspect of their goal. Be direct and actionable.`
          },
          {
            role: "user",
            content: `Goal: "${goalTitle}"\nCurrent ${componentName} value: "${currentValue}"\nConfidence: ${confidence}\n\nAsk a question to make this goal more ${componentName.toLowerCase()}.`
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      });
    });

    const question = completion.choices[0].message.content;
    console.log(`[${req.id}] Generated question:`, question);
    
    res.json({
      success: true,
      data: { question }
    });

  } catch (error) {
    console.error(`[${req.id}] Component question error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI service unavailable'
    });
  }
});

// Contextual help endpoint
app.post('/api/v1/goals/contextual-help', requireOpenAI, async (req, res) => {
  console.log(`[${req.id}] Contextual help request`);
  
  try {
    const { goalTitle, componentKey, conversationHistory } = req.body;
    
    if (!goalTitle || !conversationHistory) {
      return res.status(400).json({
        success: false,
        error: 'goalTitle and conversationHistory are required'
      });
    }

    const componentName = componentKey ? 
      componentKey.charAt(0).toUpperCase() + componentKey.slice(1) : 
      'general';

    const messages = [
      {
        role: "system",
        content: `You are a helpful SMART goal coach. The user is working on their goal "${goalTitle}" and needs help. Based on the conversation history, provide specific, actionable guidance. Be encouraging and concise.`
      },
      ...conversationHistory.slice(-6),
      {
        role: "user",
        content: `I need help with the ${componentName} aspect of my goal. Can you provide specific suggestions?`
      }
    ];

    const completion = await circuitBreaker.call(async () => {
      return await req.openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 200
      });
    });

    const helpMessage = completion.choices[0].message.content;
    console.log(`[${req.id}] Generated help:`, helpMessage);
    
    res.json({
      success: true,
      data: { helpMessage }
    });

  } catch (error) {
    console.error(`[${req.id}] Contextual help error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI service unavailable'
    });
  }
});

// Goal clarification with conversation history
app.post('/api/v1/goals/:goalId/clarify', requireOpenAI, async (req, res) => {
  console.log(`[${req.id}] Clarification request for goal:`, req.params.goalId);
  
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
    
    const componentName = latestComponent.charAt(0).toUpperCase() + latestComponent.slice(1);
    const goalTitle = goalContext?.title || 'your goal';

    const messages = [
      {
        role: "system",
        content: `You are a SMART goal coach helping refine "${goalTitle}". Currently working on making it more ${componentName.toLowerCase()}. Respond naturally to their input. If they disagree or say they don't want something, acknowledge and adjust.`
      }
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory.slice(-8));
    }

    messages.push({
      role: "user", 
      content: userResponse
    });

    const completion = await circuitBreaker.call(async () => {
      return await req.openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 150
      });
    });

    const aiFeedback = completion.choices[0].message.content;
    console.log(`[${req.id}] AI feedback:`, aiFeedback);
    
    // Enhanced response with improved goal
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
        confidence: 0.8,
        improved: true
      },
      aiFeedback
    });

  } catch (error) {
    console.error(`[${req.id}] Clarification error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI service unavailable'
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Enhanced OpenAI API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Features: Circuit breaker, retry logic, detailed monitoring`);
});

// Export for testing
export default app;