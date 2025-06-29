# User Consent Workflow Specification

## Overview
This document specifies the detailed user consent workflow for SMART goal clarification, ensuring users maintain full control and ownership throughout the process.

## Workflow States

### State 1: Initial Welcome
```yaml
state: WELCOME
user_sees:
  - Original goal displayed prominently
  - Explanation of SMART framework (optional to read)
  - Three mode options: Minimal, Guided, Exploratory
user_actions:
  - Choose interaction mode
  - Skip SMART process entirely
  - Learn more about SMART goals
next_states:
  - GOAL_ANALYSIS (if mode selected)
  - COMPLETE (if skipped)
```

### State 2: Goal Analysis
```yaml
state: GOAL_ANALYSIS
user_sees:
  - "Analyzing your goal: [original goal]"
  - Components already present (marked with ✓)
  - Components that could be clarified (marked with ?)
  - "Your goal is valid as stated"
user_actions:
  - Proceed with clarification
  - Keep goal as-is
  - Select specific components to work on
next_states:
  - COMPONENT_CLARIFICATION (if proceeding)
  - COMPLETE (if keeping as-is)
```

### State 3: Component Clarification
```yaml
state: COMPONENT_CLARIFICATION
user_sees:
  - Current component being explored
  - Open-ended question
  - "Skip this section" option
  - "I need time to think" option
  - Examples (on request only)
user_actions:
  - Answer the question
  - Skip component
  - Request examples
  - Save progress and return later
  - Go back to previous component
next_states:
  - COMPONENT_CLARIFICATION (next component)
  - REVIEW_ENHANCEMENTS (if all processed)
```

### State 4: Review Enhancements
```yaml
state: REVIEW_ENHANCEMENTS
user_sees:
  - Original goal (left side)
  - Enhanced version (right side)
  - Detailed changelog
  - Checkbox for each change
user_actions:
  - Accept all changes
  - Accept selected changes
  - Modify enhanced version
  - Keep original only
  - Request different enhancement
next_states:
  - FINAL_CONFIRMATION
```

### State 5: Final Confirmation
```yaml
state: FINAL_CONFIRMATION
user_sees:
  - Final goal statement
  - Summary of process
  - What was kept/changed
  - Next steps (optional)
user_actions:
  - Confirm and save
  - Make final edits
  - Start over
  - Export/share goal
next_states:
  - COMPLETE
```

## Consent Points

### CP1: Mode Selection Consent
```typescript
interface ModeSelectionConsent {
  timestamp: Date;
  selectedMode: 'minimal' | 'guided' | 'exploratory' | 'skip';
  userMessage: "I understand I can change or stop at any time";
  consentGiven: boolean;
}
```

### CP2: Component Processing Consent
```typescript
interface ComponentConsent {
  component: 'specific' | 'measurable' | 'achievable' | 'relevant' | 'timeBound';
  action: 'explore' | 'skip' | 'defer';
  reason?: string; // Optional reason for skipping
  timestamp: Date;
}
```

### CP3: Enhancement Acceptance Consent
```typescript
interface EnhancementConsent {
  originalGoal: string;
  enhancedGoal: string;
  acceptedChanges: {
    changeId: string;
    description: string;
    accepted: boolean;
  }[];
  finalGoal: string;
  timestamp: Date;
  userConfirmation: "I approve these changes to my goal";
}
```

## UI Components

### Consent Mode Selector
```html
<div class="consent-mode-selector">
  <h2>How would you like to explore your goal?</h2>
  <p class="user-goal">"{{ originalGoal }}"</p>
  
  <div class="mode-options">
    <button class="mode-option" data-mode="minimal">
      <h3>Minimal Guidance</h3>
      <p>Quick questions, essential components only</p>
      <span class="time-estimate">~2 minutes</span>
    </button>
    
    <button class="mode-option" data-mode="guided">
      <h3>Guided Exploration</h3>
      <p>Balanced approach with helpful prompts</p>
      <span class="time-estimate">~5 minutes</span>
    </button>
    
    <button class="mode-option" data-mode="exploratory">
      <h3>Thorough Exploration</h3>
      <p>Comprehensive questions and examples</p>
      <span class="time-estimate">~10 minutes</span>
    </button>
  </div>
  
  <button class="skip-all">
    Keep my goal exactly as it is →
  </button>
</div>
```

### Component Question Interface
```html
<div class="component-question">
  <div class="progress-indicator">
    <span class="current">Exploring: {{ componentName }}</span>
    <span class="skip-notice">You can skip any section</span>
  </div>
  
  <div class="question-content">
    <h3>{{ questionText }}</h3>
    <p class="why-asking">{{ whyWeAreAsking }}</p>
    
    <textarea 
      placeholder="Your thoughts... (or click skip below)"
      data-optional="true"
    ></textarea>
  </div>
  
  <div class="action-buttons">
    <button class="primary" data-action="continue">
      Continue with my answer
    </button>
    <button class="secondary" data-action="skip">
      Skip this question
    </button>
    <button class="tertiary" data-action="examples">
      Show me examples
    </button>
  </div>
  
  <div class="navigation">
    <button data-action="back">← Previous</button>
    <button data-action="save">Save & Resume Later</button>
  </div>
</div>
```

### Enhancement Review Interface
```html
<div class="enhancement-review">
  <h2>Review Your Goal Enhancement</h2>
  
  <div class="goal-comparison">
    <div class="original-goal">
      <h3>Your Original Goal</h3>
      <p>{{ originalGoal }}</p>
    </div>
    
    <div class="enhanced-goal">
      <h3>Enhanced Version (Optional)</h3>
      <p>{{ enhancedGoal }}</p>
    </div>
  </div>
  
  <div class="changes-list">
    <h3>Proposed Changes</h3>
    <div class="change-item" data-change-id="{{ changeId }}">
      <input type="checkbox" id="change-{{ changeId }}" checked>
      <label for="change-{{ changeId }}">
        <span class="change-type">{{ changeType }}</span>
        <span class="change-description">{{ changeDescription }}</span>
      </label>
    </div>
  </div>
  
  <div class="final-actions">
    <button class="primary" data-action="accept-selected">
      Use Selected Changes
    </button>
    <button class="secondary" data-action="keep-original">
      Keep My Original Goal
    </button>
    <button class="tertiary" data-action="edit">
      Let Me Edit
    </button>
  </div>
</div>
```

## Conversation Scripts

### Initial Welcome Script
```
Bot: Welcome! I see you want to work on: "{{ userGoal }}"

This is a great starting point! I can help you explore this goal using the SMART framework, which can make goals clearer and more actionable.

How would you like to proceed?
- 🚀 Quick exploration (2 min)
- 🧭 Guided journey (5 min)  
- 🔍 Deep dive (10 min)
- ✓ Keep my goal as-is

Remember: Your goal is valid exactly as you've stated it. This process is entirely optional and you control every step.
```

### Component Question Scripts

#### Timeframe Script (Respecting Autonomy)
```
Bot: Let's talk about timing for your goal.

Some people like having deadlines, others prefer open-ended goals. Both are perfectly valid!

For your goal: "{{ userGoal }}"

Do you have any thoughts on timing? For example:
- A specific deadline in mind?
- A general timeframe (like "this year")?
- Prefer to keep it open-ended?
- Want to set milestones instead?

[Text input area]

[Skip this question] [I need to think about this]
```

#### Achievability Script (Non-Judgmental)
```
Bot: Let's explore what might help or challenge you with this goal.

Every goal has its unique context. I'm curious about yours.

For "{{ userGoal }}":

- What resources or strengths do you have that could help?
- What challenges might you face?
- Have you done something similar before?

There's no right or wrong answer - I'm just trying to understand your situation better.

[Text input area]

[Skip this question] [Show me examples]
```

## State Transition Rules

### Rule 1: Always Allow Backwards Navigation
- Users can return to any previous state
- Previous answers are preserved
- Changes can be made without starting over

### Rule 2: Skip Means Skip
- Skipping a component moves to the next immediately
- No follow-up questions about skipped components
- Skipped components are marked but not highlighted negatively

### Rule 3: Preserve User Input Integrity
- User input is never modified without explicit consent
- Original phrasing is preserved
- Suggestions are always separate from user content

### Rule 4: Progressive Disclosure
- Advanced options hidden until requested
- Examples shown only on demand
- Detailed explanations available but not forced

## Error Handling and Edge Cases

### Edge Case 1: User Provides Vague Answers
```yaml
scenario: User answers "I don't know" to multiple questions
system_response:
  - Acknowledge uncertainty is normal
  - Offer to skip remaining questions
  - Suggest saving and returning later
  - Never pressure for more specific answers
```

### Edge Case 2: User Wants to Skip Everything
```yaml
scenario: User skips all components
system_response:
  - Confirm their goal as originally stated
  - Provide positive reinforcement
  - Offer resources for future (optional)
  - Complete process gracefully
```

### Edge Case 3: User Disputes Suggestions
```yaml
scenario: User disagrees with enhancement suggestions
system_response:
  - Immediately acknowledge their expertise
  - Offer to keep original
  - Ask what they'd prefer instead
  - No justification of system suggestions
```

## Metrics and Logging

### Consent Tracking
```typescript
interface ConsentLog {
  sessionId: string;
  userId?: string; // Optional for anonymous users
  events: ConsentEvent[];
}

interface ConsentEvent {
  timestamp: Date;
  eventType: 'mode_selected' | 'component_skipped' | 
             'enhancement_rejected' | 'changes_accepted';
  details: Record<string, any>;
  userInitiated: boolean;
}
```

### Success Metrics
- User completion rate (including skip-all)
- Component skip rate by type
- Enhancement acceptance rate
- Time spent per component
- Return user rate
- User satisfaction scores

## Privacy Considerations

### P1: Data Minimization
- Only collect what's needed for the current session
- Don't require user identification
- Allow anonymous goal setting

### P2: Transparent Data Use
- Clear statement about data handling
- Option to delete all data after session
- No sharing without explicit consent

### P3: User Control
- Export functionality for user's own records
- Clear all data option
- No persistent tracking without consent

## Implementation Notes

### Note 1: Response Timing
- Allow unlimited time for user responses
- No timeout pressures
- Save state regularly for resumption

### Note 2: Accessibility
- All skippable elements keyboard accessible
- Clear visual indicators for optional content
- Screen reader friendly consent flows

### Note 3: Mobile Considerations
- Touch-friendly skip buttons
- Simplified interface on small screens
- Easy navigation between states

## Version History
- v1.0.0 (2025-01-26): Initial user consent workflow specification