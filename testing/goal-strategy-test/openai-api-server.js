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

// Helper function to analyze SMART criteria confidence
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

// Helper function to generate fallback follow-up responses for vague inputs
const generateFallbackFollowUp = (component, userInput) => {
  const componentGuidance = {
    specific: {
      feedback: "I understand you're not sure exactly what to focus on. Let's break this down together. Think about what specific skill, project, or outcome you want to achieve. For example, instead of 'get better at programming,' consider 'learn React hooks' or 'build a portfolio website.'",
      suggestions: [
        "What specific programming language or technology interests you most?",
        "Is there a particular project or type of application you'd like to build?",
        "What coding skill would make the biggest difference in your work or goals?"
      ]
    },
    measurable: {
      feedback: "It's common to struggle with making goals measurable. Let's think about concrete ways to track your progress. Consider what you could count, measure, or observe to know you're making progress.",
      suggestions: [
        "Could you track hours spent practicing or studying?",
        "Are there specific projects or milestones you could complete?",
        "What would success look like in concrete, observable terms?"
      ]
    },
    achievable: {
      feedback: "I hear your concern about time constraints with work and family. This is a very real consideration, and it's smart to think about this upfront. Let's explore what's realistic for your situation.",
      suggestions: [
        "How much time could you realistically dedicate per week? Even 30 minutes can add up.",
        "Could you integrate learning into existing routines (commute, lunch breaks, etc.)?",
        "What would need to change or be prioritized to make time for this goal?"
      ]
    },
    relevant: {
      feedback: "Let's explore why this goal matters to you. Understanding the 'why' behind your goal will help ensure it's truly relevant and motivating.",
      suggestions: [
        "How would achieving this goal improve your work or career prospects?",
        "What personal satisfaction or growth would this bring you?",
        "How does this connect to your longer-term aspirations?"
      ]
    },
    timeBound: {
      feedback: "Setting a timeline can feel overwhelming, but it's crucial for maintaining momentum. Let's think about a realistic timeframe that creates urgency without being stressful.",
      suggestions: [
        "What feels like a reasonable timeframe - weeks, months, or a year?",
        "Are there any external deadlines or events that could provide natural milestones?",
        "Would breaking this into smaller time-bound phases make it more manageable?"
      ]
    }
  };

  const guidance = componentGuidance[component] || {
    feedback: "I notice you're uncertain about this aspect of your goal. That's completely normal! Let's work through this together.",
    suggestions: [
      "What specific questions or concerns do you have about this component?",
      "What additional information might help you feel more confident?",
      "Would it help to break this down into smaller, more manageable pieces?"
    ]
  };

  return guidance;
};

// Helper function for basic metric evaluation when AI is unavailable
const evaluateMetricBasic = (component, userInput, originalGoal) => {
  const inputLower = userInput.toLowerCase();
  const goalLower = originalGoal.toLowerCase();
  
  // Basic patterns that indicate potentially inadequate metrics
  const inadequatePatterns = {
    measurable: [
      // Lines of code is generally inadequate for skill/career goals
      /\d+\s*(lines?\s*of\s*code|loc)/i,
      // Hours alone without quality measures
      /^\d+\s*hours?\s*(per\s*(week|month|day))?$/i,
      // Very generic counting without context
      /^count\s+/i,
      /^track\s+time/i
    ],
    specific: [
      // Still too vague
      /better\s+at/i,
      /improve\s+my/i,
      /learn\s+more/i
    ],
    achievable: [
      // Unrealistic time commitments
      /\d+\s*hours?\s*per\s*day/i,
      /every\s*day/i
    ]
  };

  // Check for domain-specific issues
  const domainChecks = {
    // Technical career goals
    isCareerGoal: goalLower.includes('senior') || goalLower.includes('programmer') || goalLower.includes('developer') || goalLower.includes('engineer'),
    isAWSGoal: goalLower.includes('aws') || goalLower.includes('amazon'),
    isTypeScriptGoal: goalLower.includes('typescript') || goalLower.includes('ts'),
    
    // Check if metric addresses career aspects
    hasCareerMetrics: inputLower.includes('certification') || inputLower.includes('project') || inputLower.includes('portfolio') || inputLower.includes('interview') || inputLower.includes('network'),
    hasSkillMetrics: inputLower.includes('learn') || inputLower.includes('master') || inputLower.includes('practice'),
    hasPlatformMetrics: inputLower.includes('aws') || inputLower.includes('amazon') || inputLower.includes('cloud')
  };

  // Evaluate based on component and patterns
  if (component === 'measurable') {
    // Check for inadequate patterns
    const hasInadequatePattern = inadequatePatterns.measurable.some(pattern => pattern.test(userInput));
    
    if (hasInadequatePattern) {
      let feedback = "I appreciate you thinking about measurable progress! However, ";
      let suggestions = [];
      
      if (domainChecks.isCareerGoal) {
        if (inputLower.includes('lines of code') || inputLower.includes('loc')) {
          feedback += "for your goal of becoming a senior programmer, lines of code per week doesn't capture the key elements you need to measure. Senior developers are evaluated on code quality, architecture decisions, and leadership skills, not just volume.";
          
          suggestions = [
            "Complete 2-3 substantial projects showcasing advanced skills",
            "Conduct code reviews and mentor junior developers",
            "Lead technical discussions or present at meetups"
          ];
          
          if (domainChecks.isAWSGoal) {
            suggestions.push("Earn AWS certifications (Developer Associate, Solutions Architect)");
            suggestions.push("Build projects using different AWS services");
            suggestions.push("Attend AWS meetups and connect with AWS professionals");
          }
          
          if (domainChecks.isTypeScriptGoal) {
            suggestions.push("Master advanced TypeScript features (generics, decorators, advanced types)");
            suggestions.push("Contribute to TypeScript open source projects");
          }
        }
      }
      
      if (suggestions.length === 0) {
        suggestions = [
          "Focus on quality and impact rather than just quantity",
          "Include skill development and practical application",
          "Consider metrics that align with your end goal"
        ];
      }
      
      return {
        needsImprovement: true,
        feedback: feedback,
        suggestions: suggestions
      };
    }
    
    // Check if metric addresses all aspects of a multi-faceted goal
    if (domainChecks.isCareerGoal && domainChecks.isAWSGoal) {
      const addressesCareer = domainChecks.hasCareerMetrics;
      const addressesSkills = domainChecks.hasSkillMetrics;
      const addressesPlatform = domainChecks.hasPlatformMetrics;
      
      if (!addressesCareer || !addressesPlatform) {
        return {
          needsImprovement: true,
          feedback: "Your metric is a good start, but for a goal involving both technical skills and AWS career positioning, you'll want to measure multiple aspects. Consider metrics that address both skill development and career progression toward AWS opportunities.",
          suggestions: [
            "Combine technical skill metrics with career development activities",
            "Include AWS-specific learning and networking",
            "Track both learning progress and professional positioning"
          ]
        };
      }
    }
  }
  
  // If no issues found, metric is adequate
  return {
    needsImprovement: false,
    feedback: "Metric appears adequate",
    suggestions: []
  };
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
    const completion = await Promise.race([
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

// Goal clarification endpoint
app.post('/api/v1/goals/:goalId/clarify', requireOpenAI, async (req, res) => {
  console.log('OpenAI API: Received goal clarification request:', req.params.goalId, req.body);
  
  // Add response tracking to ensure we always respond
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
      return res.status(400).json({
        success: false,
        error: 'clarifications object is required'
      });
    }

    // Get the current component being clarified
    const currentComponent = Object.keys(clarifications)[Object.keys(clarifications).length - 1];
    const userInput = clarifications[currentComponent];
    
    // Extract goal context for intelligent evaluation
    const originalGoal = goalContext?.title || goalContext?.originalGoal || "programming goal";
    const goalDescription = goalContext?.description || "";

    // Check if the user input is vague, uncertain, or needs follow-up
    const isVagueResponse = userInput.toLowerCase().includes('uncertain') ||
                           userInput.toLowerCase().includes("don't know") ||
                           userInput.toLowerCase().includes('not sure') ||
                           userInput.toLowerCase().includes('maybe') ||
                           userInput.toLowerCase().includes('unsure') ||
                           userInput.toLowerCase().includes('unclear') ||
                           userInput.length < 20; // Very short responses

    if (isVagueResponse) {
      // Provide follow-up guidance instead of moving forward
      try {
        console.log('Making OpenAI call for vague response follow-up...');
        const followUpCompletion = await Promise.race([
          openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: `You are a SMART goal coach helping users work through challenges. The user has given a vague or uncertain response about the "${currentComponent}" component of their goal.

Your job is to:
1. Acknowledge their concern with empathy
2. Provide 2-3 specific, practical suggestions to help them think through this challenge
3. Ask a targeted follow-up question to help them get more specific
4. DO NOT suggest moving to the next component yet
5. Be encouraging but focus on helping them work through the specific challenge

For the "${currentComponent}" component, provide context-specific guidance:
- If "specific": Help them narrow down their focus area
- If "measurable": Suggest concrete metrics they could track
- If "achievable": Help them assess time, resources, and constraints
- If "relevant": Help them connect to their priorities and motivations
- If "timeBound": Help them think about realistic timelines and deadlines

Return a JSON response with this structure:
{
  "needsFollowUp": true,
  "feedback": "Empathetic acknowledgment + practical suggestions + specific follow-up question",
  "suggestions": ["Practical suggestion 1", "Practical suggestion 2", "Practical suggestion 3"]
}`
              },
              {
                role: "user",
                content: `Component: ${currentComponent}
User response: "${userInput}"
Goal context: Programming/TypeScript development goal

Help them work through this challenge before moving forward.`
              }
            ],
            temperature: 0.7,
            max_tokens: 600
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('OpenAI API timeout')), 10000)
          )
        ]);

        const followUpResponse = JSON.parse(followUpCompletion.choices[0].message.content);
        
        clearTimeout(globalTimeout);
        sendResponse({
          success: true,
          data: {
            needsFollowUp: true,
            feedback: followUpResponse.feedback,
            suggestions: followUpResponse.suggestions
          },
          message: followUpResponse.feedback
        });
        return;
      } catch (aiError) {
        // Fallback follow-up response when OpenAI fails
        const fallbackFollowUp = generateFallbackFollowUp(currentComponent, userInput);
        
        clearTimeout(globalTimeout);
        sendResponse({
          success: true,
          data: {
            needsFollowUp: true,
            feedback: fallbackFollowUp.feedback,
            suggestions: fallbackFollowUp.suggestions
          },
          message: fallbackFollowUp.feedback
        });
        return;
      }
    }

    // NEW: Intelligent metric evaluation - check if the response is adequate for the goal
    // This happens after vagueness check but before accepting the response
    if (!isVagueResponse) {
      console.log('Starting metric evaluation for non-vague response:', userInput);
      
      // Add request timeout tracking
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`[${requestId}] Starting metric evaluation`);
      
      try {
        // Create a more aggressive timeout for metric evaluation
        const timeoutPromise = new Promise((_, reject) => {
          const timeoutId = setTimeout(() => {
            console.log(`[${requestId}] Metric evaluation timed out after 8 seconds`);
            reject(new Error('Metric evaluation timeout'));
          }, 8000); // Reduced to 8 seconds for faster fallback
          
          // Store timeout ID for potential cleanup
          timeoutPromise.timeoutId = timeoutId;
        });
        
        console.log(`[${requestId}] Making OpenAI API call for metric evaluation`);
        const metricEvaluationCompletion = await Promise.race([
          openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: `You are a SMART goal expert with deep domain knowledge. You must evaluate whether the user's proposed response effectively measures progress toward their specific goal.

EVALUATION CRITERIA:
1. Goal Alignment: Does this response directly measure progress toward the stated goal?
2. Completeness: Does it address all aspects of a multi-faceted goal?
3. Effectiveness: Will tracking this drive the right behaviors to achieve the goal?
4. Specificity: Is it specific to the domain/platform/skills mentioned in the goal?

For technical career goals like "senior TypeScript programmer for AWS":
- Lines of code is inadequate (doesn't measure quality, seniority, or AWS specialization)
- Better metrics: AWS certifications, TypeScript projects, senior-level responsibilities, AWS networking

Return a JSON response with this structure:
{
  "isAdequate": true/false,
  "evaluation": {
    "goalAlignment": "How well does this align with the goal?",
    "completeness": "Does this address all aspects of the goal?",
    "effectiveness": "Will this drive the right behaviors?",
    "specificity": "Is this specific to the goal domain?"
  },
  "feedback": "Detailed explanation of why this metric is/isn't adequate",
  "betterAlternatives": ["Alternative metric 1", "Alternative metric 2", "Alternative metric 3"],
  "needsImprovement": true/false
}`
              },
              {
                role: "user",
                content: `GOAL: "${originalGoal}"
GOAL DESCRIPTION: "${goalDescription}"
COMPONENT: ${currentComponent}
USER RESPONSE: "${userInput}"

Please evaluate whether this response effectively measures progress toward the goal.`
              }
            ],
            temperature: 0.3,
            max_tokens: 800
          }),
          timeoutPromise
        ]);

        console.log(`[${requestId}] Metric evaluation completed successfully`);
        
        // Clear timeout if request completed
        if (timeoutPromise.timeoutId) {
          clearTimeout(timeoutPromise.timeoutId);
        }

        const metricEvaluation = JSON.parse(metricEvaluationCompletion.choices[0].message.content);
        
        // If the metric is inadequate, provide intelligent feedback
        if (!metricEvaluation.isAdequate || metricEvaluation.needsImprovement) {
          console.log(`[${requestId}] Metric evaluation detected inadequate metric`);
          clearTimeout(globalTimeout);
          sendResponse({
            success: true,
            data: {
              needsFollowUp: true,
              feedback: metricEvaluation.feedback,
              suggestions: metricEvaluation.betterAlternatives,
              evaluation: metricEvaluation.evaluation
            },
            message: metricEvaluation.feedback
          });
          return;
        }
        
        console.log(`[${requestId}] Metric evaluation passed as adequate`);
      } catch (aiError) {
        console.log(`[${requestId}] Metric evaluation AI error, proceeding with basic evaluation:`, aiError.message);
        
        // Clear timeout if it exists
        if (timeoutPromise && timeoutPromise.timeoutId) {
          clearTimeout(timeoutPromise.timeoutId);
        }
        
        // If AI evaluation fails, fall back to basic domain-specific checks
        const basicEvaluation = evaluateMetricBasic(currentComponent, userInput, originalGoal);
        console.log(`[${requestId}] Basic evaluation result:`, basicEvaluation);
        if (basicEvaluation.needsImprovement) {
          console.log(`[${requestId}] Basic evaluation detected inadequate metric, providing feedback`);
          clearTimeout(globalTimeout);
          sendResponse({
            success: true,
            data: {
              needsFollowUp: true,
              feedback: basicEvaluation.feedback,
              suggestions: basicEvaluation.suggestions
            },
            message: basicEvaluation.feedback
          });
          return;
        } else {
          console.log(`[${requestId}] Basic evaluation passed metric as adequate`);
        }
      }
    }

    // Use OpenAI to improve the specific component based on user input
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a SMART goal expert helping improve a specific component of a goal. The user has provided a substantive clarification for the "${currentComponent}" component.

Based on their input, provide an improved version of that component and update the confidence score.

Return a JSON response with this structure:
{
  "improvedComponent": {
    "value": "Improved description incorporating user input",
    "confidence": 0.0-1.0,
    "missing": ["Any remaining missing elements"]
  },
  "feedback": "Encouraging feedback about their clarification that acknowledges the specific details they provided",
  "nextSuggestion": "Helpful suggestion for the next component if applicable"
}`
          },
          {
            role: "user",
            content: `Component: ${currentComponent}
User clarification: "${userInput}"

Please improve this component based on their input.`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OpenAI API timeout')), 10000)
      )
    ]);

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    
    // Create improved goal with updated component
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
      confidence: 0.88,
      aiFeedback: aiResponse.feedback
    };

    clearTimeout(globalTimeout);
    sendResponse({
      success: true,
      data: improvedGoal,
      message: aiResponse.feedback
    });

  } catch (error) {
    console.error('OpenAI Clarification Error:', error);
    
    // Fallback response
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
  console.log(`   POST /api/v1/goals/:goalId/clarify (requires X-OpenAI-API-Key header)`);
  console.log(`   GET  /health`);
  console.log(`\n🔑 Don't forget to provide your OpenAI API key in the X-OpenAI-API-Key header!`);
});