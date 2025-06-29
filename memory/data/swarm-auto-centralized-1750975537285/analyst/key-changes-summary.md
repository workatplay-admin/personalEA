# Key Changes Summary: SMART Goal Clarification Flow

## Problem Statement
Current system asks questions for ALL SMART components sequentially, even those already well-defined (90%+ confidence).

## Solution
Implement confidence-based clarification that focuses only on low-confidence aspects until they reach 90%+ confidence.

## Critical Code Changes

### 1. Frontend: ChatClarification.tsx
**Current Logic (Lines 143-185):**
```typescript
// Sequential processing
const startNextComponent = async () => {
  await startNextComponentWithIndex(componentIndex)
}
// Always moves to next component after response
```

**New Logic Needed:**
```typescript
// Confidence-based selection
const selectNextComponent = async () => {
  const lowConfidenceComponents = SMART_COMPONENTS.filter(
    comp => goal.criteria[comp.key].confidence < 0.9
  ).sort((a, b) => 
    goal.criteria[a.key].confidence - goal.criteria[b.key].confidence
  );
  
  if (lowConfidenceComponents.length === 0) {
    completeChat();
    return;
  }
  
  const component = lowConfidenceComponents[0];
  await refineComponent(component);
}

// Iterative refinement
const refineComponent = async (component) => {
  // Keep refining same component until confidence >= 0.9
  while (goal.criteria[component.key].confidence < 0.9 && attempts < MAX_ATTEMPTS) {
    await askComponentQuestion(component);
    // Wait for response and check new confidence
  }
}
```

### 2. Backend: goals.ts clarify endpoint
**Current Behavior:**
- Processes all clarifications at once
- No confidence-based logic

**New Behavior Needed:**
```typescript
// Single component refinement
if (clarifications.componentKey) {
  // Process single component
  const result = await refineSpecificComponent(
    goalId, 
    clarifications.componentKey,
    clarifications.userResponse
  );
  
  return {
    updatedComponent: result.component,
    needsFollowUp: result.confidence < 0.9,
    followUpQuestion: result.followUpQuestion,
    componentComplete: result.confidence >= 0.9
  };
}
```

### 3. AI Prompt Engineering: smart-goal-processor.ts
**Add Iterative Refinement Context:**
```typescript
const buildIterativeRefinementPrompt = (
  component: string,
  currentValue: string,
  currentConfidence: number,
  userResponse: string,
  attemptNumber: number
) => {
  return `
  Component: ${component}
  Current Value: ${currentValue}
  Current Confidence: ${currentConfidence}
  Refinement Attempt: ${attemptNumber}
  User's Latest Input: ${userResponse}
  
  IMPORTANT: We're focusing on getting this component to 90%+ confidence.
  - If confidence < 90%, ask a more specific follow-up question
  - Reference their previous response
  - Don't move to other components
  `;
}
```

## Implementation Priority
1. **Phase 1**: Modify frontend to check confidence before asking questions
2. **Phase 2**: Update backend to support single-component refinement  
3. **Phase 3**: Implement iterative refinement loop
4. **Phase 4**: Add UI indicators for confidence levels

## Quick Wins
1. Skip components with confidence >= 90% (immediate improvement)
2. Sort components by confidence (better user experience)
3. Show confidence levels in UI (transparency)

## Testing Scenarios
1. Well-defined goal: Should skip most questions
2. Vague goal: Should iterate on lowest confidence aspects
3. Mixed clarity: Should focus on unclear parts only