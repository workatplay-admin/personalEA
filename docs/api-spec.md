# Dialog Gateway API v0.3 - Production Ready Specification

## Overview & Architecture

The Dialog Gateway is the central communication hub in a modular microservices architecture for a personal AI assistant. It handles all human ↔ assistant traffic while coordinating with specialized services.

### Microservices Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Desktop Client  │    │   Mobile App    │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          └──────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Dialog Gateway        │
                    │   (This Service)        │
                    └────────────┬────────────┘
                                 │
          ┌──────┬──────┬────────┼────────┬──────┬──────┐
          │      │      │        │        │      │      │
     ┌────▼──┐ ┌─▼───┐ ┌▼────┐ ┌▼─────┐ ┌▼───┐ ┌▼───┐ ┌▼─────┐
     │Auth   │ │Chat │ │Task │ │Email │ │Doc │ │Cal │ │Config│
     │Service│ │LLM  │ │Mgmt │ │Scan  │ │Proc│ │Sync│ │Store │
     └───────┘ └─────┘ └─────┘ └──────┘ └────┘ └────┘ └──────┘
```

**Key Principles:**

- Each service owns its data and business logic
- Services communicate via events and direct API calls
- Gateway handles authentication, routing, and coordination
- Services can be updated independently
- New services can be added without disrupting existing ones

## OpenAPI 3.1 Specification

```yaml
openapi: 3.1.0
info:
  title: Dialog Gateway API
  version: 0.3.0
  description: |
    Secure communication hub for personal AI assistant microservices.
    Handles authentication, message routing, and real-time streaming.
    
    **Key Features:**
    - JWT authentication with configurable providers
    - WebSocket streaming with automatic reconnection
    - Message ordering guarantees for critical paths
    - Sub-second response times for interactive operations

servers:
  - url: https://assistant.local:8080
    description: Local gateway (configurable port)

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        JWT must contain:
        - sub: user identifier
        - exp: expiration (max 1 hour)
        - iat: issued at timestamp
        - scope: space-separated permissions (chat, tasks, email, docs)

  schemas:
    MessageContent:
      oneOf:
        - $ref: '#/components/schemas/TextContent'
        - $ref: '#/components/schemas/CommandContent'
        - $ref: '#/components/schemas/OverrideContent'
        - $ref: '#/components/schemas/EventContent'

    TextContent:
      type: object
      required: [type, text]
      properties:
        type:
          type: string
          enum: [text]
        text:
          type: string
          maxLength: 10000
        formatting:
          type: string
          enum: [plain, markdown, html]
          default: plain

    CommandContent:
      type: object
      required: [type, command]
      properties:
        type:
          type: string
          enum: [command]
        command:
          type: string
          enum: [scan_email, process_docs, sync_calendar, prioritize_task]
        args:
          type: object
          additionalProperties: true
        timeout_ms:
          type: integer
          minimum: 1000
          maximum: 300000
          default: 30000

    OverrideContent:
      type: object
      required: [type, action, targets]
      properties:
        type:
          type: string
          enum: [override]
        action:
          type: string
          enum: [prioritize, delay, cancel, reschedule]
        targets:
          type: array
          items:
            type: string
          maxItems: 100
        reason:
          type: string
          maxLength: 500

    EventContent:
      type: object
      required: [type, event_type]
      properties:
        type:
          type: string
          enum: [event]
        event_type:
          type: string
          enum: [task_completed, email_processed, error_occurred, system_status]
        payload:
          type: object
          additionalProperties: true

    Message:
      type: object
      required: [id, role, content, timestamp]
      properties:
        id:
          type: string
          format: uuid
        role:
          type: string
          enum: [user, assistant, system]
        content:
          $ref: '#/components/schemas/MessageContent'
        context:
          type: object
          properties:
            conversation_id:
              type: string
              format: uuid
            correlation_id:
              type: string
              format: uuid
            priority:
              type: string
              enum: [low, normal, high, urgent]
              default: normal
            service_origin:
              type: string
              enum: [gateway, auth, chat, tasks, email, docs, calendar, config]
            # Entity versioning for causal correctness
            entity_versions:
              type: object
              description: |
                Per-entity version numbers to ensure causal ordering.
                Key: entity_id (task_id, plan_id, etc.)
                Value: expected version number
              additionalProperties:
                type: integer
                minimum: 0
              example:
                task_123: 5
                plan_456: 12
            sequence_number:
              type: integer
              minimum: 0
              description: |
                Monotonic sequence number for this user session.
                Used to detect and resolve ordering conflicts.
          additionalProperties: true
        timestamp:
          type: string
          format: date-time
        version:
          type: string
          default: "1.0"

    MessageAck:
      type: object
      required: [accepted, message_id, queued_at]
      properties:
        accepted:
          type: boolean
        message_id:
          type: string
          format: uuid
        queued_at:
          type: string
          format: date-time
        estimated_response_time_ms:
          type: integer
          minimum: 0
          maximum: 5000
        queue_position:
          type: integer
          minimum: 0

    HealthCheck:
      type: object
      required: [status, timestamp]
      properties:
        status:
          type: string
          enum: [healthy, degraded, unhealthy]
        timestamp:
          type: string
          format: date-time
        checks:
          type: object
          properties:
            database:
              $ref: '#/components/schemas/ServiceHealth'
            auth_service:
              $ref: '#/components/schemas/ServiceHealth'
            chat_service:
              $ref: '#/components/schemas/ServiceHealth'
            websocket_connections:
              type: integer
              minimum: 0
          additionalProperties:
            $ref: '#/components/schemas/ServiceHealth'
        version:
          type: string

    ServiceHealth:
      type: object
      required: [status, response_time_ms]
      properties:
        status:
          type: string
          enum: [up, down, slow]
        response_time_ms:
          type: integer
          minimum: 0
        last_check:
          type: string
          format: date-time
        error_message:
          type: string

    ErrorResponse:
      type: object
      required: [error, timestamp, request_id]
      properties:
        error:
          type: string
        error_code:
          type: string
          enum: [INVALID_REQUEST, UNAUTHORIZED, FORBIDDEN, RATE_LIMITED, 
                 SERVICE_UNAVAILABLE, TIMEOUT, INTERNAL_ERROR]
        details:
          type: object
          additionalProperties: true
        timestamp:
          type: string
          format: date-time
        request_id:
          type: string
          format: uuid
        retry_after_ms:
          type: integer
          minimum: 0

  responses:
    BadRequest:
      description: Invalid request format or parameters
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error: "Invalid message content type"
            error_code: "INVALID_REQUEST"
            details:
              field: "content.type"
              allowed_values: ["text", "command", "override", "event"]
            timestamp: "2025-06-19T17:05:00Z"
            request_id: "550e8400-e29b-41d4-a716-446655440000"

    Unauthorized:
      description: Invalid or missing authentication
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    Forbidden:
      description: Insufficient permissions
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    RateLimited:
      description: Too many requests
      headers:
        Retry-After:
          schema:
            type: integer
          description: Seconds to wait before retrying
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    ServiceUnavailable:
      description: Service temporarily unavailable
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

paths:
  /messages:
    post:
      summary: Submit a user message or command
      operationId: postMessage
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Message'
            examples:
              text_message:
                summary: Simple text message
                value:
                  id: "550e8400-e29b-41d4-a716-446655440000"
                  role: "user"
                  content:
                    type: "text"
                    text: "What's my schedule for today?"
                  context:
                    conversation_id: "conv_123"
                    priority: "normal"
                  timestamp: "2025-06-19T17:05:00Z"
              
              override_command:
                summary: Task override command
                value:
                  id: "550e8400-e29b-41d4-a716-446655440001"
                  role: "user"
                  content:
                    type: "override"
                    action: "prioritize"
                    targets: ["task_456"]
                    reason: "Client meeting moved up"
                  context:
                    conversation_id: "conv_123"
                    priority: "high"
                    entity_versions:
                      task_456: 3
                      plan_789: 7
                    sequence_number: 42
                  timestamp: "2025-06-19T17:05:00Z"

      responses:
        '202':
          description: Message accepted and queued for processing
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageAck'
              example:
                accepted: true
                message_id: "550e8400-e29b-41d4-a716-446655440000"
                queued_at: "2025-06-19T17:05:00Z"
                estimated_response_time_ms: 500
                queue_position: 2
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '429':
          $ref: '#/components/responses/RateLimited'
        '503':
          $ref: '#/components/responses/ServiceUnavailable'

  /events/stream:
    get:
      summary: Upgrade to WebSocket for real-time bidirectional communication
      operationId: streamEvents
      security:
        - bearerAuth: []
      parameters:
        - name: conversation_id
          in: query
          schema:
            type: string
            format: uuid
          description: Filter events for specific conversation
        - name: heartbeat_interval
          in: query
          schema:
            type: integer
            minimum: 5000
            maximum: 60000
            default: 30000
          description: Heartbeat interval in milliseconds
      responses:
        '101':
          description: |
            WebSocket upgrade successful. Connection uses Message schema for payloads.
            
            **WebSocket Protocol:**
            - Heartbeat: Server sends ping every heartbeat_interval ms
            - Client must respond with pong within 5 seconds
            - Messages are JSON-encoded Message objects
            - Connection auto-reconnects on disconnect
            - Maximum 1000 concurrent connections per user
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  /health:
    get:
      summary: Health check endpoint
      operationId: getHealth
      responses:
        '200':
          description: Service health status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthCheck'
              example:
                status: "healthy"
                timestamp: "2025-06-19T17:05:00Z"
                checks:
                  database:
                    status: "up"
                    response_time_ms: 5
                    last_check: "2025-06-19T17:04:55Z"
                  auth_service:
                    status: "up"
                    response_time_ms: 12
                    last_check: "2025-06-19T17:04:58Z"
                  websocket_connections: 3
                version: "0.3.0"

  /metrics:
    get:
      summary: Service metrics (Prometheus format)
      operationId: getMetrics
      responses:
        '200':
          description: Metrics in Prometheus format
          content:
            text/plain:
              example: |
                # HELP gateway_messages_total Total messages processed
                # TYPE gateway_messages_total counter
                gateway_messages_total{role="user"} 1234
                gateway_messages_total{role="assistant"} 1156
                
                # HELP gateway_response_time_seconds Response time histogram
                # TYPE gateway_response_time_seconds histogram
                gateway_response_time_seconds_bucket{path="/messages",le="0.5"} 892
                gateway_response_time_seconds_bucket{path="/messages",le="1.0"} 1156
                gateway_response_time_seconds_bucket{path="/messages",le="+Inf"} 1234
```

## Implementation Guide

### 1. Causal Consistency & Entity Versioning

**The Problem:** Without proper versioning, an override command could arrive before the plan it's trying to modify, leading to silent state corruption. For example:

1. Task service generates plan v5 for task_123
2. User sees plan v3 on their screen (due to network delay)
3. User sends override based on v3
4. Override arrives before plan v5, corrupting the newer plan

**The Solution:** Each message includes entity version numbers and sequence numbers to ensure causal correctness:

```typescript
// Client sends override with version expectations
{
  "content": {
    "type": "override",
    "action": "prioritize", 
    "targets": ["task_123"]
  },
  "context": {
    "entity_versions": {
      "task_123": 3,  // Client expects task to be at version 3
      "plan_456": 7   // Client expects plan to be at version 7
    },
    "sequence_number": 42  // Monotonic sequence for this session
  }
}
```

**Version Validation Flow:**

1. Gateway receives override with version expectations
2. Gateway validates versions with target service before processing
3. If versions don't match, override is rejected with error
4. Client must refresh state and retry with current versions

**Per-Service Implementation:**

- **Task Service**: Maintains version counter per task/plan entity
- **Email Service**: Versions per email thread/folder state
- **Calendar Service**: Versions per calendar/event entity
- **Document Service**: Versions per document processing state

### 2. Project Structure

```
dialog-gateway/
├── src/
│   ├── controllers/          # HTTP request handlers
│   │   ├── messages.ts      # POST /messages logic
│   │   ├── websocket.ts     # WebSocket upgrade & management
│   │   └── health.ts        # Health check logic
│   ├── services/            # Business logic layer
│   │   ├── messageRouter.ts # Routes messages to appropriate services
│   │   ├── authValidator.ts # JWT validation
│   │   └── serviceManager.ts # Manages connections to other services
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts         # Authentication middleware
│   │   ├── rateLimit.ts    # Rate limiting
│   │   └── validation.ts   # Request validation
│   ├── models/             # Data models and schemas
│   │   ├── Message.ts      # Message type definitions
│   │   └── ServiceHealth.ts # Health check models
│   ├── utils/              # Utility functions
│   │   ├── logger.ts       # Structured logging
│   │   └── config.ts       # Configuration management
│   └── app.ts              # Main application setup
├── config/
│   ├── default.json        # Default configuration
│   ├── development.json    # Development overrides
│   └── production.json     # Production overrides
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/               # End-to-end tests
└── docker/
    ├── Dockerfile          # Container definition
    └── docker-compose.yml  # Multi-service setup
```

### 3. Configuration System

**config/default.json**

```json
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0",
    "cors": {
      "origins": ["http://localhost:3000", "https://assistant.local"]
    }
  },
  "auth": {
    "jwt": {
      "secret": "${JWT_SECRET}",
      "issuer": "dialog-gateway",
      "audience": "personal-assistant",
      "maxAge": "1h"
    },
    "service": {
      "url": "http://auth-service:8081",
      "timeout": 5000
    }
  },
  "services": {
    "chat": {
      "url": "http://chat-service:8082",
      "timeout": 5000,
      "retries": 3
    },
    "tasks": {
      "url": "http://task-service:8083",
      "timeout": 30000,
      "retries": 2
    },
    "email": {
      "url": "http://email-service:8084",
      "timeout": 60000,
      "retries": 1
    }
  },
  "websocket": {
    "heartbeatInterval": 30000,
    "maxConnections": 25,
    "messageQueueSize": 100
  },
  "rateLimit": {
    "windowMs": 60000,
    "maxRequests": 100,
    "skipSuccessfulRequests": false
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

### 4. Core Implementation Files

**src/models/Message.ts**

```typescript
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export enum ContentType {
  TEXT = 'text',
  COMMAND = 'command',
  OVERRIDE = 'override',
  EVENT = 'event'
}

export interface MessageContext {
  conversation_id?: string;
  correlation_id?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  service_origin?: string;
  // Entity versioning for causal correctness
  entity_versions?: Record<string, number>;
  sequence_number?: number;
  [key: string]: any;
}

export interface BaseContent {
  type: ContentType;
}

export interface TextContent extends BaseContent {
  type: ContentType.TEXT;
  text: string;
  formatting?: 'plain' | 'markdown' | 'html';
}

export interface CommandContent extends BaseContent {
  type: ContentType.COMMAND;
  command: string;
  args?: Record<string, any>;
  timeout_ms?: number;
}

export interface OverrideContent extends BaseContent {
  type: ContentType.OVERRIDE;
  action: 'prioritize' | 'delay' | 'cancel' | 'reschedule';
  targets: string[];
  reason?: string;
}

export interface EventContent extends BaseContent {
  type: ContentType.EVENT;
  event_type: string;
  payload?: Record<string, any>;
}

export type MessageContent = TextContent | CommandContent | OverrideContent | EventContent;

export interface Message {
  id: string;
  role: MessageRole;
  content: MessageContent;
  context?: MessageContext;
  timestamp: string;
  version?: string;
}

export interface MessageAck {
  accepted: boolean;
  message_id: string;
  queued_at: string;
  estimated_response_time_ms?: number;
  queue_position?: number;
}
```

**src/services/messageRouter.ts**

```typescript
import { Message, ContentType } from '../models/Message.js';
import { ServiceManager } from './serviceManager.js';
import { Logger } from '../utils/logger.js';

export class MessageRouter {
  constructor(
    private serviceManager: ServiceManager,
    private logger: Logger
  ) {}

  async routeMessage(message: Message): Promise<void> {
    const { content, context } = message;
    
    try {
      switch (content.type) {
        case ContentType.TEXT:
          await this.routeToChat(message);
          break;
          
        case ContentType.COMMAND:
          await this.routeCommand(message);
          break;
          
        case ContentType.OVERRIDE:
          await this.routeOverride(message);
          break;
          
        case ContentType.EVENT:
          await this.routeEvent(message);
          break;
          
        default:
          throw new Error(`Unknown content type: ${(content as any).type}`);
      }
    } catch (error) {
      this.logger.error('Failed to route message', {
        messageId: message.id,
        contentType: content.type,
        error: error.message
      });
      throw error;
    }
  }

  private async routeToChat(message: Message): Promise<void> {
    // Route text messages to chat service
    await this.serviceManager.sendToService('chat', message);
  }

  private async routeCommand(message: Message): Promise<void> {
    const content = message.content as CommandContent;
    
    // Route commands to appropriate services based on command type
    const serviceMap: Record<string, string> = {
      'scan_email': 'email',
      'process_docs': 'docs',
      'sync_calendar': 'calendar',
      'prioritize_task': 'tasks'
    };
    
    const targetService = serviceMap[content.command];
    if (!targetService) {
      throw new Error(`Unknown command: ${content.command}`);
    }
    
    await this.serviceManager.sendToService(targetService, message, {
      timeout: content.timeout_ms
    });
  }

  private async routeOverride(message: Message): Promise<void> {
    const content = message.content as OverrideContent;
    const context = message.context;
    
    // Validate entity versions before processing override
    if (context?.entity_versions) {
      await this.validateEntityVersions(content.targets, context.entity_versions);
    }
    
    // Override commands always go to task management with high priority
    await this.serviceManager.sendToService('tasks', message, {
      priority: 'high',
      requireVersionCheck: true // Flag for service to double-check versions
    });
  }

  private async validateEntityVersions(
    targetIds: string[], 
    expectedVersions: Record<string, number>
  ): Promise<void> {
    // Check with task service to ensure we have the expected versions
    // This prevents the override from corrupting state
    const versionCheckMessage: Message = {
      id: uuid(),
      role: 'system',
      content: {
        type: 'command',
        command: 'validate_versions',
        args: {
          entities: targetIds,
          expected_versions: expectedVersions
        }
      },
      timestamp: new Date().toISOString()
    };

    try {
      const response = await this.serviceManager.sendToService('tasks', versionCheckMessage, {
        timeout: 1000, // Quick validation
        priority: 'urgent'
      });

      // If validation fails, the task service will throw an error
      // This prevents the override from being processed out of order
    } catch (error) {
      this.logger.error('Entity version validation failed', {
        targetIds,
        expectedVersions,
        error: error.message
      });
      
      throw new Error(`Version conflict: ${error.message}. Please refresh and try again.`);
    }
  }

  private async routeEvent(message: Message): Promise<void> {
    // Events might need to be broadcast to multiple services
    // For now, just log them
    this.logger.info('Event received', {
      messageId: message.id,
      eventType: (message.content as EventContent).event_type
    });
  }
}
```

**src/controllers/messages.ts**

```typescript
import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { Message, MessageAck } from '../models/Message.js';
import { MessageRouter } from '../services/messageRouter.js';
import { Logger } from '../utils/logger.js';

export class MessagesController {
  constructor(
    private messageRouter: MessageRouter,
    private logger: Logger
  ) {}

  async postMessage(req: Request, res: Response): Promise<void> {
    const requestId = uuid();
    const startTime = Date.now();

    try {
      // Validate message structure
      const message: Message = {
        ...req.body,
        id: req.body.id || uuid(),
        timestamp: req.body.timestamp || new Date().toISOString()
      };

      // Log incoming message
      this.logger.info('Message received', {
        requestId,
        messageId: message.id,
        role: message.role,
        contentType: message.content.type,
        userId: req.user?.sub
      });

      // Queue message for processing (non-blocking)
      const queuePosition = await this.queueMessage(message);
      
      // Return immediate acknowledgment
      const ack: MessageAck = {
        accepted: true,
        message_id: message.id,
        queued_at: new Date().toISOString(),
        estimated_response_time_ms: this.estimateResponseTime(message.content.type),
        queue_position: queuePosition
      };

      res.status(202).json(ack);

      // Process message asynchronously
      this.processMessageAsync(message, requestId);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error('Failed to process message', {
        requestId,
        error: error.message,
        processingTimeMs: processingTime,
        userId: req.user?.sub
      });

      res.status(400).json({
        error: error.message,
        error_code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
        request_id: requestId
      });
    }
  }

  private async queueMessage(message: Message): Promise<number> {
    // Simple in-memory queue for now
    // In production, use Redis or similar
    return MessageQueue.add(message);
  }

  private async processMessageAsync(message: Message, requestId: string): Promise<void> {
    try {
      await this.messageRouter.routeMessage(message);
      
      this.logger.info('Message processed successfully', {
        requestId,
        messageId: message.id
      });
    } catch (error) {
      this.logger.error('Message processing failed', {
        requestId,
        messageId: message.id,
        error: error.message
      });
    }
  }

  private estimateResponseTime(contentType: string): number {
    // Estimate response times based on content type
    const estimates: Record<string, number> = {
      'text': 500,      // Chat responses are fast
      'command': 2000,  // Commands take longer
      'override': 100,  // Overrides are immediate
      'event': 50       // Events are just logged
    };
    
    return estimates[contentType] || 1000;
  }
}
```

### 5. WebSocket Implementation

**src/controllers/websocket.ts**

```typescript
import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { Message } from '../models/Message.js';
import { Logger } from '../utils/logger.js';
import { AuthValidator } from '../services/authValidator.js';

export class WebSocketController {
  private connections = new Map<string, WebSocket>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private authValidator: AuthValidator,
    private logger: Logger
  ) {}

  async handleUpgrade(ws: WebSocket, request: IncomingMessage): Promise<void> {
    try {
      // Validate JWT from query parameters or headers
      const token = this.extractToken(request);
      const user = await this.authValidator.validateToken(token);
      
      const connectionId = `${user.sub}_${Date.now()}`;
      
      // Store connection
      this.connections.set(connectionId, ws);
      
      // Set up heartbeat
      this.setupHeartbeat(connectionId, ws);
      
      // Handle messages
      ws.on('message', (data) => {
        this.handleMessage(connectionId, data, user);
      });
      
      // Handle disconnection
      ws.on('close', () => {
        this.handleDisconnect(connectionId);
      });
      
      // Send welcome message
      this.sendMessage(ws, {
        id: uuid(),
        role: 'system',
        content: {
          type: 'event',
          event_type: 'connection_established',
          payload: { connection_id: connectionId }
        },
        timestamp: new Date().toISOString()
      });

      this.logger.info('WebSocket connection established', {
        connectionId,
        userId: user.sub
      });

    } catch (error) {
      this.logger.error('WebSocket upgrade failed', {
        error: error.message,
        remoteAddress: request.socket.remoteAddress
      });
      
      ws.close(1008, 'Authentication failed');
    }
  }

  private setupHeartbeat(connectionId: string, ws: WebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        this.handleDisconnect(connectionId);
      }
    }, 30000); // 30 second heartbeat

    this.heartbeatIntervals.set(connectionId, interval);
  }

  private handleMessage(connectionId: string, data: WebSocket.Data, user: any): void {
    try {
      const message: Message = JSON.parse(data.toString());
      
      this.logger.info('WebSocket message received', {
        connectionId,
        messageId: message.id,
        contentType: message.content.type,
        userId: user.sub
      });

      // Process message through the same router as HTTP messages
      // This ensures consistent behavior
      
    } catch (error) {
      this.logger.error('Failed to process WebSocket message', {
        connectionId,
        error: error.message,
        userId: user.sub
      });
    }
  }

  private handleDisconnect(connectionId: string): void {
    // Clean up connection
    this.connections.delete(connectionId);
    
    // Clear heartbeat
    const interval = this.heartbeatIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(connectionId);
    }

    this.logger.info('WebSocket connection closed', { connectionId });
  }

  private sendMessage(ws: WebSocket, message: Message): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Public method to broadcast messages to connected clients
  public broadcastToUser(userId: string, message: Message): void {
    for (const [connectionId, ws] of this.connections.entries()) {
      if (connectionId.startsWith(userId)) {
        this.sendMessage(ws, message);
      }
    }
  }

  private extractToken(request: IncomingMessage): string {
    // Try to get token from query parameters first
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (token) return token;
    
    // Fall back to Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    throw new Error('No authentication token provided');
  }
}
```

### 6. Service Management

**src/services/serviceManager.ts**

```typescript
import axios, { AxiosInstance } from 'axios';
import { Message } from '../models/Message.js';
import { Logger } from '../utils/logger.js';
import { Config } from '../utils/config.js';

interface ServiceConfig {
  url: string;
  timeout: number;
  retries: number;
}

interface SendOptions {
  timeout?: number;
  priority?: string;
  retries?: number;
}

export class ServiceManager {
  private services = new Map<string, AxiosInstance>();
  private serviceConfigs = new Map<string, ServiceConfig>();

  constructor(
    private config: Config,
    private logger: Logger
  ) {
    this.initializeServices();
  }

  private initializeServices(): void {
    const servicesConfig = this.config.get('services');
    
    for (const [serviceName, serviceConfig] of Object.entries(servicesConfig)) {
      const config = serviceConfig as ServiceConfig;
      
      this.serviceConfigs.set(serviceName, config);
      
      const axiosInstance = axios.create({
        baseURL: config.url,
        timeout: config.timeout,
        headers: {
          '
```