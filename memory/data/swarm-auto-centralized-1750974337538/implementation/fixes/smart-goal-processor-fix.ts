// FIX 1: smart-goal-processor.ts modifications to respect interactive mode and prevent automatic timeframe addition

// This file shows the necessary changes to smart-goal-processor.ts
// to fix the automatic timeframe augmentation issue

// CHANGES TO IMPLEMENT:

// 1. Update buildTranslationPrompt to respect interactive mode
// Replace lines 251-292 with:

private buildTranslationPrompt(input: RawGoalInput): string {
  // Check if interactive mode is requested
  if (input.mode === 'interactive') {
    return `
You are an expert goal-setting coach. Analyze the following goal WITHOUT automatically adding or suggesting timeframes.

Raw Goal: "${input.goal}"
${input.context ? `Context: ${JSON.stringify(input.context, null, 2)}` : ''}

IMPORTANT INSTRUCTIONS:
1. DO NOT automatically add timeframes or deadlines unless the user explicitly provided one
2. If the goal lacks a timeframe, mark timeBound as missing - DO NOT create one
3. Only analyze what the user has provided - do not augment or enhance
4. For missing components, provide questions to ask the user

Please analyze this goal against SMART criteria and provide:

1. Analysis of the current state (not a transformed version)
2. For each SMART criterion:
   - Current value/assessment based ONLY on what user provided
   - Confidence score (0-1)
   - Missing information (if any)

3. List any missing criteria that need clarification
4. Generate specific clarification questions for missing information
5. Provide an overall confidence score (0-1)

Respond in JSON format:
{
  "smartGoal": "string (original goal, not transformed)",
  "smartCriteria": {
    "specific": { "value": "string", "confidence": number, "missing": ["string"] },
    "measurable": { "value": "string", "metrics": ["string"], "confidence": number, "missing": ["string"] },
    "achievable": { "value": "string", "confidence": number, "missing": ["string"] },
    "relevant": { "value": "string", "confidence": number, "missing": ["string"] },
    "timeBound": { "value": "string", "deadline": "string", "confidence": number, "missing": ["string"] }
  },
  "missingCriteria": ["string"],
  "clarificationQuestions": ["string"],
  "confidence": number
}
`;
  }
  
  // Original automatic mode prompt (existing behavior)
  return `
You are an expert goal-setting coach. Analyze the following goal and convert it into SMART format.

Raw Goal: "${input.goal}"
${input.context ? `Context: ${JSON.stringify(input.context, null, 2)}` : ''}

Please analyze this goal against SMART criteria and provide:

1. A refined SMART goal statement
2. Detailed analysis for each SMART criterion:
   - Specific: What exactly will be accomplished?
   - Measurable: How will progress and success be measured?
   - Achievable: Is this realistic given available resources?
   - Relevant: Why is this goal important and worthwhile?
   - Time-bound: What is the deadline or timeframe?

3. For each criterion, provide:
   - Current value/assessment
   - Confidence score (0-1)
   - Missing information (if any)

4. List any missing criteria that need clarification
5. Generate specific clarification questions for missing information
6. Provide an overall confidence score (0-1)

Respond in JSON format:
{
  "smartGoal": "string",
  "smartCriteria": {
    "specific": { "value": "string", "confidence": number, "missing": ["string"] },
    "measurable": { "value": "string", "metrics": ["string"], "confidence": number, "missing": ["string"] },
    "achievable": { "value": "string", "confidence": number, "missing": ["string"] },
    "relevant": { "value": "string", "confidence": number, "missing": ["string"] },
    "timeBound": { "value": "string", "deadline": "string", "confidence": number, "missing": ["string"] }
  },
  "missingCriteria": ["string"],
  "clarificationQuestions": ["string"],
  "confidence": number
}
`;
}

// 2. Update parseAIResponse to handle interactive mode properly
// Replace lines 392-417 with:

private parseAIResponse(response: string, mode?: 'automatic' | 'interactive'): GoalTranslationResult {
  try {
    // Strip markdown code blocks if present
    const cleanedResponse = this.stripMarkdownCodeBlocks(response);
    const parsed = JSON.parse(cleanedResponse);
    
    // Validate required fields
    if (!parsed.smartGoal || !parsed.smartCriteria || typeof parsed.confidence !== 'number') {
      throw new Error('Invalid AI response format');
    }

    // In interactive mode, ensure timeBound is marked as missing if not provided by user
    if (mode === 'interactive' && parsed.smartCriteria.timeBound) {
      // Check if the AI added a timeframe that wasn't in the original goal
      if (!parsed.smartCriteria.timeBound.value || 
          parsed.smartCriteria.timeBound.value === 'Not specified' ||
          parsed.smartCriteria.timeBound.confidence < 0.3) {
        parsed.smartCriteria.timeBound.missing = ['Timeline needed'];
        parsed.smartCriteria.timeBound.value = 'Not yet defined';
        parsed.smartCriteria.timeBound.deadline = undefined;
        
        // Add to missing criteria if not already there
        if (!parsed.missingCriteria.includes('timeBound')) {
          parsed.missingCriteria.push('timeBound');
        }
        
        // Add clarification question if not already there
        const timeQuestion = 'When would you like to achieve this goal? What\'s your target deadline?';
        if (!parsed.clarificationQuestions.includes(timeQuestion)) {
          parsed.clarificationQuestions.push(timeQuestion);
        }
      }
    }

    return {
      smartGoal: parsed.smartGoal,
      smartCriteria: parsed.smartCriteria,
      missingCriteria: parsed.missingCriteria || [],
      clarificationQuestions: parsed.clarificationQuestions || [],
      confidence: parsed.confidence
    };
  } catch (error) {
    logger.error('Failed to parse AI response', {
      error: error instanceof Error ? error.message : 'Unknown error',
      response: response.substring(0, 500)
    });
    throw new Error('Failed to parse AI response');
  }
}

// 3. Update translateGoal method to pass mode to parseAIResponse
// Replace lines 155-156 with:

const aiResponse = await this.callOpenAI(prompt, correlationId, userApiKey);
const result = this.parseAIResponse(aiResponse, input.mode);

// 4. Add user consent check method
// Add this new method after line 567:

/**
 * Check if user has consented to automatic goal transformation
 */
async checkUserConsent(userId: string): Promise<boolean> {
  // This would check user preferences in database
  // For now, default to requiring consent
  return false;
}

/**
 * Request user consent for automatic transformation
 */
async requestTransformationConsent(input: RawGoalInput): Promise<{
  consent: boolean;
  rememberChoice?: boolean;
}> {
  // This would be called by the API endpoint to get user consent
  // Returns whether user consents and if they want to remember the choice
  return {
    consent: false,
    rememberChoice: false
  };
}