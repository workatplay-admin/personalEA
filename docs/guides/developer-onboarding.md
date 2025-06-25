# Developer Onboarding Guide

Welcome to PersonalEA! This guide will help you set up your development environment and start contributing to the project.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose**
- **Git**
- **PostgreSQL** (for local database development)
- **Redis** (for caching and job queues)

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/personalEA.git
cd personalEA
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install service dependencies
cd services/goal-strategy && npm install && cd ../..
cd services/email-processing && npm install && cd ../..
```

### 3. Configure Environment Variables

Copy the example environment files:

```bash
cp .env.example .env
cp services/goal-strategy/.env.example services/goal-strategy/.env
cp services/email-processing/.env.example services/email-processing/.env
```

Key environment variables to configure:

- `OPENAI_API_KEY`: Your OpenAI API key
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT token generation

### 4. Database Setup

Initialize the database:

```bash
cd services/goal-strategy
npx prisma migrate dev
npx prisma generate
```

### 5. Start Development Environment

Using Docker Compose (recommended):

```bash
docker-compose -f docker-compose.dev.yml up
```

Or start services individually:

```bash
# Terminal 1: Goal Strategy Service
cd services/goal-strategy
npm run dev

# Terminal 2: Frontend
cd testing/goal-strategy-test
npm run dev

# Terminal 3: Claude-Flow CLI
./claude-flow start --ui
```

## Project Structure

```
personalEA/
├── services/                 # Backend microservices
│   ├── goal-strategy/       # 8-phase goal processing
│   ├── email-processing/    # Email AI summarization
│   └── calendar/           # Calendar management (planned)
├── testing/                 # Test applications
│   └── goal-strategy-test/  # React test interface
├── automation/              # CI/CD and automation
├── memory/                  # Persistent memory system
├── docs/                    # Documentation
└── claude-flow             # CLI orchestration tool
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

Follow our coding standards:
- Use TypeScript for all new code
- Write tests for new functionality
- Update documentation as needed

### 3. Run Tests

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e
```

### 4. Check Code Quality

```bash
npm run lint
npm run typecheck
```

### 5. Commit Your Changes

We use conventional commits:

```bash
git add .
git commit -m "feat: add new goal validation logic"
```

Commit types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Key Development Commands

### Build Commands
- `npm run build` - Build all services
- `npm run build:services` - Build backend services only
- `npm run build:frontend` - Build frontend only

### Test Commands
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report

### Development Tools
- `./claude-flow --help` - CLI tool documentation
- `npm run dev:debug` - Start with debugging enabled
- `npm run analyze` - Analyze bundle size

## Common Tasks

### Adding a New API Endpoint

1. Define the route in `services/goal-strategy/src/routes/`
2. Add validation schemas
3. Implement business logic
4. Write tests
5. Update API documentation

### Working with the Memory System

```javascript
// Store data
await memory.store('key', { data: 'value' });

// Retrieve data
const data = await memory.get('key');

// List all keys
const keys = await memory.list();
```

### Using Claude-Flow for Development

```bash
# Start a development swarm
./claude-flow swarm "Implement user authentication" --strategy development

# Run tests with monitoring
./claude-flow sparc tdd "New feature" --monitor

# Check system status
./claude-flow status
```

## Debugging Tips

### Backend Services
- Use VS Code debugger with launch configurations
- Check logs: `docker-compose logs -f goal-strategy`
- Use Prisma Studio: `npx prisma studio`

### Frontend
- React Developer Tools
- Network tab for API debugging
- Console for error messages

### Common Issues
- **Port conflicts**: Check if ports 3000, 3001, 3002 are free
- **Database connection**: Ensure PostgreSQL is running
- **API keys**: Verify environment variables are set

## Resources

- [Architecture Overview](../reference/architecture/system-overview.md)
- [API Documentation](../reference/api-endpoints/)
- [Testing Guide](testing-strategy.md)
- [Troubleshooting](../reference/troubleshooting/common-issues.md)

## Getting Help

- **Slack**: #personalea-dev
- **Documentation**: This guide and linked resources
- **Code Reviews**: Tag senior developers for guidance

Welcome to the team! We're excited to have you contributing to PersonalEA.