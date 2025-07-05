# Conversational SMART Goal System - Architecture Diagrams

## System Overview Diagram

```mermaid
graph TB
    subgraph "User Interfaces"
        WEB[Web Application<br/>React/HTML]
        GPT[OpenAI Custom GPT]
        CLI[CLI Interface]
    end
    
    subgraph "API Gateway Layer"
        GW[API Gateway<br/>- Rate Limiting<br/>- Auth<br/>- Routing]
    end
    
    subgraph "Conversation Service"
        API[REST API<br/>Express.js]
        CM[Conversation<br/>Manager]
        GP[Goal<br/>Processor]
        SM[State<br/>Manager]
    end
    
    subgraph "AI Integration"
        OAI[OpenAI API<br/>GPT-4 Turbo]
        PE[Prompt<br/>Engine]
        PC[Prompt<br/>Cache]
    end
    
    subgraph "Data Storage"
        PG[(PostgreSQL<br/>- Conversations<br/>- Messages<br/>- Goals)]
        REDIS[(Redis<br/>- Session State<br/>- Cache<br/>- Queues)]
    end
    
    WEB --> GW
    GPT --> GW
    CLI --> GW
    
    GW --> API
    
    API --> CM
    API --> GP
    API --> SM
    
    CM --> PE
    GP --> PE
    PE --> OAI
    PE --> PC
    PC --> REDIS
    
    CM --> SM
    GP --> SM
    
    SM --> PG
    SM --> REDIS
    
    style WEB fill:#e1f5fe
    style GPT fill:#e1f5fe
    style CLI fill:#e1f5fe
    style OAI fill:#fff3e0
    style PG fill:#e8f5e9
    style REDIS fill:#e8f5e9
```

## Conversation Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Web UI
    participant API as API Gateway
    participant CM as Conversation Manager
    participant GP as Goal Processor
    participant AI as OpenAI API
    participant DB as Database
    participant Cache as Redis Cache
    
    U->>UI: "I want to learn programming"
    UI->>API: POST /conversations/start
    API->>CM: startConversation(message)
    
    CM->>DB: Create conversation record
    CM->>GP: analyzeGoal(message)
    GP->>AI: Analyze SMART components
    AI-->>GP: Analysis result
    GP-->>CM: Missing components identified
    
    CM->>Cache: Store conversation state
    CM->>AI: Generate clarifying question
    AI-->>CM: "What programming language?"
    CM->>DB: Save messages
    CM-->>API: Response with question
    API-->>UI: Display question
    UI-->>U: Show AI response
    
    U->>UI: "I want to learn React"
    UI->>API: POST /conversations/{id}/message
    API->>CM: processMessage(conversationId, message)
    
    CM->>Cache: Get conversation state
    CM->>GP: refineDraft(state, message)
    GP->>AI: Refine goal with new info
    AI-->>GP: Updated draft
    
    CM->>Cache: Update state
    CM->>DB: Save message
    CM-->>API: Next question
    API-->>UI: Display progress
    
    Note over U,UI: Continue conversation...
    
    U->>UI: Complete goal
    UI->>API: POST /conversations/{id}/complete
    API->>CM: completeConversation(id)
    CM->>GP: finalizeGoal(state)
    GP->>DB: Save final goal
    CM->>DB: Update conversation status
    CM-->>API: Final goal + milestones
    API-->>UI: Show result
    UI-->>U: Display SMART goal
```

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Initial: User starts conversation
    
    Initial --> Clarifying: Analyze initial input
    
    Clarifying --> Clarifying: Missing components > 2
    Clarifying --> Refining: Missing components <= 2
    
    Refining --> Refining: Confidence < 0.8
    Refining --> Confirming: Confidence >= 0.8
    
    Confirming --> Refining: User requests changes
    Confirming --> Complete: User confirms goal
    
    Complete --> [*]: Goal saved
    
    state Clarifying {
        [*] --> AnalyzeInput
        AnalyzeInput --> IdentifyMissing
        IdentifyMissing --> GenerateQuestion
        GenerateQuestion --> WaitForResponse
        WaitForResponse --> ProcessResponse
        ProcessResponse --> UpdateDraft
        UpdateDraft --> [*]
    }
    
    state Refining {
        [*] --> EvaluateDraft
        EvaluateDraft --> CalculateConfidence
        CalculateConfidence --> RefineComponents
        RefineComponents --> [*]
    }
```

## Data Model Diagram

```mermaid
erDiagram
    USERS ||--o{ CONVERSATIONS : creates
    CONVERSATIONS ||--o{ MESSAGES : contains
    CONVERSATIONS ||--o| GOALS : produces
    GOALS ||--o{ MILESTONES : contains
    GOALS ||--o{ METRICS : tracks
    
    USERS {
        uuid id PK
        string email
        string name
        json preferences
        timestamp created_at
    }
    
    CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        string status
        uuid final_goal_id FK
        json metadata
        timestamp started_at
        timestamp completed_at
    }
    
    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        string role
        text content
        string phase
        json metadata
        timestamp created_at
    }
    
    GOALS {
        uuid id PK
        uuid user_id FK
        uuid conversation_id FK
        string title
        text description
        json smart_criteria
        decimal confidence_score
        string status
        timestamp created_at
    }
    
    MILESTONES {
        uuid id PK
        uuid goal_id FK
        string title
        date target_date
        string status
        json tasks
        timestamp created_at
    }
    
    METRICS {
        uuid id PK
        uuid goal_id FK
        string name
        string type
        decimal target_value
        decimal current_value
        timestamp created_at
    }
```

## Component Architecture

```mermaid
graph TB
    subgraph "Frontend Components"
        UI[ConversationInterface]
        ML[MessageList]
        IA[InputArea]
        SI[StateIndicator]
        GP[GoalPreview]
        MS[MilestoneView]
    end
    
    subgraph "API Client"
        AC[APIClient]
        AM[AuthManager]
        EM[ErrorHandler]
        RT[RetryLogic]
    end
    
    subgraph "State Management"
        CS[ConversationStore]
        US[UserStore]
        GS[GoalStore]
    end
    
    UI --> ML
    UI --> IA
    UI --> SI
    UI --> GP
    
    UI --> AC
    AC --> AM
    AC --> EM
    AC --> RT
    
    UI --> CS
    CS --> US
    CS --> GS
    
    style UI fill:#c8e6c9
    style AC fill:#ffccbc
    style CS fill:#b3e5fc
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[AWS ALB / Nginx]
    end
    
    subgraph "Application Tier"
        APP1[Goal Service<br/>Instance 1]
        APP2[Goal Service<br/>Instance 2]
        APP3[Goal Service<br/>Instance 3]
    end
    
    subgraph "Data Tier"
        subgraph "Primary Storage"
            PG_MASTER[(PostgreSQL<br/>Master)]
            PG_REPLICA[(PostgreSQL<br/>Read Replica)]
        end
        
        subgraph "Cache Layer"
            REDIS1[(Redis<br/>Node 1)]
            REDIS2[(Redis<br/>Node 2)]
        end
    end
    
    subgraph "External Services"
        OPENAI[OpenAI API]
        S3[AWS S3<br/>Static Assets]
        CW[CloudWatch<br/>Monitoring]
    end
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> PG_MASTER
    APP2 --> PG_MASTER
    APP3 --> PG_REPLICA
    
    APP1 --> REDIS1
    APP2 --> REDIS2
    APP3 --> REDIS1
    
    APP1 --> OPENAI
    APP2 --> OPENAI
    APP3 --> OPENAI
    
    APP1 --> CW
    APP2 --> CW
    APP3 --> CW
    
    style LB fill:#fff9c4
    style OPENAI fill:#e1bee7
    style PG_MASTER fill:#a5d6a7
    style REDIS1 fill:#ffab91
```

## API Request Flow

```mermaid
graph LR
    subgraph "Request Pipeline"
        REQ[Incoming Request]
        RL[Rate Limiter]
        AUTH[Authentication]
        VAL[Validation]
        LOG[Request Logger]
        ROUTE[Router]
    end
    
    subgraph "Processing"
        CTRL[Controller]
        SVC[Service Layer]
        CACHE{Cache Hit?}
        PROC[Process Request]
        AI[AI Processing]
    end
    
    subgraph "Response Pipeline"
        RESP[Build Response]
        ERR[Error Handler]
        TRANS[Transform]
        COMPRESS[Compression]
        RES[Send Response]
    end
    
    REQ --> RL
    RL --> AUTH
    AUTH --> VAL
    VAL --> LOG
    LOG --> ROUTE
    
    ROUTE --> CTRL
    CTRL --> SVC
    SVC --> CACHE
    CACHE -->|Yes| RESP
    CACHE -->|No| PROC
    PROC --> AI
    AI --> RESP
    
    RESP --> TRANS
    TRANS --> COMPRESS
    COMPRESS --> RES
    
    CTRL -.->|Error| ERR
    SVC -.->|Error| ERR
    AI -.->|Error| ERR
    ERR --> RES
    
    style REQ fill:#ffebee
    style RES fill:#e8f5e9
    style AI fill:#fff3e0
    style CACHE fill:#e3f2fd
```

## Conversation State Machine

```mermaid
graph TB
    subgraph "Conversation States"
        INIT[Initial Input]
        ANALYZE[Analyze Goal]
        CLARIFY[Clarify Components]
        REFINE[Refine Goal]
        CONFIRM[Confirm Goal]
        COMPLETE[Complete & Save]
    end
    
    subgraph "State Transitions"
        INIT -->|Parse input| ANALYZE
        ANALYZE -->|Missing > 2| CLARIFY
        ANALYZE -->|Missing <= 2| REFINE
        CLARIFY -->|User responds| ANALYZE
        REFINE -->|Confidence < 0.8| CLARIFY
        REFINE -->|Confidence >= 0.8| CONFIRM
        CONFIRM -->|User accepts| COMPLETE
        CONFIRM -->|User modifies| REFINE
        COMPLETE -->|Save to DB| END[End]
    end
    
    subgraph "State Data"
        STATE[Current State<br/>- Phase<br/>- Draft Goal<br/>- Confidence<br/>- Messages<br/>- Missing Components]
    end
    
    ANALYZE -.-> STATE
    CLARIFY -.-> STATE
    REFINE -.-> STATE
    CONFIRM -.-> STATE
    
    style INIT fill:#ffcdd2
    style COMPLETE fill:#c8e6c9
    style STATE fill:#fff9c4
```

## Performance Monitoring Dashboard

```mermaid
graph TB
    subgraph "Metrics Collection"
        APP[Application<br/>Metrics]
        DB[Database<br/>Metrics]
        CACHE[Cache<br/>Metrics]
        AI[AI API<br/>Metrics]
    end
    
    subgraph "Aggregation"
        PROM[Prometheus]
        GRAF[Grafana]
    end
    
    subgraph "Key Metrics"
        RT[Response Time]
        TPT[Throughput]
        ERR[Error Rate]
        CONV[Conversion Rate]
        CONF[Confidence Scores]
        DUR[Session Duration]
    end
    
    subgraph "Alerts"
        ALERT[Alert Manager]
        SLACK[Slack]
        PD[PagerDuty]
        EMAIL[Email]
    end
    
    APP --> PROM
    DB --> PROM
    CACHE --> PROM
    AI --> PROM
    
    PROM --> GRAF
    
    GRAF --> RT
    GRAF --> TPT
    GRAF --> ERR
    GRAF --> CONV
    GRAF --> CONF
    GRAF --> DUR
    
    PROM --> ALERT
    ALERT --> SLACK
    ALERT --> PD
    ALERT --> EMAIL
    
    style PROM fill:#ff9800
    style GRAF fill:#4caf50
    style ALERT fill:#f44336
```

## Security Architecture

```mermaid
graph TB
    subgraph "External Layer"
        USER[User]
        WAF[Web Application<br/>Firewall]
        CDN[CDN<br/>DDoS Protection]
    end
    
    subgraph "API Security"
        CORS[CORS<br/>Policy]
        RATE[Rate<br/>Limiting]
        AUTH[JWT<br/>Authentication]
        VALID[Input<br/>Validation]
    end
    
    subgraph "Application Security"
        SANITIZE[Input<br/>Sanitization]
        ESCAPE[Output<br/>Escaping]
        AUDIT[Audit<br/>Logging]
        ENCRYPT[Encryption<br/>at Rest]
    end
    
    subgraph "Infrastructure Security"
        VPC[VPC<br/>Network Isolation]
        SG[Security<br/>Groups]
        SECRETS[Secrets<br/>Manager]
        IAM[IAM<br/>Roles]
    end
    
    USER --> WAF
    WAF --> CDN
    CDN --> CORS
    
    CORS --> RATE
    RATE --> AUTH
    AUTH --> VALID
    
    VALID --> SANITIZE
    SANITIZE --> ESCAPE
    ESCAPE --> AUDIT
    
    AUDIT --> VPC
    VPC --> SG
    SG --> SECRETS
    SECRETS --> IAM
    
    style WAF fill:#ffebee
    style AUTH fill:#e3f2fd
    style ENCRYPT fill:#e8f5e9
    style IAM fill:#fff3e0
```

## Testing Strategy Overview

```mermaid
graph TB
    subgraph "Test Types"
        UNIT[Unit Tests<br/>- Services<br/>- Controllers<br/>- Utilities]
        INT[Integration Tests<br/>- API Endpoints<br/>- Database<br/>- Cache]
        E2E[E2E Tests<br/>- User Flows<br/>- Browser<br/>- Full Stack]
        PERF[Performance Tests<br/>- Load Testing<br/>- Stress Testing<br/>- Scalability]
    end
    
    subgraph "Test Automation"
        CI[CI Pipeline<br/>GitHub Actions]
        PRE[Pre-commit<br/>Hooks]
        STAGE[Staging<br/>Tests]
        PROD[Production<br/>Smoke Tests]
    end
    
    subgraph "Coverage Targets"
        CODE[Code Coverage<br/>> 80%]
        API[API Coverage<br/>100%]
        FLOW[User Flow<br/>Coverage 100%]
        EDGE[Edge Cases<br/>Covered]
    end
    
    UNIT --> CI
    INT --> CI
    E2E --> STAGE
    PERF --> STAGE
    
    CI --> CODE
    CI --> API
    STAGE --> FLOW
    STAGE --> EDGE
    
    PRE --> UNIT
    PROD --> E2E
    
    style UNIT fill:#c8e6c9
    style INT fill:#ffccbc
    style E2E fill:#b3e5fc
    style PERF fill:#fff9c4
```

## Cost Optimization Strategy

```mermaid
graph LR
    subgraph "Cost Centers"
        COMP[Compute<br/>EC2/Lambda]
        STORE[Storage<br/>RDS/S3]
        NET[Network<br/>Data Transfer]
        AI[AI API<br/>OpenAI Calls]
    end
    
    subgraph "Optimization Strategies"
        CACHE[Aggressive<br/>Caching]
        SCALE[Auto<br/>Scaling]
        SPOT[Spot<br/>Instances]
        BATCH[Batch<br/>Processing]
    end
    
    subgraph "Monitoring"
        BUDGET[Budget<br/>Alerts]
        USAGE[Usage<br/>Analytics]
        OPTIMIZE[Cost<br/>Optimizer]
    end
    
    COMP --> SCALE
    COMP --> SPOT
    STORE --> CACHE
    AI --> CACHE
    AI --> BATCH
    NET --> CACHE
    
    SCALE --> BUDGET
    SPOT --> BUDGET
    CACHE --> USAGE
    BATCH --> USAGE
    
    BUDGET --> OPTIMIZE
    USAGE --> OPTIMIZE
    
    style AI fill:#ffebee
    style CACHE fill:#c8e6c9
    style OPTIMIZE fill:#fff3e0
```

These diagrams provide a comprehensive visual representation of the conversational SMART goal system architecture, covering all major aspects from high-level system design to specific implementation details.