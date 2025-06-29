# Improved SMART Goal Clarification Logic Design

## Overview
This design document outlines the architecture for an improved SMART goal clarification system that intelligently prioritizes aspects based on confidence scores, focuses on improving one aspect at a time, and skips aspects that already meet quality thresholds.

## Core Design Principles

### 1. Dynamic Prioritization
- Sort SMART components by confidence score (ascending)
- Focus on the lowest-scoring component first
- Re-evaluate priorities after each user interaction

### 2. Focused Improvement
- Work on one component until it reaches 90%+ confidence
- Use iterative questioning to refine the same aspect
- Only move to next component when current one is satisfactory

### 3. Intelligent Skipping
- Automatically skip components with confidence >= 90%
- Provide option to review high-confidence components if user requests
- Calculate overall goal readiness based on all component scores

### 4. Adaptive Questioning
- Generate context-aware questions based on previous answers
- Use AI to determine if more clarification is needed
- Provide examples and tips specific to the current focus area

## System Architecture

### State Management

```typescript
interface ClarificationState {
  currentFocus: {
    component: string;
    startConfidence: number;
    currentConfidence: number;
    iterationCount: number;
    history: ClarificationAttempt[];
  };
  componentPriority: ComponentPriority[];
  overallProgress: number;
  mode: 'focused' | 'review' | 'complete';
  sessionId: string;
}

interface ComponentPriority {
  key: string;
  label: string;
  confidence: number;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  lastUpdated: Date;
}

interface ClarificationAttempt {
  timestamp: Date;
  userInput: string;
  aiResponse: string;
  confidenceChange: number;
  needsMoreClarification: boolean;
}
```

### Algorithm Flow

```
1. INITIALIZATION
   - Analyze goal and get initial confidence scores
   - Sort components by confidence (ascending)
   - Skip any components with confidence >= 90%
   - Select lowest-confidence component as focus

2. FOCUSED CLARIFICATION LOOP
   - Generate targeted question for current component
   - Receive user input
   - Process clarification with AI
   - Calculate new confidence score
   
   IF confidence < 90% AND iteration < maxIterations:
     - Generate follow-up question
     - Continue loop
   ELSE IF confidence >= 90%:
     - Mark component as completed
     - Move to next priority component
   ELSE IF iteration >= maxIterations:
     - Mark component as reviewed
     - Move to next component with warning

3. COMPLETION CHECK
   - If all components >= 90% OR all reviewed: Complete
   - If components remaining: Go to step 2
   - Calculate overall goal quality score
```

## Frontend Changes (ChatClarification.tsx)

### 1. Replace Sequential Navigation

```typescript
// Remove fixed componentIndex
const [clarificationState, setClarificationState] = useState<ClarificationState>({
  currentFocus: null,
  componentPriority: [],
  overallProgress: 0,
  mode: 'focused',
  sessionId: generateSessionId()
});

// Initialize with priority sorting
const initializePriorities = (goal: Goal) => {
  const priorities = SMART_COMPONENTS.map(comp => ({
    key: comp.key,
    label: comp.label,
    confidence: goal.criteria[comp.key].confidence,
    status: goal.criteria[comp.key].confidence >= 90 ? 'skipped' : 'pending',
    lastUpdated: new Date()
  })).sort((a, b) => a.confidence - b.confidence);
  
  return priorities;
};
```

### 2. Add Focused Question Generation

```typescript
const generateFocusedQuestion = async (component: ComponentPriority) => {
  const response = await goalAPI.generateFocusedQuestion({
    goalId: goal.id,
    component: component.key,
    currentValue: goal.criteria[component.key].value,
    confidence: component.confidence,
    clarificationHistory: clarificationState.currentFocus?.history || [],
    iterationCount: clarificationState.currentFocus?.iterationCount || 0
  });
  
  return response;
};
```

### 3. Update Message Handling

```typescript
const handleClarificationResponse = async (userInput: string) => {
  const response = await goalAPI.processFocusedClarification({
    goalId: goal.id,
    component: clarificationState.currentFocus.component,
    userInput,
    previousAttempts: clarificationState.currentFocus.history,
    conversationContext: messages
  });
  
  // Update state based on response
  if (response.confidence >= 90) {
    // Move to next component
    transitionToNextComponent();
  } else if (response.needsMoreClarification) {
    // Continue with same component
    continueFocusedClarification(response);
  }
};
```

### 4. Add Progress Visualization

```typescript
const ProgressTracker = ({ state }: { state: ClarificationState }) => (
  <div className="space-y-2">
    {state.componentPriority.map(comp => (
      <div key={comp.key} className="flex items-center gap-2">
        <ComponentIcon component={comp} />
        <div className="flex-1">
          <div className="flex justify-between">
            <span className={`text-sm ${comp.status === 'in-progress' ? 'font-bold' : ''}`}>
              {comp.label}
            </span>
            <span className="text-sm text-gray-500">
              {comp.confidence}%
            </span>
          </div>
          <ConfidenceBar 
            value={comp.confidence} 
            status={comp.status}
            threshold={90}
          />
        </div>
      </div>
    ))}
  </div>
);
```

## Backend Changes

### 1. New Endpoints (goals-chat-endpoints.ts)

```typescript
/**
 * POST /api/v1/goals/focused-question
 * Generate a focused question for a specific component
 */
export async function generateFocusedQuestionHandler(req: Request, res: Response): Promise<void> {
  const { goalId, component, currentValue, confidence, clarificationHistory, iterationCount } = req.body;
  
  const systemPrompt = `
You are helping refine the "${component}" aspect of a SMART goal.
Current value: "${currentValue}"
Current confidence: ${confidence}%
Previous attempts: ${clarificationHistory.length}
Iteration: ${iterationCount}

The user has already provided some information, but it needs more clarity to reach 90% confidence.

Analyze what specific details are still missing and generate a targeted follow-up question that:
1. Builds on their previous answers
2. Asks for specific missing information
3. Is clear and actionable
4. Helps achieve 90%+ confidence

Previous conversation:
${JSON.stringify(clarificationHistory, null, 2)}
`;

  const question = await callOpenAI([
    { role: 'system', content: systemPrompt }
  ], apiKey);
  
  res.json({
    success: true,
    data: { question }
  });
}

/**
 * POST /api/v1/goals/process-focused-clarification
 * Process clarification with focus on single component
 */
export async function processFocusedClarificationHandler(req: Request, res: Response): Promise<void> {
  const { goalId, component, userInput, previousAttempts, conversationContext } = req.body;
  
  const systemPrompt = `
You are refining the "${component}" aspect of a SMART goal through focused conversation.

Current conversation about this component:
${JSON.stringify(previousAttempts, null, 2)}

Latest user input: "${userInput}"

Evaluate:
1. Does this input provide enough clarity for the ${component} aspect?
2. What is the new confidence level (0-100)?
3. If confidence < 90%, what specific information is still needed?
4. Provide encouraging feedback about their progress

Respond in JSON:
{
  "feedback": "Encouraging message about their input",
  "improvedValue": "The refined ${component} description",
  "confidence": <0-100>,
  "needsMoreClarification": <true/false>,
  "missingDetails": ["specific things still needed"],
  "suggestedFollowUp": "Next question if needed"
}
`;

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt }
  ], apiKey);
  
  const parsed = JSON.parse(response);
  
  // Update goal in database
  await updateGoalComponent(goalId, component, parsed.improvedValue, parsed.confidence);
  
  res.json({
    success: true,
    data: parsed
  });
}
```

### 2. Smart Goal Processor Updates

```typescript
export interface FocusedClarificationRequest {
  component: keyof SMARTCriteria;
  currentValue: string;
  userInput: string;
  previousAttempts: ClarificationAttempt[];
  goalContext: string;
}

export interface FocusedClarificationResult {
  improvedValue: string;
  confidence: number;
  needsMoreClarification: boolean;
  feedback: string;
  missingDetails: string[];
  suggestedFollowUp?: string;
}

async processFocusedClarification(
  request: FocusedClarificationRequest
): Promise<FocusedClarificationResult> {
  const prompt = `
Analyze this focused clarification for the "${request.component}" component:

Goal context: "${request.goalContext}"
Current ${request.component} value: "${request.currentValue}"
User's clarification: "${request.userInput}"

Previous attempts to clarify this component:
${JSON.stringify(request.previousAttempts, null, 2)}

CRITICAL: Only update the ${request.component} component based on the user's input.
- Integrate their new information with existing value
- Calculate realistic confidence (rarely above 90% without comprehensive details)
- Identify what's still missing for 90%+ confidence
- Provide specific, actionable feedback

Respond in JSON format as specified.
`;

  const response = await this.callOpenAI(prompt);
  return JSON.parse(response);
}
```

### 3. Database Schema Updates

```prisma
model GoalClarificationSession {
  id              String   @id @default(cuid())
  goalId          String
  goal            Goal     @relation(fields: [goalId], references: [id])
  sessionId       String   @unique
  state           Json     // ClarificationState
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  focusHistory    Json[]   // Array of focus transitions
}

model ComponentClarification {
  id              String   @id @default(cuid())
  sessionId       String
  component       String
  startConfidence Float
  endConfidence   Float
  iterations      Int
  attempts        Json[]   // ClarificationAttempt[]
  createdAt       DateTime @default(now())
}
```

## API Flow Example

```typescript
// 1. Initialize clarification session
POST /api/v1/goals/:id/clarification-session/start
Response: {
  sessionId: "session_123",
  componentPriority: [
    { key: "measurable", confidence: 20, status: "in-progress" },
    { key: "timeBound", confidence: 35, status: "pending" },
    { key: "specific", confidence: 60, status: "pending" },
    { key: "achievable", confidence: 80, status: "pending" },
    { key: "relevant", confidence: 92, status: "skipped" }
  ],
  currentFocus: "measurable",
  firstQuestion: "How will you measure success for your goal?"
}

// 2. Process user response
POST /api/v1/goals/:id/clarification-session/respond
Body: {
  sessionId: "session_123",
  userInput: "I'll track my running distance weekly"
}
Response: {
  feedback: "Good start! Tracking weekly is great.",
  confidence: 45,
  needsMoreClarification: true,
  followUpQuestion: "What specific distance target are you aiming for each week?"
}

// 3. Continue until 90% confidence
POST /api/v1/goals/:id/clarification-session/respond
Body: {
  sessionId: "session_123",
  userInput: "I want to run at least 20 miles per week"
}
Response: {
  feedback: "Excellent! 20 miles per week is a clear, measurable target.",
  confidence: 92,
  needsMoreClarification: false,
  nextComponent: "timeBound",
  nextQuestion: "When do you want to achieve this 20 miles/week goal?"
}
```

## Benefits

1. **Efficiency**: Users don't waste time on already-good components
2. **Focus**: Deep dive on weak areas leads to better quality
3. **Adaptability**: System learns from each interaction
4. **User Experience**: Clear progress tracking and targeted help
5. **Quality**: Ensures each component reaches high standard

## Migration Strategy

1. Add feature flag for new clarification mode
2. Implement backend endpoints alongside existing ones
3. Create new frontend components with toggle
4. A/B test with subset of users
5. Gradually roll out based on metrics

## Success Metrics

- Average iterations per component (target: 2-3)
- Component confidence improvement per iteration (target: 20-30%)
- Overall goal quality score (target: 85%+)
- User satisfaction with clarification process
- Time to complete clarification (target: 50% reduction)