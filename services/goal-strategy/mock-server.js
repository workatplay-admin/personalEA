#!/usr/bin/env node
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8085;

// Middleware
// Dynamic CORS configuration to handle both local and Codespaces environments
const getCorsOrigins = () => {
  const origins = [
    'http://localhost:5174',
    'https://localhost:5174', 
    'http://127.0.0.1:5174',
    'https://127.0.0.1:5174'
  ];
  
  // Add Codespaces origins if we detect we're in that environment
  if (process.env.CODESPACE_NAME) {
    const codespaceName = process.env.CODESPACE_NAME;
    origins.push(`https://${codespaceName}-5174.app.github.dev`);
    console.log(`🌐 Added Codespaces origin: https://${codespaceName}-5174.app.github.dev`);
  }
  
  return origins;
};

app.use(cors({
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Correlation-ID',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-OpenAI-API-Key'
  ],
  exposedHeaders: ['X-Correlation-ID']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'goal-strategy-mock-service',
    version: 'v1',
    timestamp: new Date().toISOString(),
    correlationId: Math.random().toString(36).substring(7)
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'goal-strategy-mock-service',
    version: 'v1',
    timestamp: new Date().toISOString(),
    correlationId: Math.random().toString(36).substring(7)
  });
});

// Mock authentication endpoint
app.get('/api/v1/auth/test-token', (req, res) => {
  console.log('🔐 Test token generation request received');
  
  const token = 'mock-jwt-token-' + Date.now();
  const payload = {
    id: 'test-user-' + Date.now(),
    email: 'test@personalea.dev',
    scopes: ['goals:read', 'goals:write', 'milestones:read', 'milestones:write', 'tasks:read', 'tasks:write']
  };
  
  res.json({
    success: true,
    data: {
      token: token,
      user: payload,
      expiresIn: '24h'
    },
    correlationId: Math.random().toString(36).substring(7)
  });
});

// Mock environment configuration endpoint
app.get('/api/v1/config/environment', (req, res) => {
  console.log('🔧 Environment configuration check received');
  
  const hasEnvKey = !!process.env.OPENAI_API_KEY;
  
  res.json({
    success: true,
    data: {
      environmentConfigured: hasEnvKey,
      message: hasEnvKey ? 'OpenAI API key configured in environment' : 'No environment API key configured'
    }
  });
});

// Add OpenAI API key validation middleware
const requireOpenAI = (req, res, next) => {
  const headerApiKey = req.headers['x-openai-api-key'];
  const envApiKey = process.env.OPENAI_API_KEY;
  const apiKey = headerApiKey || envApiKey;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'OpenAI API key required. Please provide X-OpenAI-API-Key header or set OPENAI_API_KEY environment variable.'
    });
  }
  
  req.openaiApiKey = apiKey.trim();
  console.log(`🔑 Using OpenAI API key from ${headerApiKey ? 'header' : 'environment'}: ${req.openaiApiKey.substring(0, 10)}...`);
  next();
};

// Mock goal translation endpoint
app.post('/api/v1/goals/translate', requireOpenAI, (req, res) => {
  console.log('🎯 Goal translation request received');
  const { raw_goal } = req.body;
  
  if (!raw_goal) {
    return res.status(400).json({
      success: false,
      error: 'raw_goal is required'
    });
  }

  // Generate a mock SMART goal
  const mockGoal = {
    id: `goal_${Date.now()}`,
    correlation_id: `corr_${Math.random().toString(36).substring(7)}`,
    title: `SMART: ${raw_goal}`,
    description: `A SMART version of: ${raw_goal}`,
    originalGoal: raw_goal,
    confidence: 0.75,
    criteria: {
      specific: {
        value: `Clearly defined version of: ${raw_goal}`,
        confidence: 0.8,
        feedback: "Goal has been made more specific"
      },
      measurable: {
        value: "Progress will be measured through defined metrics",
        confidence: 0.7,
        feedback: "Added measurable components"
      },
      achievable: {
        value: "Goal is realistic and attainable with proper planning",
        confidence: 0.8,
        feedback: "Assessed achievability"
      },
      relevant: {
        value: "Goal aligns with personal/professional objectives",
        confidence: 0.7,
        feedback: "Confirmed relevance"
      },
      timeBound: {
        value: "Target completion within 3-6 months",
        confidence: 0.6,
        feedback: "Added time constraint"
      }
    },
    clarificationQuestions: [
      "What specific metrics will you use to measure progress?",
      "What is your target completion date?"
    ],
    missingCriteria: [],
    targetValue: "100%",
    unit: "completion",
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  setTimeout(() => {
    res.json({
      success: true,
      data: mockGoal,
      message: 'Goal successfully translated to SMART format'
    });
  }, 1000); // Add a small delay to simulate processing
});

// Mock clarify goal endpoint
app.post('/api/v1/goals/:goalId/clarify', (req, res) => {
  console.log('🔍 Goal clarification request received');
  const { goalId } = req.params;
  const { clarifications, goalContext } = req.body;
  
  // Return an updated goal with improved confidence
  const updatedGoal = {
    ...goalContext,
    id: goalId,
    confidence: Math.min(0.95, (goalContext?.confidence || 0.75) + 0.15),
    criteria: {
      ...goalContext?.criteria,
      specific: {
        ...goalContext?.criteria?.specific,
        confidence: Math.min(0.95, (goalContext?.criteria?.specific?.confidence || 0.8) + 0.1)
      },
      measurable: {
        ...goalContext?.criteria?.measurable,
        confidence: Math.min(0.95, (goalContext?.criteria?.measurable?.confidence || 0.7) + 0.15)
      }
    },
    updatedAt: new Date().toISOString()
  };

  setTimeout(() => {
    res.json({
      success: true,
      data: updatedGoal,
      message: 'Goal clarified successfully'
    });
  }, 800);
});

// Mock contextual help endpoint
app.post('/api/v1/goals/contextual-help', (req, res) => {
  console.log('💡 Contextual help request received');
  const { goalTitle, componentKey, conversationHistory } = req.body;
  
  const helpMessage = `I can help you improve the ${componentKey} aspect of your goal "${goalTitle}". Based on our conversation so far, here are some suggestions to make it more specific and actionable.`;
  
  setTimeout(() => {
    res.json({
      success: true,
      data: { helpMessage },
      message: 'Contextual help generated'
    });
  }, 500);
});

// Mock component question endpoint
app.post('/api/v1/goals/component-question', (req, res) => {
  console.log('❓ Component question request received');
  const { goalTitle, componentKey, currentValue } = req.body;
  
  const questions = {
    specific: "Can you provide more specific details about what exactly you want to achieve?",
    measurable: "How will you measure progress toward this goal?",
    achievable: "What resources do you have available to achieve this goal?",
    relevant: "Why is this goal important to you right now?",
    timeBound: "What is your target completion date for this goal?"
  };
  
  const question = questions[componentKey] || "Can you provide more details about this aspect of your goal?";
  
  setTimeout(() => {
    res.json({
      success: true,
      data: { question },
      message: 'Component question generated'
    });
  }, 300);
});

// Mock milestones endpoint
app.post('/api/v1/milestones/generate', (req, res) => {
  console.log('🎯 Milestone generation request received');
  const { goalId } = req.body;
  
  const mockMilestones = [
    {
      id: `milestone_1_${Date.now()}`,
      goalId: goalId,
      title: "Initial Planning and Setup",
      description: "Establish foundation and initial steps",
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      successCriteria: [
        "Research completed",
        "Plan documented",
        "Resources identified"
      ]
    },
    {
      id: `milestone_2_${Date.now()}`,
      goalId: goalId,
      title: "Progress Checkpoint",
      description: "Midpoint evaluation and adjustments",
      targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      successCriteria: [
        "50% completion achieved",
        "Progress metrics met",
        "Course corrections made"
      ]
    },
    {
      id: `milestone_3_${Date.now()}`,
      goalId: goalId,
      title: "Final Achievement",
      description: "Goal completion and evaluation",
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      successCriteria: [
        "All requirements met",
        "Quality standards achieved",
        "Success validated"
      ]
    }
  ];
  
  setTimeout(() => {
    res.json({
      success: true,
      data: mockMilestones,
      message: 'Milestones generated successfully'
    });
  }, 1200);
});

// Mock WBS generation endpoint
app.post('/api/v1/wbs/generate', (req, res) => {
  console.log('📋 WBS generation request received');
  const { milestoneId } = req.body;
  
  const mockTasks = [
    {
      id: `task_1_${Date.now()}`,
      milestoneId: milestoneId,
      title: "Research and Analysis",
      description: "Conduct thorough research on the topic",
      estimatedHours: 8,
      priority: "HIGH"
    },
    {
      id: `task_2_${Date.now()}`,
      milestoneId: milestoneId,
      title: "Planning and Documentation",
      description: "Create detailed plan and documentation",
      estimatedHours: 12,
      priority: "MEDIUM"
    },
    {
      id: `task_3_${Date.now()}`,
      milestoneId: milestoneId,
      title: "Implementation",
      description: "Execute the planned activities",
      estimatedHours: 20,
      priority: "HIGH"
    }
  ];
  
  setTimeout(() => {
    res.json({
      success: true,
      data: mockTasks,
      message: 'WBS tasks generated successfully'
    });
  }, 1000);
});

// Mock estimation endpoint
app.post('/api/v1/estimations/batch', (req, res) => {
  console.log('⏱️ Batch estimation request received');
  const { taskIds } = req.body;
  
  const mockEstimations = taskIds.map((taskId, index) => ({
    id: `estimation_${Date.now()}_${index}`,
    taskId: taskId,
    estimatedHours: 8 + (index * 4),
    optimisticHours: 6 + (index * 3),
    pessimisticHours: 12 + (index * 6),
    mostLikelyHours: 8 + (index * 4),
    confidenceScore: 0.8,
    estimationMethod: "THREE_POINT_PERT"
  }));
  
  setTimeout(() => {
    res.json({
      success: true,
      data: mockEstimations,
      message: 'Task estimations completed'
    });
  }, 800);
});

// Mock feedback endpoint
app.post('/api/v1/feedback', (req, res) => {
  console.log('📝 Feedback submission received');
  console.log('Feedback data:', req.body);
  
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  }, 500);
});

// 404 handler
app.use((req, res) => {
  console.log(`🚫 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    method: req.method,
    path: req.path
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('🔥 Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock Goal Strategy Service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api/v1`);
  console.log('🎯 Ready to handle frontend requests!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});