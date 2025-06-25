# User Flow Analysis - Breaking Points Diagram

## Complete User Journey Flow

```mermaid
flowchart TD
    Start([User Starts]) --> Config[Step 0: API Config]
    Config -->|onConfigured| GoalInput[Step 1: Goal Input]
    GoalInput -->|handleGoalSubmit| SmartGoal[Step 2: SMART Translation]
    
    SmartGoal --> ChatFlow{Chat Clarification}
    ChatFlow -->|component-question API| CompQ[Generate Question]
    ChatFlow -->|contextual-help API| Help[Get Help]
    ChatFlow -->|clarify API| Clarify[Update Goal]
    
    CompQ -->|❌ 404 Error| Break1[BREAK: Missing Endpoint]
    Help -->|❌ 404 Error| Break2[BREAK: Missing Endpoint]  
    Clarify -->|❌ No goal.id| Break3[BREAK: Missing Goal ID]
    
    ChatFlow -->|onComplete| Milestones[Step 3: Milestones]
    Milestones -->|handleMilestonesComplete| WBS[Step 4: Work Breakdown]
    WBS -->|handleWBSComplete| Estimation[Step 5: Estimation]
    Estimation -->|handleEstimationComplete| Feedback[Step 6: Feedback Form]
    Feedback --> End([Flow Complete])
    
    Break1 -.->|Flow Stops| NoCompletion[User Never Completes]
    Break2 -.->|Flow Stops| NoCompletion
    Break3 -.->|Flow Stops| NoCompletion
    
    style Break1 fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px
    style Break2 fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px
    style Break3 fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px
    style NoCompletion fill:#ffa94d,stroke:#fd7e14,stroke-width:2px
```

## API Architecture Mismatch

```mermaid
flowchart LR
    subgraph Frontend["Frontend (Port 5174)"]
        FC[ChatClarification.tsx]
        SG[SmartGoalDisplay.tsx]
    end
    
    subgraph Expected["Expected Backend"]
        API1["/goals/translate ✓"]
        API2["/goals/{id}/clarify ✓"]
        API3["/goals/component-question ❌"]
        API4["/goals/contextual-help ❌"]
    end
    
    subgraph Actual["Actual Architecture"]
        subgraph MainBackend["Main Backend (Port 8086)"]
            MB1["/goals/translate ✓"]
            MB2["/goals/{id}/clarify ✓"]
        end
        
        subgraph OpenAIServer["openai-api-server.js (Port 8086)"]
            OS1["/goals/component-question ✓"]
            OS2["/goals/contextual-help ✓"]
        end
    end
    
    FC -->|Expects| API3
    FC -->|Expects| API4
    SG -->|Uses| API1
    FC -->|Uses| API2
    
    API3 -.->|Missing| MB1
    API4 -.->|Missing| MB2
    
    style API3 fill:#ff6b6b
    style API4 fill:#ff6b6b
```

## State Flow Issues

```mermaid
stateDiagram-v2
    [*] --> APIConfig: User starts
    APIConfig --> GoalInput: Config saved
    GoalInput --> SMARTTranslation: Goal submitted
    
    state SMARTTranslation {
        [*] --> CallAPI: translateGoal()
        CallAPI --> SetGoal: Response with goal.id
        SetGoal --> ShowChat: Display chat UI
        
        state ShowChat {
            [*] --> GenQuestion: generateComponentQuestion()
            GenQuestion --> Error1: ❌ 404 Not Found
            
            [*] --> GetHelp: generateContextualHelp()  
            GetHelp --> Error2: ❌ 404 Not Found
            
            [*] --> ClarifyGoal: clarifyGoal()
            ClarifyGoal --> Error3: ❌ No goal.id
        }
    }
    
    SMARTTranslation --> Stuck: Any error occurs
    Stuck --> [*]: Flow never completes
```

## Key Breaking Points

1. **Missing API Endpoints**
   - `/api/v1/goals/component-question` - Called by ChatClarification.tsx:115
   - `/api/v1/goals/contextual-help` - Called by ChatClarification.tsx:208
   - These exist in openai-api-server.js but not in main backend

2. **Goal ID Propagation**
   - SmartGoalDisplay receives goal with correlation_id
   - ChatClarification expects goal.id to be set
   - If goal.id is missing, clarification fails at line 263

3. **Cascade Failures**
   - If SMART translation chat fails, milestones can't generate
   - If milestones fail, WBS can't generate
   - If WBS fails, estimation can't happen
   - If estimation fails, feedback form never shows

## Solution Architecture

```mermaid
flowchart TD
    subgraph Solution["Unified Backend Solution"]
        MB[Main Backend Service]
        MB --> E1["/goals/translate"]
        MB --> E2["/goals/{id}/clarify"]
        MB --> E3["/goals/component-question"] 
        MB --> E4["/goals/contextual-help"]
        
        style E3 fill:#51cf66
        style E4 fill:#51cf66
    end
    
    Frontend --> Solution
    
    subgraph Alternative["Alternative: Proxy Solution"]
        Proxy[API Gateway/Proxy]
        Proxy --> MainAPI[Main Backend]
        Proxy --> OpenAIAPI[OpenAI Server]
    end
```