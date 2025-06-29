# Goal-Strategy App Refactoring Guide

## Quick Reference: What to Remove/Simplify

### 1. smart-goal-processor.ts - Major Refactoring Needed

**DELETE these methods entirely:**
- `detectTimeframeInAnswer()` (lines 782-802)
- `detectMetricsInAnswer()` (lines 807-833)
- `detectSpecificsInAnswer()` (lines 838-877)
- `detectAchievableInAnswer()` (lines 882-906)
- `detectRelevanceInAnswer()` (lines 911-937)
- `recalculateScoresAfterClarification()` (lines 683-777)
- Entire `GoalParsingUtilities` class (lines 941-1043)

**SIMPLIFY these methods:**
- `buildTranslationPrompt()` - Reduce from 60+ lines to 10 lines
- `parseAIResponse()` - Remove validation, just parse JSON
- `stripMarkdownCodeBlocks()` - Keep but simplify

**Example Simplification:**
```typescript
// OLD: 60+ line prompt
private buildTranslationPrompt(input: RawGoalInput): string {
  return `You are an expert goal-setting coach...
  [60 lines of instructions]
  Respond in JSON format: {...}`
}

// NEW: Simple natural language
private buildTranslationPrompt(input: RawGoalInput): string {
  return `Convert this goal to SMART format: "${input.goal}"
  ${input.context ? `Context: ${JSON.stringify(input.context)}` : ''}
  
  Return: smartGoal, criteria (specific, measurable, achievable, relevant, timeBound), 
  confidence, and any clarification questions needed.`
}
```

### 2. planner-service.ts - Replace with LLM

**DELETE entire algorithmic sections:**
- `scoreSlots()` method - Let LLM score time slots
- `calculateSlotScore()` - LLM can handle this
- `resolveDependencies()` - Ask LLM for task order
- `topologicalSort()` - Not needed with LLM
- `calculateCriticalPath()` - LLM can identify critical tasks

**REPLACE with:**
```typescript
async planTasks(tasks: Task[], constraints: Constraints): Promise<Schedule> {
  const prompt = `Schedule these tasks: ${JSON.stringify(tasks)}
    Constraints: ${JSON.stringify(constraints)}
    Consider dependencies, working hours, and task priorities.
    Return optimized schedule with explanations.`;
  
  return await this.llm.generateSchedule(prompt);
}
```

### 3. task-estimation-engine.ts - Massive Simplification

**DELETE:**
- All estimation method implementations
- `calculateWeightedEstimate()`
- `identifyRiskFactors()`
- `findHistoricalComparisons()`

**REPLACE with:**
```typescript
async estimateTask(task: TaskDescription): Promise<Estimate> {
  return await this.llm.estimate(`
    Estimate time for: ${task.description}
    Complexity: ${task.complexity}
    Skills: ${task.skills.join(', ')}
    
    Provide optimistic, likely, and pessimistic estimates with confidence level.
  `);
}
```

### 4. milestone-generator.ts - Trust LLM More

**SIMPLIFY:**
- Remove `validateMilestoneSequence()` - LLM can validate its own output
- Remove `optimizeTimeline()` - Include constraints in initial generation

### 5. routes/goals.ts - Reduce Validation

**SIMPLIFY:**
- Reduce Zod schemas to essential fields only
- Remove `calculateOverallProgress()` - Ask LLM for progress
- Remove manual metric calculations

## Refactoring Priority Order

### Phase 1: Quick Wins (1-2 days)
1. Delete all pattern detection methods
2. Simplify prompt templates
3. Remove confidence recalculation logic
4. Reduce validation schemas

### Phase 2: Core Refactoring (3-5 days)
1. Replace planner-service algorithms with LLM
2. Simplify task-estimation-engine
3. Streamline milestone-generator
4. Consolidate response parsing

### Phase 3: Architecture Changes (1 week)
1. Create unified LLM service
2. Implement simple prompt templates
3. Add LLM response caching
4. Build feedback loop for improvement

## Code Smell Indicators

**Red Flags in Current Code:**
- Any method > 50 lines doing "analysis"
- Regex patterns for content detection
- Manual scoring/calculation algorithms
- Complex validation schemas
- "Recalculate" or "normalize" methods

**Green Flags for Refactored Code:**
- Simple prompt → LLM → response flow
- Trusting LLM output structure
- Minimal post-processing
- Natural language prompts
- Single responsibility per method

## Testing Strategy

1. **Before Refactoring:**
   - Capture current outputs for test cases
   - Document expected behaviors

2. **During Refactoring:**
   - A/B test LLM vs algorithmic approaches
   - Compare accuracy and performance

3. **After Refactoring:**
   - Verify outputs match or exceed quality
   - Measure code reduction metrics
   - Monitor LLM token usage

## Expected Outcomes

- **Code Reduction:** ~70% fewer lines
- **Complexity:** From O(n²) algorithms to O(1) LLM calls
- **Maintainability:** 90% easier to modify
- **Performance:** Slight increase in latency, massive reduction in CPU usage
- **Accuracy:** Likely improved due to LLM's contextual understanding

## Final Architecture Vision

```
User Input
    ↓
Simple Validation
    ↓
LLM Service (single interface)
    ├── Goal Translation
    ├── Task Estimation
    ├── Schedule Generation
    └── Milestone Planning
    ↓
Light Response Processing
    ↓
User Response
```

No more algorithms. No more patterns. Just prompts and responses.