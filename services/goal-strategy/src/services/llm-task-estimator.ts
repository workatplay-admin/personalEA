import OpenAI from 'openai';
import { z } from 'zod';

const TaskContextSchema = z.object({
  projectType: z.string(),
  teamSize: z.number().optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'expert']).optional(),
  constraints: z.array(z.string()).optional(),
  similarTasksCompleted: z.number().optional(),
  availableResources: z.array(z.string()).optional(),
  deadline: z.string().optional()
});

const HistoricalTaskSchema = z.object({
  description: z.string(),
  estimatedHours: z.number(),
  actualHours: z.number(),
  complexity: z.enum(['simple', 'medium', 'complex']),
  delayFactors: z.array(z.string()).optional()
});

const ComprehensiveEstimateSchema = z.object({
  taskAnalysis: z.object({
    complexity: z.enum(['simple', 'medium', 'complex', 'very_complex']),
    clarityScore: z.number().min(0).max(100),
    noveltyScore: z.number().min(0).max(100),
    technicalDebtRisk: z.number().min(0).max(100)
  }),
  estimates: z.object({
    optimistic: z.object({
      hours: z.number(),
      assumptions: z.array(z.string())
    }),
    likely: z.object({
      hours: z.number(),
      methodology: z.string(),
      confidence: z.number().min(0).max(100)
    }),
    pessimistic: z.object({
      hours: z.number(),
      riskFactors: z.array(z.string())
    }),
    recommended: z.object({
      hours: z.number(),
      bufferPercentage: z.number(),
      rationale: z.string()
    })
  }),
  breakdown: z.array(z.object({
    subtask: z.string(),
    hours: z.number(),
    complexity: z.enum(['simple', 'medium', 'complex']),
    dependencies: z.array(z.string()),
    parallelizable: z.boolean(),
    skillsRequired: z.array(z.string())
  })),
  risks: z.array(z.object({
    factor: z.string(),
    probability: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high']),
    mitigation: z.string(),
    contingencyHours: z.number()
  })),
  dependencies: z.object({
    prerequisites: z.array(z.string()),
    blockers: z.array(z.string()),
    externalDependencies: z.array(z.object({
      item: z.string(),
      owner: z.string().optional(),
      estimatedWaitTime: z.number().optional()
    }))
  }),
  resources: z.object({
    required: z.array(z.object({
      type: z.string(),
      description: z.string(),
      availability: z.enum(['available', 'needs_acquisition', 'uncertain'])
    })),
    optimal: z.array(z.string())
  }),
  parallelization: z.object({
    opportunities: z.array(z.object({
      tasks: z.array(z.string()),
      timeSaving: z.number(),
      requiresCoordination: z.boolean()
    })),
    criticalPath: z.array(z.string()),
    maxParallelism: z.number()
  }),
  recommendations: z.array(z.object({
    type: z.enum(['process', 'resource', 'scope', 'timeline']),
    suggestion: z.string(),
    impact: z.string()
  }))
});

type TaskContext = z.infer<typeof TaskContextSchema>;
type HistoricalTask = z.infer<typeof HistoricalTaskSchema>;
type ComprehensiveEstimate = z.infer<typeof ComprehensiveEstimateSchema>;

export class LLMTaskEstimator {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async estimateTask(
    taskDescription: string,
    context: TaskContext,
    historicalData?: HistoricalTask[]
  ): Promise<ComprehensiveEstimate> {
    const systemPrompt = `You are an expert project estimator with deep knowledge of software development, project management, and risk assessment. 
You provide accurate, comprehensive estimates by considering multiple factors and methodologies.
You understand the importance of both optimistic and pessimistic scenarios and can identify hidden complexities.`;

    const userPrompt = `Provide a comprehensive estimate for this task:

TASK: ${taskDescription}

CONTEXT:
${JSON.stringify(context, null, 2)}

${historicalData ? `HISTORICAL DATA:
${JSON.stringify(historicalData, null, 2)}` : 'NO HISTORICAL DATA AVAILABLE'}

Provide a detailed analysis including:

1. TASK ANALYSIS
   - Complexity assessment
   - Clarity of requirements (0-100)
   - Novelty/uniqueness (0-100)
   - Technical debt risk (0-100)

2. ESTIMATES
   - Optimistic (best case) with assumptions
   - Likely (realistic) with methodology and confidence
   - Pessimistic (worst case) with risk factors
   - Recommended (with buffer and rationale)

3. TASK BREAKDOWN
   - Decompose into subtasks
   - Estimate each subtask
   - Identify dependencies and parallelization opportunities
   - Required skills for each

4. RISK ASSESSMENT
   - Identify risk factors
   - Assess probability and impact
   - Suggest mitigation strategies
   - Calculate contingency hours

5. DEPENDENCIES
   - Prerequisites
   - Potential blockers
   - External dependencies with wait times

6. RESOURCE REQUIREMENTS
   - Required resources and their availability
   - Optimal resources for efficiency

7. PARALLELIZATION ANALYSIS
   - Identify parallel execution opportunities
   - Calculate time savings
   - Determine critical path
   - Maximum useful parallelism

8. RECOMMENDATIONS
   - Process improvements
   - Resource optimization
   - Scope adjustments
   - Timeline considerations

Use historical data to calibrate estimates where available. Consider all estimation methods (PERT, analogous, parametric, bottom-up) and integrate insights.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 3000
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from LLM');
      }

      const parsedResponse = JSON.parse(responseText);
      return ComprehensiveEstimateSchema.parse(parsedResponse);
    } catch (error) {
      console.error('Error estimating task:', error);
      throw new Error(`Failed to estimate task: ${error.message}`);
    }
  }

  async compareEstimationMethods(
    taskDescription: string,
    context: TaskContext
  ): Promise<{
    methods: {
      name: string,
      estimate: number,
      confidence: number,
      rationale: string
    }[],
    recommendation: {
      method: string,
      estimate: number,
      reasoning: string
    }
  }> {
    const comparisonPrompt = `Compare different estimation methods for this task:

TASK: ${taskDescription}
CONTEXT: ${JSON.stringify(context, null, 2)}

Apply and compare:
1. PERT (Three-point estimation)
2. Analogous estimation
3. Parametric estimation
4. Bottom-up estimation
5. Expert judgment
6. Machine learning prediction (if applicable)

For each method:
- Calculate the estimate
- Assess confidence level
- Explain the rationale

Then recommend the best approach with reasoning.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert in various project estimation methodologies.' 
          },
          { role: 'user', content: comparisonPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Error comparing estimation methods:', error);
      throw error;
    }
  }

  async adjustForTeamDynamics(
    estimate: ComprehensiveEstimate,
    teamProfile: {
      size: number,
      experienceLevels: string[],
      collaborationStyle: string,
      distributedTeam: boolean
    }
  ): Promise<{
    adjustedEstimate: number,
    adjustmentFactors: { factor: string, impact: number }[],
    teamRecommendations: string[]
  }> {
    const adjustmentPrompt = `Adjust this estimate based on team dynamics:

ORIGINAL ESTIMATE: ${JSON.stringify(estimate, null, 2)}
TEAM PROFILE: ${JSON.stringify(teamProfile, null, 2)}

Consider:
1. Communication overhead
2. Coordination costs
3. Skill distribution
4. Team familiarity
5. Remote collaboration factors

Provide adjusted estimate with detailed factors and recommendations.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You understand how team dynamics affect project estimates and execution.' 
          },
          { role: 'user', content: adjustmentPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5
      });

      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Error adjusting for team dynamics:', error);
      throw error;
    }
  }
}