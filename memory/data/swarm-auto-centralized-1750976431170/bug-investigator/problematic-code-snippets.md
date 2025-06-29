# Problematic Code Snippets

## 1. Frontend: Sending All Components Instead of Just Current
**File:** `/workspaces/personalEA/testing/goal-strategy-test/src/components/ChatClarification.tsx`
**Lines:** 375-407

```javascript
// PROBLEM: Collects clarifications for ALL components over time
const newClarifications = {
  ...collectedClarifications,
  [currentComponent.key]: userInput
}
setCollectedClarifications(newClarifications)

// Later...
// PROBLEM: Sends ALL components, including empty ones
const response = await goalAPI.clarifyGoal(
  goal.id, 
  newClarifications,  // Contains {"specific": "user input", "measurable": "", "achievable": "", ...}
  goalContext,
  conversationHistory
)
```

## 2. API: Transforming Empty Values Into Clarifications
**File:** `/workspaces/personalEA/testing/goal-strategy-test/src/services/api.ts`
**Lines:** 255-263

```javascript
// PROBLEM: Maps ALL components, including empty ones
const response = await api.post<APIResponse<Goal>>(`/goals/${goalId}/clarify`, {
  clarifications: Object.entries(clarifications).map(([key, value]) => ({
    question: `What is the ${key} aspect of your goal?`,
    answer: value,  // Empty string for components not yet addressed!
    smartCriterion: key
  })),
  goalContext,
  conversationHistory
})
```

## 3. Backend: Processing All Clarifications Together
**File:** `/workspaces/personalEA/services/goal-strategy/src/routes/goals.ts`
**Lines:** 227-233

```javascript
// PROBLEM: Processes ALL clarifications, including empty ones
const result = await smartGoalProcessor.processClarifications(
  goal.rawGoal || goal.title,
  goal.smartCriteria as any,
  clarificationAnswers,  // Array includes items with empty answers
  userApiKey
);

// PROBLEM: Completely replaces ALL smart criteria
const updatedGoal = await prisma.goal.update({
  where: { id: goalId },
  data: {
    title: result.smartGoal,
    smartCriteria: result.smartCriteria as any,  // Overwrites everything!
    updatedAt: new Date()
  }
});
```

## 4. AI Prompt: Conflicting Instructions
**File:** `/workspaces/personalEA/services/goal-strategy/src/services/smart-goal-processor.ts`
**Lines:** 300-306

```javascript
// The prompt says this:
User's Latest Input:
${answers.map(a => `Component: ${a.smartCriterion}\nUser said: "${a.answer}"`).join('\n\n')}

// PROBLEM: When answer is empty string, it looks like:
// Component: measurable
// User said: ""
// 
// AI interprets this as "user provided no information" and sets low confidence
```

## 5. AI Response Instructions
**File:** `/workspaces/personalEA/services/goal-strategy/src/services/smart-goal-processor.ts`
**Lines:** 322-335

```javascript
// Instructions say to keep confidence low, but don't handle empty answers:
Respond in JSON format:
{
  "smartGoal": "Keep original goal unless user explicitly changed it",
  "smartCriteria": {
    "specific": { "value": "Only update if user addressed this", "confidence": 0.3-0.5, "missing": ["what's still needed"] },
    "measurable": { "value": "Only update if user addressed this", "metrics": [], "confidence": 0.3, "missing": ["metrics needed"] },
    // ... all components get low confidence
  }
}
```

## What Should Happen vs What Actually Happens

### What Should Happen:
1. User clarifies "specific" component
2. Only "specific" is sent to backend
3. Only "specific" is updated in the database
4. Other components retain their existing scores

### What Actually Happens:
1. User clarifies "specific" component
2. ALL components are sent to backend (4 with empty answers)
3. AI processes all 5 components
4. AI sees empty answers and sets low confidence for those
5. ALL components are overwritten in database
6. Previous progress is lost

## Example Data Flow

### Current Broken Flow:
```javascript
// User input for specific component
userInput: "hobby racing at local track"

// Frontend sends:
clarifications: {
  "specific": "hobby racing at local track",
  "measurable": "",
  "achievable": "",
  "relevant": "",
  "timeBound": ""
}

// Backend receives array:
[
  { question: "What is the specific aspect?", answer: "hobby racing at local track", smartCriterion: "specific" },
  { question: "What is the measurable aspect?", answer: "", smartCriterion: "measurable" },
  { question: "What is the achievable aspect?", answer: "", smartCriterion: "achievable" },
  { question: "What is the relevant aspect?", answer: "", smartCriterion: "relevant" },
  { question: "What is the timeBound aspect?", answer: "", smartCriterion: "timeBound" }
]

// AI response resets all confidences:
{
  "specific": { "confidence": 0.5 },    // Slight improvement
  "measurable": { "confidence": 0.2 },  // Reset to low!
  "achievable": { "confidence": 0.2 },  // Reset to low!
  "relevant": { "confidence": 0.2 },    // Reset to low!
  "timeBound": { "confidence": 0.2 }    // Reset to low!
}
```

### What Should Happen:
```javascript
// Frontend should send ONLY:
clarifications: {
  "specific": "hobby racing at local track"
}

// Backend should receive ONLY:
[
  { question: "What is the specific aspect?", answer: "hobby racing at local track", smartCriterion: "specific" }
]

// AI should update ONLY specific, preserving others:
{
  "specific": { "confidence": 0.7 },    // Improved!
  "measurable": { "confidence": 0.6 },  // Preserved existing
  "achievable": { "confidence": 0.5 },  // Preserved existing
  "relevant": { "confidence": 0.4 },    // Preserved existing
  "timeBound": { "confidence": 0.3 }    // Preserved existing
}
```