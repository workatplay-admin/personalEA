# SMART Goal Clarification Flow Requirements

## Overview
The SMART goal clarification system should focus on improving low-confidence aspects rather than cycling through all components sequentially. It should continue refining each aspect until it reaches high confidence (90%+).

## Current Issues
1. System cycles through SMART aspects one by one in fixed order
2. Moves to next aspect regardless of current aspect's confidence level
3. Asks questions about aspects that are already well-defined (>90% confidence)
4. No iterative refinement of low-confidence aspects

## Requirements

### 1. Confidence-Based Question Prioritization

**1.1 Initial Assessment**
- When starting clarification, assess all SMART components' confidence levels
- Sort components by confidence (lowest first)
- Skip components with confidence >= 90%

**1.2 Dynamic Question Generation**
- Generate questions only for components with confidence < 90%
- Questions should be contextual based on:
  - Current confidence level (more specific for higher confidence)
  - User's previous responses
  - Goal context

### 2. Iterative Refinement Loop

**2.1 Single-Component Focus**
- Focus on one component at a time until it reaches 90%+ confidence
- After each user response:
  - Re-evaluate the component's confidence
  - If < 90%, generate follow-up questions for the same component
  - If >= 90%, move to next low-confidence component

**2.2 Confidence Calculation**
- Backend should return updated confidence after each clarification
- Include reasoning for confidence level
- Track confidence history for each component

### 3. Intelligent Component Selection

**3.1 Priority Order**
- Primary: Components with lowest confidence
- Secondary: Components that affect others (e.g., Specific affects Measurable)
- Skip components already at 90%+ confidence

**3.2 Component Dependencies**
- Recognize dependencies between components:
  - Specific → Measurable (hard to measure vague goals)
  - Measurable → Time-bound (deadlines depend on metrics)
  - All → Achievable (achievability depends on clarity)

### 4. User Experience Enhancements

**4.1 Progress Indication**
- Show confidence levels for each component visually
- Indicate which component is being refined
- Show overall progress toward completion

**4.2 Context Preservation**
- Maintain conversation context within each component
- Reference previous responses when asking follow-ups
- Provide examples based on user's specific goal

**4.3 Flexible Navigation**
- Allow users to skip components (with warning about confidence)
- Enable returning to previous components
- Support "I don't know" responses with helpful suggestions

### 5. Backend API Requirements

**5.1 Enhanced Clarification Endpoint**
```typescript
interface ClarificationRequest {
  goalId: string;
  componentKey: string;
  userResponse: string;
  conversationHistory: Message[];
}

interface ClarificationResponse {
  updatedComponent: {
    value: string;
    confidence: number;
    reasoning: string;
  };
  needsFollowUp: boolean;
  followUpQuestion?: string;
  suggestions?: string[];
  componentComplete: boolean; // true if >= 90%
}
```

**5.2 Confidence Tracking**
- Store confidence history for each component
- Return confidence deltas after updates
- Provide confidence reasoning

**5.3 Smart Question Generation**
- Questions should adapt based on:
  - Current confidence level
  - Number of refinement attempts
  - User response quality
  - Goal complexity

### 6. Completion Criteria

**6.1 Component Completion**
- Component is complete when confidence >= 90%
- Or user explicitly skips after warning
- Or maximum iterations reached (configurable, default: 5)

**6.2 Overall Completion**
- All components >= 90% confidence
- Or all components addressed (some may be skipped)
- Minimum overall confidence: 85%

### 7. Implementation Details

**7.1 Frontend Changes (ChatClarification.tsx)**
- Replace sequential componentIndex with confidence-based selection
- Add confidence tracking state
- Implement iterative questioning for single component
- Update UI to show confidence levels

**7.2 Backend Changes**
- Enhance `/clarify` endpoint to support single-component refinement
- Add confidence calculation logic
- Implement smart follow-up question generation
- Track refinement history

**7.3 AI Prompt Engineering**
- Design prompts that understand refinement context
- Generate increasingly specific questions
- Recognize when sufficient detail is provided
- Avoid over-clarification

## Success Metrics
1. Average clarification sessions reach 90%+ confidence
2. Reduced number of questions for well-defined goals
3. Improved goal quality scores
4. User satisfaction with clarification process
5. Time to complete clarification (should be faster for clear goals)

## Example Flow

1. User enters: "I want to learn guitar"
2. Initial assessment:
   - Specific: 30% (what type, style, level?)
   - Measurable: 20% (no success metrics)
   - Achievable: 50% (unclear commitment)
   - Relevant: 70% (personal interest implied)
   - Time-bound: 10% (no timeline)

3. System focuses on Time-bound (lowest):
   - Q1: "When would you like to achieve this goal?"
   - A1: "By the end of this year"
   - Confidence: 40% (still vague)
   - Q2: "That gives you [X months]. What specific milestone would you want to reach by then?"
   - A2: "I want to play 5 complete songs"
   - Confidence: 85% (good, but could be more specific)
   - Q3: "Great! To help you track progress, when would you like to learn your first song?"
   - A3: "First song by end of March"
   - Confidence: 92% ✓ (component complete)

4. Move to Measurable (next lowest)...

## Technical Considerations
1. Backwards compatibility with existing goal data
2. Performance impact of iterative refinement
3. API rate limiting for AI calls
4. Caching strategies for repeated questions
5. Handling edge cases (very vague goals, expert users)