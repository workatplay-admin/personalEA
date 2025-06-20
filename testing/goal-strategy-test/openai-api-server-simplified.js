import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// OpenAI client - will be initialized when API key is provided
let openai = null;

// Middleware to check for OpenAI API key
const requireOpenAI = (req, res, next) => {
  const apiKey = req.headers['x-openai-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'OpenAI API key required. Please provide X-OpenAI-API-Key header.'
    });
  }
  
  // Initialize OpenAI client with the provided key
  if (!openai || openai.apiKey !== apiKey) {
    openai = new OpenAI({
      apiKey: apiKey
    });
  }
  
  next();
};

// Helper function to analyze SMART criteria confidence (fallback only)
const analyzeSMARTCriteria = (goal) => {
  const criteria = {
    specific: {
      value: goal,
      confidence: 0.3,
      missing: []
    },
    measurable: {
      value: "No clear metrics defined",
      confidence: 0.2,
      missing: []
    },
    achievable: {
      value: "Achievability needs assessment",
      confidence: 0.5,
      missing: []
    },
    relevant: {
      value: "Relevance needs clarification",
      confidence: 0.4,
      missing: []
    },
    timeBound: {
      value: "No timeline specified",
      confidence: 0.1,
      missing: []
    }
  };

  // Simple heuristics to improve initial confidence scores
  const goalLower = goal.toLowerCase();
  
  // Check for specific indicators
  if (goalLower.includes('specific') || goalLower.includes('particular') || goalLower.includes('exactly')) {
    criteria.specific.confidence = Math.min(0.7, criteria.specific.confidence + 0.3);
  }
  
  // Check for measurable indicators
  if (goalLower.match(/\d+/) || goalLower.includes('measure') || goalLower.includes('track')) {
    criteria.measurable.confidence = Math.min(0.7, criteria.measurable.confidence + 0.4);
    criteria.measurable.value = "Some measurable elements detected";
  }
  
  // Check for time indicators
  if (goalLower.match(/(week|month|year|day|by|until|deadline)/)) {
    criteria.timeBound.confidence = Math.min(0.7, criteria.timeBound.confidence + 0.5);
    criteria.timeBound.value = "Some time elements detected";
  }
  
  return criteria;
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

    // Use OpenAI to analyze and improve the goal
    let completion;
    try {
      completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are a SMART goal expert. Analyze the user's goal and provide a structured response that identifies what's missing from each SMART criteria. Be constructive and specific about what needs improvement.

Return a JSON response with this exact structure:
{
  "title": "Improved version of the goal",
  "analysis": {
    "specific": {
      "current": "What's currently specific about the goal",
      "missing": ["What specific elements are missing"],
      "confidence": 0.0-1.0
    },
    "measurable": {
      "current": "What's currently measurable",
      "missing": ["What measurable elements are missing"],
      "confidence": 0.0-1.0
    },
    "achievable": {
      "current": "What makes it achievable",
      "missing": ["What achievability factors need clarification"],
      "confidence": 0.0-1.0
    },
    "relevant": {
      "current": "Why it seems relevant",
      "missing": ["What relevance aspects need clarification"],
      "confidence": 0.0-1.0
    },
    "timeBound": {
      "current": "Any time elements present",
      "missing": ["What time-bound elements are missing"],
      "confidence": 0.0-1.0
    }
  },
  "overallConfidence": 0.0-1.0,
  "suggestions": ["Key suggestions for improvement"]
}`
            },
            {
              role: "user",
              content: `Please analyze this goal: "${raw_goal}"`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OpenAI API timeout')), 10000)
        )
      ]);
    } catch (timeoutError) {
      console.log('OpenAI API call timed out in translation:', timeoutError.message);
      throw timeoutError; // Let the outer catch handle it
    }

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    
    // Transform AI response to our Goal format
    const goal = {
      id: `goal-${Date.now()}`,
      correlation_id: `corr-${Date.now()}`,
      title: aiResponse.title,
      criteria: {
        specific: {
          value: aiResponse.analysis.specific.current,
          confidence: aiResponse.analysis.specific.confidence,
          missing: aiResponse.analysis.specific.missing
        },
        measurable: {
          value: aiResponse.analysis.measurable.current,
          confidence: aiResponse.analysis.measurable.confidence,
          missing: aiResponse.analysis.measurable.missing,
          metrics: []
        },
        achievable: {
          value: aiResponse.analysis.achievable.current,
          confidence: aiResponse.analysis.achievable.confidence,
          missing: aiResponse.analysis.achievable.missing
        },
        relevant: {
          value: aiResponse.analysis.relevant.current,
          confidence: aiResponse.analysis.relevant.confidence,
          missing: aiResponse.analysis.relevant.missing
        },
        timeBound: {
          value: aiResponse.analysis.timeBound.current,
          confidence: aiResponse.analysis.timeBound.confidence,
          missing: aiResponse.analysis.timeBound.missing
        }
      },
      missingCriteria: aiResponse.suggestions,
      clarificationQuestions: aiResponse.suggestions,
      confidence: aiResponse.overallConfidence
    };

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Fallback to basic analysis if OpenAI fails
    const fallbackGoal = {
      id: `goal-${Date.now()}`,
      correlation_id: `corr-${Date.now()}`,
      title: `SMART Goal: ${req.body.raw_goal}`,
      criteria: analyzeSMARTCriteria(req.body.raw_goal),
      missingCriteria: ["Goal needs clarification in multiple areas"],
      clarificationQuestions: [
        "What specific outcome do you want to achieve?",
        "How will you measure success?",
        "What's your timeline for this goal?"
      ],
      confidence: 0.3
    };

    res.json({
      success: true,
      data: fallbackGoal,
      warning: "Used fallback analysis due to AI service error"
    });
  }
});

// Simplified Goal clarification endpoint - Let OpenAI do ALL the heavy lifting
app.post('/api/v1/goals/:goalId/clarify', requireOpenAI, async (req, res) => {
  console.log('OpenAI API: Received goal clarification request:', req.params.goalId, req.body);
  
  // Simple response tracking to ensure we always respond
  let responseAlreadySent = false;
  const sendResponse = (responseData) => {
    if (!responseAlreadySent) {
      responseAlreadySent = true;
      res.json(responseData);
    } else {
      console.log('Warning: Attempted to send response twice, ignoring');
    }
  };
  
  // Set a global timeout for the entire request
  const globalTimeout = setTimeout(() => {
    if (!responseAlreadySent) {
      console.log('Global request timeout reached, sending fallback response');
      sendResponse({
        success: true,
        data: {
          needsFollowUp: true,
          feedback: "The request timed out. Please try again with a shorter response, or type 'next' to move to the next component.",
          suggestions: [
            "Try a shorter, more direct response",
            "Type 'next' to move to the next component",
            "Type 'help' for suggestions"
          ]
        },
        message: "Request timed out, please try again"
      });
    }
  }, 20000); // 20 second global timeout
  
  try {
    const { clarifications, goalContext } = req.body;
    
    if (!clarifications || Object.keys(clarifications).length === 0) {
      clearTimeout(globalTimeout);
      return sendResponse({
        success: false,
        error: 'clarifications object is required'
      });
    }

    // Get the current component being clarified
    const currentComponent = Object.keys(clarifications)[Object.keys(clarifications).length - 1];
    const userInput = clarifications[currentComponent];
    
    // Extract goal context
    const originalGoal = goalContext?.title || goalContext?.originalGoal || "programming goal";
    const goalDescription = goalContext?.description || "";

    // ONLY basic validation - no complex pre-processing
    if (!userInput || userInput.trim().length === 0) {
      clearTimeout(globalTimeout);
      return sendResponse({
        success: true,
        data: {
          needsFollowUp: true,
          feedback: `Please provide your input for the ${currentComponent} component.`,
          suggestions: [
            `What would you like to specify for the ${currentComponent} aspect?`,
            "Type 'help' if you need guidance",
            "Type 'skip' to move to the next component"
          ]
        },
        message: "Please provide your input"
      });
    }

    // Send EVERYTHING to OpenAI with full context - let it handle ALL the intelligence
    let completion;
    try {
      completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are a SMART goal expert helping users refine their goals. The user is working on the "${currentComponent}" component of their goal.

GOAL CONTEXT: "${originalGoal}"
GOAL DESCRIPTION: "${goalDescription}"
CURRENT COMPONENT: ${currentComponent}
USER INPUT: "${userInput}"

Your job is to:
1. Analyze if their input is adequate for this SMART component
2. If it shows uncertainty (words like "maybe", "not sure"), acknowledge it and help them build confidence
3. If it's inadequate (like "lines of code" for senior developer career goals), explain why and suggest better alternatives
4. If it's good, incorporate it and provide encouraging feedback
5. Always provide actionable guidance

For each component:
- SPECIFIC: Should be clear, well-defined, and focused
- MEASURABLE: Should have concrete metrics that align with the goal's purpose
- ACHIEVABLE: Should be realistic given constraints and resources
- RELEVANT: Should align with broader objectives and priorities
- TIME-BOUND: Should have clear deadlines and milestones

Return JSON response:
{
  "needsFollowUp": true/false,
  "feedback": "Your detailed response to the user",
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"],
  "improvedComponent": {
    "value": "Enhanced component description incorporating their input",
    "confidence": 0.0-1.0,
    "missing": ["any remaining gaps or improvements needed"]
  },
  "reasoning": "Brief explanation of your assessment"
}`
            },
            {
              role: "user",
              content: `Please help me with the ${currentComponent} component of my goal. My input: "${userInput}"`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OpenAI timeout')), 10000)
        )
      ]);
    } catch (timeoutError) {
      console.log('OpenAI API call timed out:', timeoutError.message);
      clearTimeout(globalTimeout);
      return sendResponse({
        success: true,
        data: {
          needsFollowUp: true,
          feedback: "The AI service is taking too long to respond. Please try again with a shorter response, or type 'next' to move to the next component.",
          suggestions: [
            "Try a shorter, more direct response",
            "Type 'next' to move to the next component",
            "Type 'help' for suggestions"
          ]
        },
        message: "AI service timeout, please try again"
      });
    }

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    
    // Extract and structure the response based on OpenAI's analysis
    if (aiResponse.needsFollowUp) {
      // OpenAI determined more clarification is needed
      clearTimeout(globalTimeout);
      sendResponse({
        success: true,
        data: {
          needsFollowUp: true,
          feedback: aiResponse.feedback,
          suggestions: aiResponse.suggestions,
          reasoning: aiResponse.reasoning
        },
        message: aiResponse.feedback
      });
    } else {
      // OpenAI approved the input, create improved goal
      const improvedGoal = {
        id: req.params.goalId,
        correlation_id: `corr-${Date.now()}`,
        title: "Improved SMART Goal based on clarifications",
        criteria: {
          specific: {
            value: currentComponent === 'specific' ? aiResponse.improvedComponent.value : "Enhanced specific criteria",
            confidence: currentComponent === 'specific' ? aiResponse.improvedComponent.confidence : 0.85,
            missing: currentComponent === 'specific' ? aiResponse.improvedComponent.missing : []
          },
          measurable: {
            value: currentComponent === 'measurable' ? aiResponse.improvedComponent.value : "Enhanced measurable criteria",
            confidence: currentComponent === 'measurable' ? aiResponse.improvedComponent.confidence : 0.85,
            missing: currentComponent === 'measurable' ? aiResponse.improvedComponent.missing : [],
            metrics: ["Progress tracking", "Success indicators"]
          },
          achievable: {
            value: currentComponent === 'achievable' ? aiResponse.improvedComponent.value : "Realistic and attainable",
            confidence: currentComponent === 'achievable' ? aiResponse.improvedComponent.confidence : 0.85,
            missing: currentComponent === 'achievable' ? aiResponse.improvedComponent.missing : []
          },
          relevant: {
            value: currentComponent === 'relevant' ? aiResponse.improvedComponent.value : "Aligned with priorities",
            confidence: currentComponent === 'relevant' ? aiResponse.improvedComponent.confidence : 0.85,
            missing: currentComponent === 'relevant' ? aiResponse.improvedComponent.missing : []
          },
          timeBound: {
            value: currentComponent === 'timeBound' ? aiResponse.improvedComponent.value : "Clear timeline established",
            confidence: currentComponent === 'timeBound' ? aiResponse.improvedComponent.confidence : 0.85,
            missing: currentComponent === 'timeBound' ? aiResponse.improvedComponent.missing : []
          }
        },
        missingCriteria: [],
        clarificationQuestions: [],
        confidence: aiResponse.improvedComponent.confidence,
        aiFeedback: aiResponse.feedback,
        aiReasoning: aiResponse.reasoning
      };
      
      clearTimeout(globalTimeout);
      sendResponse({
        success: true,
        data: improvedGoal,
        message: aiResponse.feedback
      });
    }

  } catch (error) {
    console.error('OpenAI Clarification Error:', error);
    
    // Simple fallback response
    const fallbackGoal = {
      id: req.params.goalId,
      correlation_id: `corr-${Date.now()}`,
      title: "Goal updated with user clarifications",
      criteria: {
        specific: { value: "Updated based on user input", confidence: 0.9, missing: [] },
        measurable: { value: "Enhanced with user clarifications", confidence: 0.9, missing: [], metrics: [] },
        achievable: { value: "Confirmed as realistic", confidence: 0.9, missing: [] },
        relevant: { value: "Aligned with user priorities", confidence: 0.9, missing: [] },
        timeBound: { value: "Timeline clarified", confidence: 0.9, missing: [] }
      },
      missingCriteria: [],
      clarificationQuestions: [],
      confidence: 0.9
    };

    clearTimeout(globalTimeout);
    sendResponse({
      success: true,
      data: fallbackGoal,
      message: "Goal updated successfully",
      warning: "Used fallback due to AI service error"
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Simplified OpenAI-powered Goal Strategy API'
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
  console.log(`🤖 Simplified OpenAI-powered API Server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/v1/goals/translate (requires X-OpenAI-API-Key header)`);
  console.log(`   POST /api/v1/goals/:goalId/clarify (requires X-OpenAI-API-Key header)`);
  console.log(`   GET  /health`);
  console.log(`\n🔑 Don't forget to provide your OpenAI API key in the X-OpenAI-API-Key header!`);
  console.log(`\n✨ This version lets OpenAI do ALL the heavy lifting - no more complex pre-processing!`);
});
