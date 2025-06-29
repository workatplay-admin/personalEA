# Problematic Code Section

## File: `/workspaces/personalEA/services/goal-strategy/src/services/smart-goal-processor.ts`

### Method: `buildClarificationPrompt` (lines 294-336)

```typescript
private buildClarificationPrompt(
  originalGoal: string,
  smartCriteria: SMARTCriteria,
  answers: ClarificationAnswer[]
): string {
  return `
You are an expert goal-setting coach helping refine a goal through conversation.

Original Goal: "${originalGoal}"
Current SMART Criteria: ${JSON.stringify(smartCriteria, null, 2)}

User's Latest Input:
${answers.map(a => `Component: ${a.smartCriterion}\nUser said: "${a.answer}"`).join('\n\n')}

CRITICAL RULES:
1. ONLY update the specific component(s) the user addressed
2. DO NOT add details the user didn't provide (no timeframes, metrics, or assessments they didn't mention)
3. DO NOT assume achievability or relevance without the user confirming it
4. Keep confidence LOW (0.3-0.5) unless the user provided comprehensive details
5. Ask follow-up questions for missing information
6. Preserve the original goal unless the user explicitly requested changes

Example: If user says "hobby racing at local track" for specificity:
- Update ONLY the specific component with their exact words
- Do NOT add timeframes, difficulty assessments, or relevance assumptions
- Ask follow-up questions for missing timeline, achievability verification, etc.

Respond in JSON format:
{
  "smartGoal": "Keep original goal unless user explicitly changed it",
  "smartCriteria": {
    "specific": { "value": "Only update if user addressed this", "confidence": 0.3-0.5, "missing": ["what's still needed"] },
    "measurable": { "value": "Only update if user addressed this", "metrics": [], "confidence": 0.3, "missing": ["metrics needed"] },
    "achievable": { "value": "Only update if user addressed this", "confidence": 0.3, "missing": ["feasibility check needed"] },
    "relevant": { "value": "Only update if user addressed this", "confidence": 0.3, "missing": ["relevance check needed"] },
    "timeBound": { "value": "Only update if user addressed this", "confidence": 0.3, "missing": ["timeline needed"] }
  },
  "missingCriteria": ["components still needing user input"],
  "clarificationQuestions": ["Specific follow-up questions based on what's missing"],
  "confidence": 0.3-0.5
}
`;
}
```

## Key Problems:

1. **Line 312**: "Keep confidence LOW (0.3-0.5)" - This artificially constrains scores
2. **Line 309**: "ONLY update the specific component(s)" - Too restrictive
3. **Line 310**: "DO NOT add details the user didn't provide" - Prevents reasonable interpretation
4. **Lines 331-334**: Hardcoded low confidence values in the JSON response template

## Impact:
When a user provides a detailed answer like "I want to do hobby racing at the local karting track, practicing weekly and competing in the amateur league by summer", the system:
- Only updates the 'specific' component
- Keeps confidence at 0.3-0.5 despite the comprehensive answer
- Ignores that the answer also addresses 'measurable' (weekly practice) and 'timeBound' (by summer)
- Continues asking for information already provided

## Required Fix:
The prompt needs to be rewritten to:
1. Allow dynamic confidence scoring (0.0-1.0) based on answer quality
2. Update ALL components that the answer addresses
3. Recognize when sufficient information has been provided
4. Stop the clarification loop when goals are adequately defined