# Email Processing Service

The Email Processing Service is a core component of the PersonalEA system responsible for email synchronization, AI-powered processing, and intelligent analysis.

## Features

- **Email Synchronization**: Connect to multiple email providers (Gmail, IMAP)
- **AI Processing**: Automatic email summarization and action item extraction
- **Smart Categorization**: Intelligent email classification and priority detection
- **RESTful API**: Full CRUD operations following OpenAPI specifications
- **Authentication**: JWT-based security with granular scopes
- **Observability**: Comprehensive logging, metrics, and tracing

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- OpenAI API key (optional, for AI features)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Build the service
npm run build

# Start in development mode
npm run dev
```

### Environment Variables

See `.env.example` for all required environment variables. Key variables:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `OPENAI_API_KEY`: OpenAI API key for AI processing
- `GMAIL_CLIENT_ID/SECRET`: Google OAuth credentials

## API Documentation

The service follows the OpenAPI specification defined in `docs/email-service-api-v1.yaml`.

### Key Endpoints

- `GET /health` - Health check
- `GET /api/v1/emails` - List emails
- `GET /api/v1/emails/:id` - Get specific email
- `POST /api/v1/emails/sync` - Trigger email sync
- `POST /api/v1/emails/:id/process` - Process email with AI
- `GET /api/v1/emails/:id/summary` - Get AI-generated summary

### Authentication

All API endpoints (except health checks) require JWT authentication:

```bash
curl -H "Authorization: Bearer <jwt-token>" \
     http://localhost:3001/api/v1/emails
```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── config/          # Configuration and environment
├── middleware/      # Express middleware
├── routes/          # API route handlers
├── services/        # Business logic services
├── models/          # Data models and schemas
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

### Adding New Features

1. Define API contract in OpenAPI spec
2. Generate types and validation schemas
3. Implement route handlers in `routes/`
4. Add business logic in `services/`
5. Write tests for new functionality

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- email.test.ts
```

## Deployment

### Docker

```bash
# Build image
docker build -t personalea/email-processing .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  personalea/email-processing
```

### Production Considerations

- Set `NODE_ENV=production`
- Use proper database connection pooling
- Configure log aggregation
- Set up monitoring and alerting
- Use HTTPS in production
- Implement proper secret management

## Monitoring

The service provides several monitoring endpoints:

- `/health` - Basic health check
- `/health/detailed` - Detailed health with dependencies
- `/health/ready` - Readiness probe for K8s
- `/health/live` - Liveness probe for K8s

Logs are structured JSON format with correlation IDs for request tracing.

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update API documentation
4. Ensure all linting passes
5. Add appropriate logging

## License

MIT License - see LICENSE file for details.