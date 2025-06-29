/**
 * LLM-Driven Validator Service
 * 
 * Implements AI-powered validation and component extraction for goal processing,
 * including timeframe parsing, metrics identification, and SMART criteria validation.
 * 
 * @see {@link file://../../../../docs/LLM_DRIVEN_REFACTORING.md LLM-Driven Refactoring Guide}
 * @see {@link file://../../../../docs/goal-strategy-service-specification.md#validation-engine Validation Engine Specification}
 * @see {@link file://../../../../docs/SECURE_LLM_TESTING_STRATEGY.md Secure LLM Testing Strategy}
 */

import OpenAI from 'openai';
import { z } from 'zod';

const ExtractedComponentsSchema = z.object({
  timeframes: z.array(z.object({
    text: z.string(),
    type: z.enum(['deadline', 'duration', 'milestone', 'recurring']),
    parsedValue: z.string().optional(),
    confidence: z.number().min(0).max(100)
  })),
  metrics: z.array(z.object({
    text: z.string(),
    type: z.enum(['numeric', 'percentage', 'boolean', 'qualitative']),
    value: z.union([z.string(), z.number()]).optional(),
    unit: z.string().optional(),
    confidence: z.number().min(0).max(100)
  })),
  specificDetails: z.object({
    what: z.object({ value: z.string().optional(), confidence: z.number() }),
    who: z.object({ value: z.string().optional(), confidence: z.number() }),
    where: z.object({ value: z.string().optional(), confidence: z.number() }),
    why: z.object({ value: z.string().optional(), confidence: z.number() }),
    how: z.object({ value: z.string().optional(), confidence: z.number() })
  }),
  resources: z.array(z.object({
    name: z.string(),
    type: z.enum(['human', 'financial', 'technical', 'time', 'knowledge']),
    required: z.boolean(),
    available: z.boolean().optional()
  })),
  dependencies: z.array(z.object({
    description: z.string(),
    type: z.enum(['prerequisite', 'concurrent', 'external']),
    criticality: z.enum(['high', 'medium', 'low'])
  })),
  domain: z.object({
    category: z.string(),
    subCategory: z.string().optional(),
    keywords: z.array(z.string()),
    industryContext: z.string().optional()
  }),
  analysis: z.object({
    overallCompleteness: z.number().min(0).max(100),
    missingComponents: z.array(z.string()),
    ambiguities: z.array(z.string()),
    suggestions: z.array(z.object({
      component: z.string(),
      suggestion: z.string(),
      example: z.string().optional()
    }))
  })
});

type ExtractedComponents = z.infer<typeof ExtractedComponentsSchema>;

export class LLMDrivenValidator {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async extractGoalComponents(userInput: string, context?: string): Promise<ExtractedComponents> {
    const systemPrompt = `You are an expert at analyzing goal statements and extracting structured information. 
You understand various ways people express goals, timelines, metrics, and requirements.
You can identify implicit information and make intelligent inferences while maintaining accuracy.`;

    const userPrompt = `Analyze this goal statement and extract ALL components:

GOAL STATEMENT: "${userInput}"
${context ? `ADDITIONAL CONTEXT: ${context}` : ''}

Extract and analyze:

1. TIMEFRAMES
   - Any mention of dates, deadlines, durations, or time periods
   - Classify as deadline, duration, milestone, or recurring
   - Parse into standardized format where possible
   - Rate confidence in interpretation

2. METRICS
   - Anything measurable or quantifiable
   - Identify type (numeric, percentage, boolean, qualitative)
   - Extract values and units
   - Rate confidence in interpretation

3. SPECIFIC DETAILS (5W1H)
   - What: The core objective or outcome
   - Who: People involved or affected
   - Where: Location or context
   - Why: Purpose or motivation
   - How: Method or approach
   - Rate confidence for each component

4. RESOURCES
   - Required resources (people, money, tools, time, knowledge)
   - Classify by type
   - Indicate if explicitly required or inferred
   - Note availability if mentioned

5. DEPENDENCIES
   - Prerequisites or conditions
   - Concurrent requirements
   - External dependencies
   - Rate criticality

6. DOMAIN CONTEXT
   - Primary category (e.g., career, health, finance, education)
   - Industry or field specifics
   - Key domain-specific terms

7. ANALYSIS
   - Overall completeness score (0-100)
   - List missing SMART components
   - Identify ambiguities
   - Provide specific suggestions with examples

Return comprehensive JSON with all findings. Be thorough but accurate - only include what can be reasonably inferred from the input.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from LLM');
      }

      const parsedResponse = JSON.parse(responseText);
      return ExtractedComponentsSchema.parse(parsedResponse);
    } catch (error) {
      console.error('Error extracting goal components:', error);
      throw new Error(`Failed to extract goal components: ${error.message}`);
    }
  }

  async validateAndEnhance(
    components: ExtractedComponents,
    userPreferences?: { style?: string, domain?: string }
  ): Promise<{
    isValid: boolean,
    validationIssues: string[],
    enhancements: { component: string, enhancement: string }[],
    readyForPlanning: boolean
  }> {
    const validationPrompt = `Validate these extracted goal components and suggest enhancements:

COMPONENTS: ${JSON.stringify(components, null, 2)}
USER PREFERENCES: ${JSON.stringify(userPreferences || {})}

Evaluate:
1. Are the components sufficient for creating a SMART goal?
2. What validation issues exist?
3. What enhancements would make the goal more actionable?
4. Is this ready for milestone/task planning?

Consider domain-specific requirements and best practices.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at validating and enhancing goal components for maximum clarity and actionability.' 
          },
          { role: 'user', content: validationPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5
      });

      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Error validating components:', error);
      return {
        isValid: false,
        validationIssues: ['Unable to validate components'],
        enhancements: [],
        readyForPlanning: false
      };
    }
  }

  async generateContextualExamples(
    missingComponents: string[],
    domain: string,
    existingGoalText: string
  ): Promise<{ component: string, examples: string[] }[]> {
    const examplePrompt = `Generate contextual examples for missing goal components:

CURRENT GOAL: "${existingGoalText}"
DOMAIN: ${domain}
MISSING COMPONENTS: ${JSON.stringify(missingComponents)}

For each missing component, provide 2-3 examples that:
1. Fit naturally with the existing goal
2. Are relevant to the domain
3. Are concrete and actionable
4. Show different approaches or options

Make examples specific and inspiring, not generic.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You create helpful, specific examples that guide users in improving their goals.' 
          },
          { role: 'user', content: examplePrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8
      });

      const response = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return response.examples || [];
    } catch (error) {
      console.error('Error generating examples:', error);
      return [];
    }
  }
}