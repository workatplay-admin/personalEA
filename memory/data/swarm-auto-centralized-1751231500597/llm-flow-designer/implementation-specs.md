# LLM-Centric Implementation Specifications

## Executive Summary
Transform PersonalEA from a frontend-heavy application to an LLM-first architecture where the AI handles all conversation logic, state management, and decision-making while the app serves purely as a presentation layer.

## Core Architecture Changes

### 1. Single LLM Conversation Endpoint
```typescript
// Before: Multiple endpoints with specific logic
POST /api/goals/translate
POST /api/goals/clarify
POST /api/goals/update

// After: Single conversation endpoint
POST /api/conversation
{
  "message": "user input",
  "conversation_id": "uuid",
  "context": {
    "mode": "goal_refinement"
  }
}
```

### 2. LLM Prompt Template
```
You are an AI assistant helping users create SMART goals. You manage the entire conversation flow and state.

CURRENT CONVERSATION STATE:
{conversation_history}

USER INPUT: {user_message}

YOUR RESPONSIBILITIES:
1. Analyze the user's goal and identify SMART criteria
2. Track confidence for each criterion (0-1 scale)
3. Decide what action to take next
4. Generate appropriate UI elements

RESPONSE FORMAT:
{
  "action_type": "ask_question|show_example|update_progress|complete",
  "conversation_state": {
    "current_goal": "refined goal text",
    "smart_criteria": {
      "specific": {"value": "", "confidence": 0.0, "missing": []},
      "measurable": {"value": "", "confidence": 0.0, "missing": []},
      "achievable": {"value": "", "confidence": 0.0, "missing": []},
      "relevant": {"value": "", "confidence": 0.0, "missing": []},
      "timeBound": {"value": "", "confidence": 0.0, "missing": []}
    },
    "overall_confidence": 0.0,
    "current_focus": "specific",
    "conversation_phase": "clarifying"
  },
  "display_elements": [
    {
      "type": "message",
      "content": "Your response here",
      "metadata": {
        "sender": "bot",
        "smart_component": "specific"
      }
    }
  ],
  "ui_instructions": {
    "show_progress": true,
    "enable_input": true
  }
}
```

### 3. Simplified Frontend Component
```tsx
// New stateless ChatInterface component
function ChatInterface({ conversationId }) {
  const [response, setResponse] = useState(null);
  
  const sendMessage = async (message) => {
    const result = await api.conversation.send({
      message,
      conversation_id: conversationId
    });
    setResponse(result);
  };
  
  // Simply render what LLM tells us to render
  return (
    <div>
      {response?.display_elements.map(element => (
        <RenderElement key={element.id} {...element} />
      ))}
      
      {response?.ui_instructions.enable_input && (
        <InputForm onSubmit={sendMessage} />
      )}
    </div>
  );
}
```

## Migration Strategy

### Phase 1: Parallel Implementation
1. Create new `/api/conversation` endpoint
2. Implement comprehensive LLM prompt
3. Build new simplified UI component
4. Run in parallel with existing system for testing

### Phase 2: Gradual Transition
1. Route 10% of traffic to new system
2. Monitor performance and user satisfaction
3. Gradually increase traffic percentage
4. Maintain fallback to old system

### Phase 3: Complete Migration
1. Deprecate old endpoints
2. Remove complex frontend state management
3. Archive old components
4. Update documentation

## LLM Conversation Management

### Initial User Input
```json
{
  "message": "I want to lose weight",
  "conversation_id": "new",
  "context": {
    "mode": "goal_refinement",
    "user_preferences": {
      "learning_mode": true,
      "show_examples": true
    }
  }
}
```

### LLM Analysis and Response
The LLM analyzes the input and identifies:
- ❌ Not Specific: What kind of weight? How will you lose it?
- ❌ Not Measurable: How much weight?
- ❌ Not Achievable: No context about current situation
- ❌ Not Relevant: Why is this important?
- ❌ Not Time-bound: By when?

Returns structured response asking for specific information.

### Continuous Refinement
Each user response is processed by the LLM which:
1. Updates its internal state
2. Recalculates confidence scores
3. Decides next action
4. Generates appropriate UI elements

## Technical Implementation Details

### Backend Changes
```typescript
// New conversation handler
export async function handleConversation(req: Request): Promise<Response> {
  const { message, conversation_id, context } = req.body;
  
  // Get conversation history
  const history = await getConversationHistory(conversation_id);
  
  // Call LLM with comprehensive prompt
  const llmResponse = await callOpenAI({
    model: "gpt-4",
    messages: [
      { role: "system", content: SMART_GOAL_SYSTEM_PROMPT },
      ...history,
      { role: "user", content: message }
    ],
    response_format: { type: "json_object" }
  });
  
  // Parse and validate response
  const response = validateLLMResponse(llmResponse);
  
  // Store in conversation history
  await updateConversationHistory(conversation_id, message, response);
  
  return response;
}
```

### Frontend Simplification
Remove:
- Component state management for SMART criteria
- Confidence calculation logic
- Question generation logic
- Flow control logic
- Progress tracking logic

Keep:
- UI rendering based on instructions
- User input handling
- Visual styling
- Error handling

## Benefits of This Approach

### For Development
- Single source of truth (LLM)
- Easier to modify behavior
- Reduced testing complexity
- Cleaner codebase

### For Users
- More natural conversations
- Better context awareness
- Adaptive responses
- Consistent experience

### For Maintenance
- Fewer moving parts
- Centralized logic
- Easier debugging
- Simplified updates

## Example Conversation Flow

1. **User**: "I want to get fit"
   - **LLM**: Analyzes vague goal, asks about specific fitness aspects

2. **User**: "I want to run a marathon"
   - **LLM**: Updates goal, asks about timeframe and current fitness

3. **User**: "In 6 months, I currently run 5k twice a week"
   - **LLM**: High confidence in T, M, A. Asks about relevance

4. **User**: "For my 40th birthday challenge"
   - **LLM**: All criteria met, presents final SMART goal

## Performance Considerations

### Optimizations
1. Stream responses for better UX
2. Cache conversation history in Redis
3. Use GPT-4-turbo for faster responses
4. Implement request queuing

### Monitoring
- Track LLM response times
- Monitor token usage
- Measure user satisfaction
- Track conversation completion rates