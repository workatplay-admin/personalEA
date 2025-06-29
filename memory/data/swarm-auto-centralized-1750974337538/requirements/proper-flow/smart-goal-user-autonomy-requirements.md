# SMART Goal User Autonomy Requirements

## Overview
This document defines requirements for a SMART goal clarification process that respects user autonomy and avoids making assumptions about user intentions, timeframes, or capabilities.

## Core Principles

### 1. User Consent and Control
- **P1.1**: The system MUST NOT automatically transform or augment user goals without explicit consent
- **P1.2**: Users MUST have the option to keep their original goal statement unchanged
- **P1.3**: Each modification or suggestion MUST be presented as an option, not an automatic change
- **P1.4**: Users MUST be able to skip any SMART component they don't want to define

### 2. No Assumed Timeframes
- **P2.1**: The system MUST NOT add timeframes without explicit user input
- **P2.2**: Suggested timeframes MUST be presented as questions, not assumptions
- **P2.3**: Users MUST be able to proceed without defining a timeframe if they choose
- **P2.4**: Time-related language like "within 30 days" or "by next month" MUST NOT be automatically inserted

### 3. User-Driven Achievability Assessment
- **P3.1**: The system MUST ask users about their resources and constraints, not assume them
- **P3.2**: Achievability assessment MUST be based on user-provided information
- **P3.3**: The system MUST NOT judge whether a goal is "too ambitious" without user context
- **P3.4**: Questions about achievability MUST be open-ended and exploratory

### 4. Relevance Through User Context
- **P4.1**: The system MUST ask users why the goal matters to them personally
- **P4.2**: Relevance MUST be determined by the user's stated values and priorities
- **P4.3**: The system MUST NOT assume what should be relevant to the user
- **P4.4**: Questions about relevance MUST explore user's broader life goals

## Functional Requirements

### FR1: Goal Input and Analysis
- **FR1.1**: System SHALL accept raw goal input without immediate transformation
- **FR1.2**: System SHALL analyze the goal to identify existing SMART components
- **FR1.3**: System SHALL NOT modify the original goal during analysis
- **FR1.4**: System SHALL present analysis results as observations, not corrections

### FR2: Interactive Clarification Process
- **FR2.1**: System SHALL use conversational prompts to gather information
- **FR2.2**: System SHALL allow users to provide partial information
- **FR2.3**: System SHALL support "I don't know" or "I need to think about this" responses
- **FR2.4**: System SHALL offer examples without imposing them

### FR3: Component-Specific Requirements

#### FR3.1: Specific Component
- **FR3.1.1**: Ask "What exactly would you like to accomplish?"
- **FR3.1.2**: If user's goal is already specific, acknowledge it
- **FR3.1.3**: Offer clarifying questions only if genuinely needed
- **FR3.1.4**: Accept user's level of specificity as valid

#### FR3.2: Measurable Component
- **FR3.2.1**: Ask "How would you like to track your progress?"
- **FR3.2.2**: Offer measurement suggestions without requiring them
- **FR3.2.3**: Allow qualitative measures if user prefers
- **FR3.2.4**: Support user-defined success criteria

#### FR3.3: Achievable Component
- **FR3.3.1**: Ask "What resources do you have available?"
- **FR3.3.2**: Ask "What challenges might you face?"
- **FR3.3.3**: Let user assess their own capability
- **FR3.3.4**: Support aspirational goals if user acknowledges risks

#### FR3.4: Relevant Component
- **FR3.4.1**: Ask "Why is this goal important to you?"
- **FR3.4.2**: Ask "How does this fit with your other priorities?"
- **FR3.4.3**: Accept user's personal reasons as valid
- **FR3.4.4**: Don't impose external relevance criteria

#### FR3.5: Time-bound Component
- **FR3.5.1**: Ask "When would you like to achieve this?" (not "When will you...")
- **FR3.5.2**: Offer time estimation help only if requested
- **FR3.5.3**: Accept "no specific deadline" as a valid response
- **FR3.5.4**: Support flexible or milestone-based timing

### FR4: User Consent Workflow
- **FR4.1**: System SHALL present original and enhanced goal side-by-side
- **FR4.2**: System SHALL require explicit approval for any changes
- **FR4.3**: System SHALL allow selective adoption of suggestions
- **FR4.4**: System SHALL support saving both original and enhanced versions

### FR5: Validation and Feedback
- **FR5.1**: System SHALL validate user input without judgment
- **FR5.2**: System SHALL provide encouraging feedback
- **FR5.3**: System SHALL avoid prescriptive language
- **FR5.4**: System SHALL celebrate user's ownership of their goal

## Non-Functional Requirements

### NFR1: User Experience
- **NFR1.1**: Interface MUST clearly distinguish between user input and system suggestions
- **NFR1.2**: Language MUST be supportive and non-prescriptive
- **NFR1.3**: Process MUST be interruptible and resumable
- **NFR1.4**: System MUST remember user preferences

### NFR2: Accessibility
- **NFR2.1**: System MUST support users who need more time to think
- **NFR2.2**: System MUST accommodate different goal-setting styles
- **NFR2.3**: System MUST be culturally sensitive in examples
- **NFR2.4**: System MUST support multiple interaction modes

### NFR3: Privacy and Trust
- **NFR3.1**: System MUST NOT store personal information without consent
- **NFR3.2**: System MUST be transparent about how data is used
- **NFR3.3**: System MUST allow anonymous goal setting
- **NFR3.4**: System MUST protect user's goal information

## User Interface Requirements

### UI1: Visual Design
- **UI1.1**: Original goal MUST remain visible throughout process
- **UI1.2**: User inputs MUST be visually distinct from suggestions
- **UI1.3**: Optional elements MUST be clearly marked
- **UI1.4**: Progress indicators MUST show skippable steps

### UI2: Interaction Patterns
- **UI2.1**: Each SMART component MUST have a "Skip" option
- **UI2.2**: Users MUST be able to go back and modify previous answers
- **UI2.3**: "Help" options MUST provide examples without auto-filling
- **UI2.4**: Save/Resume functionality MUST be prominent

### UI3: Language and Tone
- **UI3.1**: Use "would you like" instead of "you should"
- **UI3.2**: Use "could" instead of "must" for suggestions
- **UI3.3**: Acknowledge user expertise about their own situation
- **UI3.4**: Avoid authoritative or prescriptive language

## API Requirements

### API1: Request Structure
```typescript
interface GoalClarificationRequest {
  originalGoal: string;
  mode: 'exploratory' | 'guided' | 'minimal';
  userContext?: {
    previousGoals?: string[];
    preferences?: {
      skipTimebound?: boolean;
      preferQualitative?: boolean;
      allowAspirational?: boolean;
    };
  };
}
```

### API2: Response Structure
```typescript
interface GoalClarificationResponse {
  analysis: {
    originalGoal: string;
    identifiedComponents: {
      specific?: { present: boolean; description?: string };
      measurable?: { present: boolean; description?: string };
      achievable?: { present: boolean; description?: string };
      relevant?: { present: boolean; description?: string };
      timeBound?: { present: boolean; description?: string };
    };
  };
  suggestions: {
    component: string;
    question: string;
    whyAsking: string;
    optional: boolean;
    examples?: string[];
  }[];
  enhancement?: {
    suggested: string;
    changes: string[];
    requiresApproval: true;
  };
}
```

## Conversation Flow Requirements

### CF1: Welcome and Introduction
- **CF1.1**: Explain that the process is optional and user-driven
- **CF1.2**: Clarify that original goal is valid as-is
- **CF1.3**: Set expectation that user controls the process
- **CF1.4**: Offer different modes (quick, thorough, minimal)

### CF2: Component Exploration
- **CF2.1**: Start with what's already present in the goal
- **CF2.2**: Ask open-ended questions for missing components
- **CF2.3**: Accept partial or uncertain answers
- **CF2.4**: Provide examples only when requested

### CF3: Summary and Confirmation
- **CF3.1**: Show original goal and any enhancements separately
- **CF3.2**: Itemize each suggested change
- **CF3.3**: Allow selective acceptance of changes
- **CF3.4**: Confirm user satisfaction with final result

## Implementation Checkpoints

### Checkpoint 1: Initial Analysis
- Verify NO automatic transformation occurs
- Confirm original goal is preserved
- Check that analysis is descriptive, not prescriptive

### Checkpoint 2: Question Generation
- Ensure questions are open-ended
- Verify no assumptions in question wording
- Confirm timeframe questions don't assume deadlines

### Checkpoint 3: User Response Handling
- Validate that "skip" options work correctly
- Ensure partial responses are accepted
- Verify no forced completion of components

### Checkpoint 4: Enhancement Generation
- Confirm enhancements are marked as suggestions
- Verify user approval is required
- Check that original can be kept unchanged

### Checkpoint 5: Final Output
- Ensure both versions are available
- Verify user choice is respected
- Confirm no unauthorized modifications

## Testing Requirements

### T1: Autonomy Tests
- **T1.1**: Test with users who want no timeframe
- **T1.2**: Test with highly aspirational goals
- **T1.3**: Test with users who skip components
- **T1.4**: Test with minimalist goal statements

### T2: Language Tests
- **T2.1**: Verify no prescriptive language
- **T2.2**: Check for assumed timeframes
- **T2.3**: Ensure suggestions are clearly optional
- **T2.4**: Validate encouraging tone

### T3: Workflow Tests
- **T3.1**: Test skip functionality for each component
- **T3.2**: Test partial completion scenarios
- **T3.3**: Test going back to modify answers
- **T3.4**: Test save/resume functionality

## Success Metrics

### M1: User Autonomy Metrics
- % of users who keep original goal unchanged
- % of users who skip at least one component
- % of users who report feeling in control
- Number of assumptions reported by users

### M2: Quality Metrics
- User satisfaction with final goal
- Completion rate (with skip options counted)
- Time to complete (without pressure)
- Return user rate

### M3: Component Metrics
- % of each component marked as optional
- Distribution of skipped components
- User-provided vs suggested content ratio
- Modification acceptance rate

## Appendix: Anti-Patterns to Avoid

### A1: Timeframe Anti-Patterns
- ❌ "You should complete this within 30 days"
- ❌ "Most people achieve this in 3 months"
- ❌ "This goal will take approximately..."
- ✅ "When would you like to achieve this?"
- ✅ "Do you have a timeline in mind?"

### A2: Achievability Anti-Patterns
- ❌ "This goal seems too ambitious"
- ❌ "You should start with something smaller"
- ❌ "This isn't realistic given..."
- ✅ "What resources do you have?"
- ✅ "What might make this challenging?"

### A3: Relevance Anti-Patterns
- ❌ "This doesn't align with best practices"
- ❌ "You should focus on..."
- ❌ "This isn't as important as..."
- ✅ "Why does this matter to you?"
- ✅ "How does this fit your priorities?"

### A4: Transformation Anti-Patterns
- ❌ Automatically adding metrics
- ❌ Inserting assumed deadlines
- ❌ "Correcting" user language
- ✅ Suggesting options
- ✅ Asking for clarification

## Version History
- v1.0.0 (2025-01-26): Initial requirements for user autonomy in SMART goal clarification