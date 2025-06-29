# Improved SMART Goal Clarification Flow Diagram

## Current Flow (Sequential)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  SPECIFIC   │ --> │ MEASURABLE  │ --> │ ACHIEVABLE  │ --> │  RELEVANT   │ --> │ TIME-BOUND  │
│  (60%)      │     │  (40%)      │     │  (80%)      │     │  (95%)      │     │  (30%)      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     Ask                  Ask                 Ask                 Ask                 Ask
     once                 once                once                once                once
```

## Improved Flow (Priority-Based with Focus)
```
INITIALIZATION:
┌─────────────────────────────────────────────────────────────────┐
│  Analyze Goal → Sort by Confidence → Skip ≥90% → Start Lowest  │
└─────────────────────────────────────────────────────────────────┘
                                |
                                ▼
                    ┌─────────────────────┐
                    │ Component Priority: │
                    │ 1. MEASURABLE (40%) │ ← Current Focus
                    │ 2. TIME-BOUND (30%) │
                    │ 3. SPECIFIC   (60%) │
                    │ 4. ACHIEVABLE (80%) │
                    │ 5. RELEVANT   (95%) │ ← Skipped
                    └─────────────────────┘

FOCUSED IMPROVEMENT LOOP:
┌─────────────────┐
│   MEASURABLE    │
│   Start: 40%    │
└────────┬────────┘
         │
         ▼
    ┌─────────┐     User: "Track weekly progress"
    │ Ask Q1  │ --> 
    └────┬────┘     AI: "Good! What metrics?" (55%)
         │
         ▼
    ┌─────────┐     User: "Miles run and pace"
    │ Ask Q2  │ --> 
    └────┬────┘     AI: "Great! Specific targets?" (70%)
         │
         ▼
    ┌─────────┐     User: "20 miles/week, 8:30 pace"
    │ Ask Q3  │ --> 
    └────┬────┘     AI: "Perfect! Clear metrics!" (92%)
         │
         ▼
    ┌─────────┐
    │ ≥90%?   │ --> YES --> Move to TIME-BOUND (30%)
    └─────────┘

COMPLETION CHECK:
┌──────────────────────────────────────────────┐
│  All components ≥90% or reviewed?            │
│  ✓ MEASURABLE (92%)                          │
│  ✓ TIME-BOUND (91%)                          │
│  ✓ SPECIFIC   (93%)                          │
│  ✓ ACHIEVABLE (90%)                          │
│  ✓ RELEVANT   (95%) [Pre-skipped]            │
│                                              │
│  Overall Goal Quality: 92.2% ✓               │
└──────────────────────────────────────────────┘
```

## State Transitions

```
                    ┌─────────────┐
                    │   PENDING   │
                    └──────┬──────┘
                           │
                     Select for focus
                           │
                           ▼
                    ┌─────────────┐
                    │IN-PROGRESS  │◄──┐
                    └──────┬──────┘   │
                           │          │
                      Confidence      │ Need more
                        ≥90%         │ clarification
                           │          │
                           ▼          │
                    ┌─────────────┐   │
                    │  COMPLETED  │   │
                    └─────────────┘   │
                           │          │
                           └──────────┘

Special Cases:
┌─────────────┐
│   SKIPPED   │ (Initial confidence ≥90%)
└─────────────┘

┌─────────────┐
│  REVIEWED   │ (Max iterations reached without 90%)
└─────────────┘
```

## UI Component Layout

```
┌─────────────────────────────────────────────────────────┐
│  SMART Goal Builder                          [Progress] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Current Focus: MEASURABLE (Working on it...)          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ [Bot]: Let's make your goal measurable. You       │ │
│  │        mentioned tracking weekly. What specific    │ │
│  │        metrics will you use?                       │ │
│  │                                                    │ │
│  │ [You]: Miles run and average pace per mile       │ │
│  │                                                    │ │
│  │ [Bot]: Great choices! Now, what are your target  │ │
│  │        numbers for these metrics?                 │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Type your answer...]                      [Send]      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Progress Tracker:                                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ◉ Measurable  [████████░░] 75%  ← Current        │ │
│  │ ○ Time-bound  [███░░░░░░░] 30%                   │ │
│  │ ○ Specific    [██████░░░░] 60%                   │ │
│  │ ○ Achievable  [████████░░] 80%                   │ │
│  │ ✓ Relevant    [██████████] 95%  ← Skipped        │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Decision Tree for Component Focus

```
                    Start
                      │
                      ▼
            ┌─────────────────┐
            │ Get all scores  │
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ Any score <90%? │
            └────┬──────┬─────┘
                YES     NO
                 │       │
                 ▼       ▼
         ┌──────────┐  ┌──────────┐
         │ Sort by  │  │ Complete │
         │ score ↑  │  └──────────┘
         └────┬─────┘
              │
              ▼
         ┌──────────────┐
         │Select lowest │
         │   scorer     │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │Generate smart│
         │  question    │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Get user     │
         │   input      │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │Process input │
         │ Update score │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Score ≥90%?  │
         └──┬───────┬───┘
           YES      NO
            │        │
            │        ▼
            │   ┌────────────┐
            │   │ Max tries? │
            │   └──┬─────┬───┘
            │     YES    NO
            │      │      │
            │      ▼      │
            │   Mark as   │
            │   Reviewed  │
            │      │      │
            └──────┴──────┘
                   │
                   ▼
              Back to start
```

## Example Conversation Flow

### Traditional (Sequential):
```
Bot: "Let's make your goal Specific..."
User: "I want to run more"
Bot: "Good! Now let's make it Measurable..." [Moves on regardless]
User: "Track my runs"
Bot: "Great! Now let's make it Achievable..." [Moves on again]
```

### Improved (Focused):
```
Bot: "I notice your goal needs more measurable details. How will you track 'run more'?"
User: "Track my runs"
Bot: "That's a start! What specific metrics will you track? (Still at 45% clarity)"
User: "Distance and time"
Bot: "Good! What are your target numbers for distance and time? (Now at 70%)"
User: "20 miles per week, under 3 hours total"
Bot: "Perfect! That's very measurable - 20 miles/week in under 3 hours. (92% - Moving to next area)"
```

## Benefits Visualization

```
Time to Complete:
Old: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 15 min
New: ━━━━━━━━━━━━━━━━━━━              8 min

Quality Score:
Old: ████████████████░░░░░░░░░░░░░░░░ 65%
New: ████████████████████████████████ 92%

User Satisfaction:
Old: ★★★☆☆ (3.2/5) "Felt repetitive"
New: ★★★★★ (4.8/5) "Focused on what mattered"
```