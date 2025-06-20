import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock API endpoints
app.post('/api/v1/goals/translate', (req, res) => {
  console.log('Mock API: Received goal translation request:', req.body);
  
  const { raw_goal } = req.body;
  
  // Simulate processing delay
  setTimeout(() => {
    const mockGoal = {
      id: `goal-${Date.now()}`,
      correlation_id: `corr-${Date.now()}`,
      title: `SMART Goal: ${raw_goal}`,
      criteria: {
        specific: {
          value: `Make "${raw_goal}" more specific and well-defined`,
          confidence: 0.45,
          missing: ["Specific focus area", "Clear scope definition"]
        },
        measurable: {
          value: "Track progress with quantifiable metrics",
          metrics: ["Weekly progress reports", "Key performance indicators"],
          confidence: 0.35,
          missing: ["Specific metrics", "Success criteria"]
        },
        achievable: {
          value: "Ensure the goal is realistic and attainable",
          confidence: 0.85,
          missing: []
        },
        relevant: {
          value: "Align with broader objectives and priorities",
          confidence: 0.55,
          missing: ["Connection to personal priorities"]
        },
        timeBound: {
          value: "Set a clear deadline for completion",
          confidence: 0.25,
          missing: ["Specific deadline", "Milestone timeline"]
        }
      },
      missingCriteria: ["More specific timeline needed"],
      clarificationQuestions: [
        "What is the specific timeline for this goal?",
        "How will you measure success?"
      ],
      confidence: 0.83
    };

    res.json({
      success: true,
      data: mockGoal
    });
  }, 1000); // 1 second delay to simulate real API
});

// Goal clarification endpoint
app.post('/api/v1/goals/:goalId/clarify', (req, res) => {
  console.log('Mock API: Received goal clarification request:', req.params.goalId, req.body);
  
  const { clarifications } = req.body;
  
  // Simulate processing delay
  setTimeout(() => {
    // Create an improved goal based on clarifications
    const improvedGoal = {
      id: req.params.goalId,
      correlation_id: `corr-${Date.now()}`,
      title: "Improved SMART Goal based on clarifications",
      criteria: {
        specific: {
          value: clarifications.specific || "Enhanced specific criteria based on user input",
          confidence: 0.95,
          missing: []
        },
        measurable: {
          value: clarifications.measurable || "Enhanced measurable criteria with clear metrics",
          metrics: ["Progress tracking", "Quantifiable outcomes"],
          confidence: 0.90,
          missing: []
        },
        achievable: {
          value: clarifications.achievable || "Realistic and attainable based on available resources",
          confidence: 0.95,
          missing: []
        },
        relevant: {
          value: clarifications.relevant || "Highly relevant to user's priorities and objectives",
          confidence: 0.90,
          missing: []
        },
        timeBound: {
          value: clarifications.timeBound || "Clear timeline with specific deadlines",
          confidence: 0.95,
          missing: []
        }
      },
      missingCriteria: [],
      clarificationQuestions: [],
      confidence: 0.93,
      targetValue: clarifications.targetValue ? parseInt(clarifications.targetValue) : undefined,
      unit: clarifications.unit || undefined,
      deadline: clarifications.deadline || undefined
    };

    res.json({
      success: true,
      data: improvedGoal,
      message: "Goal successfully clarified and improved"
    });
  }, 1200); // Slightly longer delay to simulate AI processing
});

app.post('/api/v1/milestones/generate', (req, res) => {
  console.log('Mock API: Received milestone generation request:', req.body);
  
  setTimeout(() => {
    const mockMilestones = [
      {
        id: `milestone-1-${Date.now()}`,
        title: "Initial Planning Phase",
        description: "Complete initial research and planning",
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        priority: "high",
        dependencies: []
      },
      {
        id: `milestone-2-${Date.now()}`,
        title: "Implementation Phase",
        description: "Execute the main components of the goal",
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        priority: "high",
        dependencies: [`milestone-1-${Date.now()}`]
      },
      {
        id: `milestone-3-${Date.now()}`,
        title: "Review and Optimization",
        description: "Evaluate progress and optimize approach",
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        priority: "medium",
        dependencies: [`milestone-2-${Date.now()}`]
      }
    ];

    res.json({
      success: true,
      data: mockMilestones
    });
  }, 800);
});

app.post('/api/v1/wbs/generate', (req, res) => {
  console.log('Mock API: Received WBS generation request:', req.body);
  
  setTimeout(() => {
    const mockTasks = [
      {
        id: `task-1-${Date.now()}`,
        title: "Research and Analysis",
        description: "Conduct thorough research on the topic",
        estimatedHours: 8,
        priority: "high",
        dependencies: [],
        milestoneId: req.body.milestoneId
      },
      {
        id: `task-2-${Date.now()}`,
        title: "Create Action Plan",
        description: "Develop detailed action plan based on research",
        estimatedHours: 4,
        priority: "high",
        dependencies: [`task-1-${Date.now()}`],
        milestoneId: req.body.milestoneId
      },
      {
        id: `task-3-${Date.now()}`,
        title: "Execute Implementation",
        description: "Carry out the planned actions",
        estimatedHours: 16,
        priority: "high",
        dependencies: [`task-2-${Date.now()}`],
        milestoneId: req.body.milestoneId
      }
    ];

    res.json({
      success: true,
      data: mockTasks
    });
  }, 600);
});

app.post('/api/v1/estimations/estimate', (req, res) => {
  console.log('Mock API: Received task estimation request:', req.body);
  
  setTimeout(() => {
    const mockEstimation = {
      taskId: req.body.taskId,
      estimatedHours: Math.floor(Math.random() * 20) + 4,
      confidence: Math.random() * 0.3 + 0.7,
      factors: [
        "Task complexity",
        "Available resources",
        "Dependencies"
      ],
      breakdown: {
        planning: 2,
        execution: 12,
        testing: 3,
        documentation: 1
      }
    };

    res.json({
      success: true,
      data: mockEstimation
    });
  }, 400);
});

app.post('/api/v1/estimations/batch', (req, res) => {
  console.log('Mock API: Received batch estimation request:', req.body);
  
  setTimeout(() => {
    const mockEstimations = req.body.taskIds.map(taskId => ({
      taskId,
      estimatedHours: Math.floor(Math.random() * 20) + 4,
      confidence: Math.random() * 0.3 + 0.7,
      factors: [
        "Task complexity",
        "Available resources",
        "Dependencies"
      ],
      breakdown: {
        planning: 2,
        execution: 12,
        testing: 3,
        documentation: 1
      }
    }));

    res.json({
      success: true,
      data: mockEstimations
    });
  }, 600);
});

app.post('/api/v1/feedback', (req, res) => {
  console.log('Mock API: Received feedback:', req.body);
  
  res.json({
    success: true,
    message: "Feedback received successfully"
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/v1/goals/translate`);
  console.log(`   POST /api/v1/goals/:goalId/clarify`);
  console.log(`   POST /api/v1/milestones/generate`);
  console.log(`   POST /api/v1/wbs/generate`);
  console.log(`   POST /api/v1/estimations/estimate`);
  console.log(`   POST /api/v1/estimations/batch`);
  console.log(`   POST /api/v1/feedback`);
  console.log(`   GET  /health`);
});