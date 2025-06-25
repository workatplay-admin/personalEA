# Contributing to PersonalEA

Thank you for your interest in contributing to PersonalEA! This guide will help you get started with contributing to our project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## How to Contribute

### Reporting Issues

1. **Check existing issues** to avoid duplicates
2. **Use issue templates** for bug reports and feature requests
3. **Provide detailed information**:
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Screenshots or error logs if applicable

### Suggesting Features

1. **Open a feature request issue**
2. **Describe the problem** you're trying to solve
3. **Propose your solution** with examples
4. **Consider alternatives** you've thought about

### Contributing Code

#### Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/personalEA.git
   cd personalEA
   ```

3. **Set up development environment**:
   ```bash
   npm install
   cp .env.example .env
   # Configure your .env file
   ```

4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Development Process

1. **Write clean, readable code** following our style guide
2. **Add tests** for new functionality
3. **Update documentation** as needed
4. **Run tests and linting**:
   ```bash
   npm run test
   npm run lint
   npm run typecheck
   ```

#### Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, semicolons, etc.)
- `refactor:` Code refactoring
- `test:` Adding or modifying tests
- `chore:` Maintenance tasks

Examples:
```bash
git commit -m "feat: add goal export functionality"
git commit -m "fix: resolve authentication timeout issue"
git commit -m "docs: update API documentation for goals endpoint"
```

#### Pull Request Process

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** with:
   - Clear title and description
   - Link to related issues
   - Screenshots for UI changes
   - Test results

3. **PR Requirements**:
   - All tests passing
   - No linting errors
   - Code coverage maintained or improved
   - Documentation updated
   - Approved by at least one maintainer

## Development Guidelines

### Code Style

#### TypeScript/JavaScript

```typescript
// Use meaningful variable names
const userGoals = await getUserGoals(userId);  // ✓ Good
const ug = await getUG(uid);                   // ✗ Bad

// Use async/await over promises
async function processGoal(goalId: string) {    // ✓ Good
  try {
    const goal = await fetchGoal(goalId);
    return await processPhases(goal);
  } catch (error) {
    logger.error('Goal processing failed:', error);
    throw error;
  }
}

// Destructure when possible
const { title, description, timeframe } = goal; // ✓ Good
```

#### React Components

```typescript
// Use functional components with TypeScript
interface GoalCardProps {
  goal: Goal;
  onUpdate: (goal: Goal) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onUpdate }) => {
  // Component logic
};

// Use proper hooks
const [isLoading, setIsLoading] = useState(false);
const goals = useSelector(selectUserGoals);
```

### Testing Standards

#### Unit Tests

```typescript
describe('GoalValidator', () => {
  describe('validateSMARTCriteria', () => {
    it('should validate specific criteria', () => {
      const goal = createTestGoal({ specific: true });
      const result = validateSMARTCriteria(goal);
      expect(result.specific).toBe(true);
    });

    it('should handle edge cases', () => {
      const goal = createTestGoal({ title: '' });
      expect(() => validateSMARTCriteria(goal)).toThrow();
    });
  });
});
```

#### Integration Tests

```typescript
describe('Goal API', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('should create goal with all phases', async () => {
    const response = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${testToken}`)
      .send(testGoalData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('phases');
  });
});
```

### Documentation

- Add JSDoc comments for public APIs
- Update README.md for significant changes
- Include examples in documentation
- Keep documentation close to code

```typescript
/**
 * Processes a goal through all 8 phases of refinement
 * @param goalData - Initial goal data from user
 * @returns Processed goal with all phases completed
 * @throws {ValidationError} If goal data is invalid
 */
export async function processGoal(goalData: GoalInput): Promise<ProcessedGoal> {
  // Implementation
}
```

## Project Structure

```
personalEA/
├── services/           # Backend microservices
│   ├── goal-strategy/  # Goal processing service
│   └── email-processing/ # Email AI service
├── testing/            # Frontend applications
│   └── goal-strategy-test/ # React test UI
├── docs/              # Documentation
├── automation/        # CI/CD scripts
└── memory/           # Persistent storage
```

## Setting Up Development Environment

### Required Tools

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+
- Git

### Environment Variables

Create `.env` files based on `.env.example`:

```bash
# Root .env
NODE_ENV=development
LOG_LEVEL=debug

# Service-specific .env files
cd services/goal-strategy
cp .env.example .env
# Edit with your values
```

### Running Services

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Or run individually
cd services/goal-strategy
npm run dev
```

## Review Process

### Code Review Checklist

- [ ] Code follows project style guide
- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] No security vulnerabilities introduced
- [ ] Performance impact considered
- [ ] Backward compatibility maintained

### What We Look For

1. **Code Quality**
   - Clean, readable, maintainable
   - Proper error handling
   - Efficient algorithms

2. **Testing**
   - Comprehensive test coverage
   - Edge cases handled
   - Integration tests for APIs

3. **Documentation**
   - Clear function/class documentation
   - Updated README if needed
   - API documentation current

4. **Security**
   - No hardcoded secrets
   - Input validation
   - Proper authentication/authorization

## Release Process

1. **Version Bumping**
   - Follow semantic versioning
   - Update package.json versions
   - Update CHANGELOG.md

2. **Testing**
   - All tests passing
   - Manual testing completed
   - Performance benchmarks run

3. **Documentation**
   - Release notes prepared
   - Migration guide (if needed)
   - API changes documented

## Getting Help

### Resources

- [Developer Documentation](docs/guides/developer-onboarding.md)
- [API Reference](docs/reference/api-endpoints/)
- [Architecture Overview](docs/reference/architecture/system-overview.md)

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and ideas
- **Slack**: #personalea-dev for real-time chat
- **Email**: dev@personalea.com

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to PersonalEA! Your efforts help make this project better for everyone.