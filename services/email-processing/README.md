# Email Processing Service

A comprehensive microservice for processing, analyzing, and managing emails using AI-powered summarization and action item extraction.

## 🚀 Features

### Core Functionality
- **Gmail Integration**: OAuth2-based authentication and email synchronization
- **AI Processing**: Intelligent email summarization and action item extraction using OpenAI GPT-4
- **Async Job Processing**: Background email synchronization with progress tracking
- **RESTful API**: Complete OpenAPI 3.1 compliant endpoints
- **Database Integration**: PostgreSQL with Prisma ORM for data persistence

### API Endpoints

#### Email Synchronization
- `POST /api/v1/emails/sync` - Start email synchronization job
- `GET /api/v1/emails/jobs/{job_id}` - Get sync job status

#### Email Analysis
- `POST /api/v1/emails/digest` - Generate email digest for time window
- `GET /api/v1/emails/{email_id}/summary` - Get AI-generated email summary
- `GET /api/v1/emails/{email_id}/action-items` - Extract action items from email

#### Health Monitoring
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## 🏗️ Architecture

### Components

#### 1. Gmail Provider (`src/providers/gmail-provider.ts`)
- OAuth2 authentication with Google APIs
- Incremental email synchronization
- Rate limiting and error handling
- Message parsing and content extraction

#### 2. AI Processor (`src/services/ai-processor.ts`)
- OpenAI GPT-4 integration for email analysis
- Email categorization (urgent, important, informational, etc.)
- Action item extraction with confidence scoring
- Key point identification

#### 3. Email Sync Service (`src/services/email-sync.ts`)
- Orchestrates the complete email synchronization process
- Background job management with progress tracking
- Database persistence of emails, summaries, and action items
- Error handling and retry logic

#### 4. Database Schema (`prisma/schema.prisma`)
- **Users**: User account management
- **EmailProviders**: OAuth token storage and provider configuration
- **Emails**: Email metadata and content
- **EmailSummaries**: AI-generated summaries and categorization
- **ActionItems**: Extracted action items with priorities
- **EmailDigests**: Generated email digests
- **EmailSyncJobs**: Async job tracking

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with security middleware
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4 Turbo
- **Authentication**: JWT with scope-based authorization
- **Email Provider**: Gmail API with OAuth2
- **Logging**: Winston with structured logging
- **Validation**: Zod for environment and request validation

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Gmail OAuth2 credentials
- OpenAI API key

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/email_processing

# Gmail OAuth2
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REDIRECT_URI=http://localhost:8084/auth/gmail/callback

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4-turbo-preview

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars

# Server
PORT=8084
NODE_ENV=development
```

### Installation
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Docker Support
```bash
# Build image
docker build -t email-processing-service .

# Run container
docker run -p 8084:8084 \
  -e DATABASE_URL=postgresql://... \
  -e GMAIL_CLIENT_ID=... \
  -e OPENAI_API_KEY=... \
  email-processing-service
```

## 📊 API Usage Examples

### Start Email Sync
```bash
curl -X POST http://localhost:8084/api/v1/emails/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_id": "user_123",
    "access_token": "gmail_access_token",
    "sync_options": {
      "labels": ["INBOX", "IMPORTANT"],
      "since": "2025-06-19T00:00:00Z",
      "max_results": 100
    }
  }'
```

### Generate Email Digest
```bash
curl -X POST http://localhost:8084/api/v1/emails/digest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_id": "user_123",
    "time_window": {
      "start": "2025-06-19T00:00:00Z",
      "end": "2025-06-19T23:59:59Z"
    },
    "categories": ["urgent", "actionable"]
  }'
```

### Get Email Summary
```bash
curl -X GET http://localhost:8084/api/v1/emails/email_123/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔒 Security Features

- **JWT Authentication**: Scope-based authorization with `email.read` and `email.write` scopes
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive request validation with Zod schemas
- **CORS Protection**: Configurable allowed origins
- **Security Headers**: Helmet.js for security headers
- **Error Handling**: Structured error responses with correlation IDs

## 📈 Monitoring & Observability

### Logging
- Structured JSON logging with Winston
- Correlation ID tracking across requests
- Performance metrics for AI processing
- Error tracking with stack traces

### Health Checks
- Basic health endpoint for load balancers
- Detailed health with dependency status
- Kubernetes-ready readiness and liveness probes

### Metrics
- Email processing performance
- AI model response times
- Sync job success/failure rates
- Database query performance

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### API Contract Testing
```bash
npm run test:contract
```

## 📝 Development

### Code Structure
```
src/
├── config/          # Environment configuration
├── middleware/      # Express middleware
├── providers/       # Email provider integrations
├── routes/          # API route handlers
├── services/        # Business logic services
├── types/           # TypeScript type definitions
└── utils/           # Utility functions

prisma/
├── schema.prisma    # Database schema
└── migrations/      # Database migrations
```

### Adding New Email Providers
1. Implement the `EmailProvider` interface
2. Add provider-specific configuration
3. Update the sync service to support the new provider
4. Add tests for the new provider

### Extending AI Processing
1. Add new processing methods to `AIProcessor`
2. Update database schema for new data types
3. Add corresponding API endpoints
4. Update OpenAPI specification

## 🚀 Deployment

### Production Considerations
- Use environment-specific configuration
- Enable database connection pooling
- Configure proper logging levels
- Set up monitoring and alerting
- Use secrets management for sensitive data

### Scaling
- Horizontal scaling with multiple instances
- Database read replicas for query performance
- Redis for caching and session storage
- Message queues for async processing

## 📋 Roadmap

### Phase 4.2: Goal & Strategy Service
- Task management integration
- Priority scoring algorithms
- Goal-email relationship analysis

### Phase 4.3: Calendar Service
- Calendar integration for scheduling
- Meeting conflict detection
- Time-based recommendations

### Future Enhancements
- IMAP/SMTP fallback support
- Multi-language email processing
- Advanced email filtering
- Real-time email notifications
- Email template generation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details