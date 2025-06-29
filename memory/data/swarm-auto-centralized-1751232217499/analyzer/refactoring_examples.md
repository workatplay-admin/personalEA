# PersonalEA LLM Refactoring Examples

## 1. Manual Regex Pattern Matching → LLM Extraction

### BEFORE (smart-goal-processor.ts, lines 782-802)
```typescript
private detectTimeframeInAnswer(answer: string): boolean {
  const timeframePatterns = [
    /\d+\s*(day|week|month|year|hour)s?/i,
    /by\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    /by\s+\d{1,2}\/\d{1,2}\/\d{2,4}/,
    /within\s+\d+/i,
    /before\s+\d+/i,
    /after\s+\d+/i,
    /next\s+(week|month|year|quarter)/i,
    /this\s+(week|month|year|quarter)/i,
    /q[1-4]\s+\d{4}/i,
    /spring|summer|fall|autumn|winter\s+\d{4}/i,
    /in\s+\d+\s*(day|week|month|year)s?/i,
    /over\s+the\s+next\s+\d+/i,
    /for\s+\d+\s*(day|week|month|year)s?/i,
    /duration.*\d+/i,
    /timeline.*\d+/i
  ];
  
  return timeframePatterns.some(pattern => pattern.test(answer));
}
```

### AFTER
```typescript
private async detectTimeframeInAnswer(answer: string): Promise<boolean> {
  const result = await this.llmService.analyze({
    task: 'timeframe_detection',
    content: answer,
    instruction: 'Does this text contain any reference to timeframes, deadlines, or durations? Return true/false with extracted timeframes.'
  });
  
  return result.hasTimeframe;
}
```

## 2. Hardcoded Category Mapping → Dynamic LLM Categorization

### BEFORE (ai-processor.ts, lines 257-270)
```typescript
private mapCategory(category: string): EmailCategory {
  const categoryMap: Record<string, EmailCategory> = {
    urgent: EmailCategory.URGENT,
    important: EmailCategory.IMPORTANT,
    informational: EmailCategory.INFORMATIONAL,
    actionable: EmailCategory.ACTIONABLE,
    'follow-up': EmailCategory.FOLLOW_UP,
    followup: EmailCategory.FOLLOW_UP,
    spam: EmailCategory.SPAM,
    promotional: EmailCategory.PROMOTIONAL,
  };

  return categoryMap[category?.toLowerCase()] || EmailCategory.INFORMATIONAL;
}
```

### AFTER
```typescript
private async mapCategory(emailContent: string): Promise<EmailCategory> {
  const result = await this.llmService.categorize({
    content: emailContent,
    categories: Object.values(EmailCategory),
    context: 'email_classification',
    instruction: 'Categorize this email based on urgency, importance, and required action.'
  });
  
  return result.category;
}
```

## 3. Complex Prompt Building → Dynamic Generation

### BEFORE (smart-goal-processor.ts, lines 257-319)
```typescript
private buildTranslationPrompt(input: RawGoalInput): string {
  return `
You are an expert goal-setting coach who specializes in understanding informal, conversational goal statements and converting them into SMART format.

IMPORTANT PARSING INSTRUCTIONS:
1. Understand informal language, colloquialisms, and context
2. Identify conditional dependencies (if/then statements)
3. Extract domain-specific terminology and requirements
4. Recognize implicit prerequisites and sequences
5. Parse complex timelines with multiple steps

Raw Goal: "${input.goal}"
${input.context ? `Context: ${JSON.stringify(input.context, null, 2)}` : ''}

ANALYSIS STEPS:
1. First, identify the ULTIMATE GOAL (what the person wants to achieve)
2. Identify any PREREQUISITES or CONDITIONS (if statements, requirements)
... [60+ more lines of template]
`;
}
```

### AFTER
```typescript
private async generatePrompt(input: RawGoalInput): Promise<string> {
  return await this.llmService.generatePrompt({
    task: 'goal_translation',
    data: input,
    requirements: [
      'Convert informal goals to SMART format',
      'Extract prerequisites and dependencies',
      'Identify timelines and milestones'
    ],
    outputFormat: 'structured_json'
  });
}
```

## 4. Manual Similarity Calculation → Semantic Embeddings

### BEFORE (task-estimation-engine.ts, lines 710-738)
```typescript
private calculateTaskSimilarity(
  request: EstimationRequest,
  historicalTask: any
): number {
  let similarity = 0;

  // Complexity similarity (40% weight)
  if (request.complexity === historicalTask.complexity) {
    similarity += 0.4;
  }

  // Skills similarity (40% weight)
  const requestSkills = new Set(request.skills);
  const historicalSkills = new Set(historicalTask.skills);
  const intersection = new Set([...requestSkills].filter(x => historicalSkills.has(x)));
  const union = new Set([...requestSkills, ...historicalSkills]);
  const skillSimilarity = intersection.size / union.size;
  similarity += skillSimilarity * 0.4;

  // Description similarity (20% weight) - simple keyword matching
  const requestWords = new Set(request.taskDescription.toLowerCase().split(/\s+/));
  const historicalWords = new Set(historicalTask.description.toLowerCase().split(/\s+/));
  const wordIntersection = new Set([...requestWords].filter(x => historicalWords.has(x)));
  const wordUnion = new Set([...requestWords, ...historicalWords]);
  const descriptionSimilarity = wordIntersection.size / wordUnion.size;
  similarity += descriptionSimilarity * 0.2;

  return similarity;
}
```

### AFTER
```typescript
private async calculateTaskSimilarity(
  request: EstimationRequest,
  historicalTask: any
): Promise<number> {
  const similarity = await this.llmService.semanticSimilarity({
    text1: {
      description: request.taskDescription,
      attributes: {
        complexity: request.complexity,
        skills: request.skills
      }
    },
    text2: {
      description: historicalTask.description,
      attributes: {
        complexity: historicalTask.complexity,
        skills: historicalTask.skills
      }
    },
    weights: {
      semantic: 0.6,
      attributes: 0.4
    }
  });

  return similarity.score;
}
```

## 5. Complex Validation Logic → Natural Language Rules

### BEFORE (wbs-engine.ts, lines 319-354)
```typescript
private validateAndProcessTaskHierarchy(tasks: any[]): TaskBreakdown[] {
  const processTask = (task: any): TaskBreakdown => {
    // Validate core task structure
    const validatedTask = TaskBreakdownSchema.parse({
      title: task.title,
      description: task.description,
      estimatedHours: task.estimatedHours,
      priority: task.priority,
      complexity: task.complexity,
      skills: task.skills || [],
      dependencies: task.dependencies || [],
      completionCriteria: task.completionCriteria,
      templateCategory: task.templateCategory,
    });

    // Process subtasks recursively
    const result: TaskBreakdown = {
      title: validatedTask.title,
      description: validatedTask.description,
      estimatedHours: validatedTask.estimatedHours,
      priority: validatedTask.priority,
      complexity: validatedTask.complexity,
      skills: validatedTask.skills || [],
      dependencies: validatedTask.dependencies || [],
      completionCriteria: validatedTask.completionCriteria,
      ...(validatedTask.templateCategory && { templateCategory: validatedTask.templateCategory }),
    };
    if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      result.subtasks = task.subtasks.map(processTask);
    }

    return result;
  };

  return tasks.map(processTask);
}
```

### AFTER
```typescript
private async validateAndProcessTaskHierarchy(tasks: any[]): Promise<TaskBreakdown[]> {
  const validationRules = [
    'Each task must have a clear, actionable title',
    'Estimated hours must be between 0.25 and 8',
    'Tasks must have at least one completion criterion',
    'Dependencies must reference existing tasks',
    'Task hierarchy must not exceed 5 levels deep'
  ];

  const result = await this.llmService.validateAndTransform({
    data: tasks,
    rules: validationRules,
    targetSchema: 'TaskBreakdown',
    options: {
      fixErrors: true,
      explainFixes: true
    }
  });

  return result.validatedData;
}
```

## 6. Risk Factor Identification → Intelligent Analysis

### BEFORE (task-estimation-engine.ts, lines 743-789)
```typescript
private async identifyRiskFactors(
  request: EstimationRequest,
  historicalData: any[]
): Promise<RiskFactor[]> {
  const riskFactors: RiskFactor[] = [];

  // Complexity risk
  if (request.complexity === 'COMPLEX') {
    riskFactors.push({
      factor: 'High Complexity',
      impact: 'HIGH',
      probability: 0.7,
      mitigation: 'Break down into smaller tasks, add buffer time',
      adjustmentFactor: 1.3,
    });
  }

  // Multiple skills risk
  if (request.skills.length > 3) {
    riskFactors.push({
      factor: 'Multiple Skills Required',
      impact: 'MEDIUM',
      probability: 0.5,
      mitigation: 'Ensure skill availability, consider training time',
      adjustmentFactor: 1.2,
    });
  }

  // Historical accuracy risk
  const similarTasks = historicalData.filter(task => 
    this.calculateTaskSimilarity(request, task) > 0.5
  );

  if (similarTasks.length > 0) {
    const avgAccuracy = similarTasks.reduce((sum, task) => sum + task.accuracy, 0) / similarTasks.length;
    if (avgAccuracy < 0.7) {
      riskFactors.push({
        factor: 'Poor Historical Accuracy',
        impact: 'HIGH',
        probability: 0.8,
        mitigation: 'Add significant buffer, improve estimation process',
        adjustmentFactor: 1.4,
      });
    }
  }

  return riskFactors;
}
```

### AFTER
```typescript
private async identifyRiskFactors(
  request: EstimationRequest,
  historicalData: any[]
): Promise<RiskFactor[]> {
  const analysis = await this.llmService.analyzeRisks({
    task: request,
    historicalContext: historicalData,
    instruction: `Analyze this task for potential risks considering:
      - Task complexity and technical challenges
      - Resource requirements and availability
      - Historical performance on similar tasks
      - Dependencies and external factors
      - Team capabilities and skill gaps
      
      For each risk, provide impact level, probability, and specific mitigation strategies.`
  });

  return analysis.risks.map(risk => ({
    ...risk,
    adjustmentFactor: this.calculateAdjustmentFactor(risk.impact, risk.probability)
  }));
}
```

## Benefits Summary

1. **Code Reduction**: 60-80% fewer lines per function
2. **Flexibility**: Rules and logic can be adjusted without code changes
3. **Accuracy**: Better understanding of context and nuance
4. **Maintainability**: Centralized LLM logic instead of scattered implementations
5. **Adaptability**: System can learn and improve from new patterns

## Implementation Notes

- Keep critical algorithms (like CPM) but augment with LLM insights
- Implement caching for repeated LLM calls
- Add fallback mechanisms for when LLM is unavailable
- Monitor performance and adjust prompt strategies as needed