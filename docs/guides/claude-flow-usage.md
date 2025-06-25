# Claude-Flow Usage Guide

Claude-Flow is PersonalEA's powerful CLI orchestration tool that enables AI-powered development workflows, swarm coordination, and task automation.

## Installation and Setup

### Prerequisites
```bash
# Ensure you have Node.js 18+ installed
node --version

# Clone the repository
git clone https://github.com/your-org/personalEA.git
cd personalEA
```

### Initial Setup
```bash
# Make the CLI executable
chmod +x claude-flow

# Initialize Claude-Flow
./claude-flow init

# Or initialize with SPARC development environment
./claude-flow init --sparc
```

## Core Concepts

### SPARC Development Modes

SPARC (Specialized Pattern for Autonomous Research and Coding) provides 17 specialized AI modes:

1. **Orchestrator**: Coordinates multiple agents for complex tasks
2. **Coder**: Focused code implementation
3. **Researcher**: In-depth information gathering
4. **TDD**: Test-driven development workflow
5. **Architect**: System design and planning
6. **Reviewer**: Code review and quality checks
7. **Debugger**: Issue identification and fixing
8. **Tester**: Comprehensive test creation
9. **Analyzer**: Performance and code analysis
10. **Optimizer**: Code and system optimization
11. **Documenter**: Documentation generation
12. **Designer**: UI/UX design assistance
13. **Innovator**: Creative problem solving
14. **Swarm-Coordinator**: Multi-agent coordination
15. **Memory-Manager**: Persistent data management
16. **Batch-Executor**: Bulk operation handling
17. **Workflow-Manager**: Process automation

### Swarm Coordination

Swarms enable multiple AI agents to work together on complex tasks.

**Strategies**:
- `research`: Information gathering and analysis
- `development`: Code implementation
- `analysis`: Data and system analysis
- `testing`: Comprehensive testing
- `optimization`: Performance improvement
- `maintenance`: System updates and fixes

**Coordination Modes**:
- `centralized`: Single coordinator manages all agents
- `distributed`: Agents coordinate peer-to-peer
- `hierarchical`: Tree structure with managers
- `mesh`: Fully connected agent network
- `hybrid`: Combination of modes

## Command Reference

### Basic Commands

#### Start the System
```bash
# Start orchestration system
./claude-flow start

# Start with web UI
./claude-flow start --ui

# Custom port and host
./claude-flow start --port 3001 --host 0.0.0.0
```

#### System Status
```bash
# Check system status
./claude-flow status

# Real-time monitoring
./claude-flow monitor
```

### SPARC Mode Usage

#### Basic SPARC Execution
```bash
# Default orchestrator mode
./claude-flow sparc "Build a user authentication system"

# Specific mode
./claude-flow sparc run coder "Implement JWT authentication"

# TDD mode for features
./claude-flow sparc tdd "User registration with email verification"
```

#### Examples by Mode

**Research Mode**:
```bash
./claude-flow sparc run researcher "Analyze best practices for microservices authentication"
```

**Architecture Mode**:
```bash
./claude-flow sparc run architect "Design scalable notification system"
```

**Code Review Mode**:
```bash
./claude-flow sparc run reviewer "Review security implementation in auth module"
```

### Swarm Coordination

#### Basic Swarm Usage
```bash
# Research swarm
./claude-flow swarm "Research modern web frameworks" \
  --strategy research \
  --mode distributed \
  --max-agents 5

# Development swarm with monitoring
./claude-flow swarm "Build REST API for e-commerce" \
  --strategy development \
  --mode hierarchical \
  --monitor \
  --parallel
```

#### Advanced Swarm Options
```bash
# Complex project with all options
./claude-flow swarm "Migrate monolith to microservices" \
  --strategy development \
  --mode hybrid \
  --max-agents 10 \
  --parallel \
  --monitor \
  --output json \
  --memory-context "architecture_decisions"
```

### Memory Management

#### Store Information
```bash
# Store simple data
./claude-flow memory store "api_key" "sk-1234567890"

# Store complex data
./claude-flow memory store "project_config" '{"database": "postgresql", "cache": "redis"}'
```

#### Retrieve Information
```bash
# Get specific key
./claude-flow memory get "project_config"

# List all keys
./claude-flow memory list

# Show memory statistics
./claude-flow memory stats
```

#### Export/Import
```bash
# Export memory to file
./claude-flow memory export project-memory.json

# Import from file
./claude-flow memory import project-memory.json

# Clean unused entries
./claude-flow memory cleanup
```

### Agent Management

#### Spawn Agents
```bash
# Create a researcher agent
./claude-flow agent spawn researcher --name "market-analyst"

# Quick spawn (alias)
./claude-flow spawn coder

# List active agents
./claude-flow agent list
```

### Task Management

#### Create Tasks
```bash
# Create a coding task
./claude-flow task create coding "Implement user profile API"

# Create research task
./claude-flow task create research "Analyze competitor features"

# List active tasks
./claude-flow task list
```

### Workflow Automation

#### Execute Workflows
```bash
# Run workflow file
./claude-flow workflow deploy-pipeline.yml

# With parameters
./claude-flow workflow ci-cd.yml --env production
```

## Practical Examples

### Example 1: Full Feature Development

```bash
# Step 1: Research and planning
./claude-flow sparc run researcher "Research best practices for real-time chat"
./claude-flow memory store "chat_research" "WebSocket with Redis pub/sub recommended"

# Step 2: Architecture design
./claude-flow sparc run architect "Design real-time chat system architecture"
./claude-flow memory store "chat_architecture" "Microservice with Socket.io"

# Step 3: TDD implementation
./claude-flow sparc tdd "Real-time chat with rooms and private messages"

# Step 4: Review and optimize
./claude-flow sparc run reviewer "Security review of chat implementation"
./claude-flow sparc run optimizer "Optimize chat message delivery"
```

### Example 2: Bug Investigation and Fix

```bash
# Investigate issue
./claude-flow swarm "Users report slow API response times" \
  --strategy analysis \
  --mode distributed \
  --max-agents 4

# Debug specific component
./claude-flow sparc run debugger "Analyze database query performance"

# Implement fix
./claude-flow sparc run coder "Optimize slow database queries identified"

# Test fix
./claude-flow sparc run tester "Create performance tests for API endpoints"
```

### Example 3: Documentation Project

```bash
# Generate comprehensive docs
./claude-flow swarm "Create complete API documentation" \
  --strategy research \
  --mode centralized \
  --monitor

# Store documentation structure
./claude-flow memory store "doc_structure" "OpenAPI + examples + tutorials"

# Generate specific sections
./claude-flow sparc run documenter "Create API endpoint reference"
./claude-flow sparc run documenter "Write authentication guide"
```

## Configuration

### Config File Location
```bash
~/.claude-flow/config.json
```

### Example Configuration
```json
{
  "defaultMode": "orchestrator",
  "apiKeys": {
    "openai": "sk-...",
    "anthropic": "sk-..."
  },
  "swarmDefaults": {
    "maxAgents": 5,
    "timeout": 3600,
    "parallel": true
  },
  "memory": {
    "provider": "sqlite",
    "path": "~/.claude-flow/memory.db"
  }
}
```

### Environment Variables
```bash
export CLAUDE_FLOW_API_KEY="your-api-key"
export CLAUDE_FLOW_MODE="development"
export CLAUDE_FLOW_LOG_LEVEL="debug"
```

## Best Practices

### 1. Use Memory for Coordination
```bash
# Store decisions and context
./claude-flow memory store "tech_stack" "Next.js, Prisma, PostgreSQL"

# Reference in tasks
./claude-flow sparc "Implement user dashboard using tech_stack from memory"
```

### 2. Combine Modes Effectively
```bash
# Research → Architect → Implement → Test
./claude-flow sparc run researcher "Payment processing options"
./claude-flow sparc run architect "Design payment system"
./claude-flow sparc tdd "Stripe payment integration"
./claude-flow sparc run tester "Payment flow testing"
```

### 3. Monitor Long-Running Tasks
```bash
# Use monitoring for visibility
./claude-flow swarm "Large refactoring project" --monitor

# Check status in another terminal
./claude-flow status
```

### 4. Leverage Parallel Execution
```bash
# Run independent tasks in parallel
./claude-flow swarm "Update all service dependencies" \
  --strategy maintenance \
  --parallel \
  --max-agents 8
```

## Troubleshooting

### Common Issues

1. **Command not found**
   ```bash
   # Make executable
   chmod +x claude-flow
   
   # Add to PATH
   export PATH="$PATH:/path/to/personalEA"
   ```

2. **API Key errors**
   ```bash
   # Set API key
   export CLAUDE_FLOW_API_KEY="your-key"
   
   # Or configure
   ./claude-flow config set apiKey "your-key"
   ```

3. **Memory issues**
   ```bash
   # Clean up memory
   ./claude-flow memory cleanup
   
   # Reset memory
   ./claude-flow memory reset --confirm
   ```

### Debug Mode
```bash
# Enable debug logging
export CLAUDE_FLOW_LOG_LEVEL="debug"

# Or use debug flag
./claude-flow sparc "Task" --debug
```

## Integration with CI/CD

### GitHub Actions
```yaml
- name: Run Claude-Flow Analysis
  run: |
    ./claude-flow sparc run analyzer "Check code quality"
    ./claude-flow sparc run tester "Generate missing tests"
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit
./claude-flow sparc run reviewer "Review staged changes"
```

## Advanced Features

### Custom Workflows
Create `.claude-flow/workflows/`:
```yaml
# deploy.yml
name: Deploy Pipeline
steps:
  - mode: tester
    task: "Run all tests"
  - mode: optimizer
    task: "Optimize build"
  - mode: documenter
    task: "Update changelog"
```

### Plugin System
```bash
# Install plugin
./claude-flow plugin install security-scanner

# Use plugin
./claude-flow plugin run security-scanner
```

## Getting Help

```bash
# General help
./claude-flow --help

# Command-specific help
./claude-flow swarm --help
./claude-flow sparc --help

# List all modes
./claude-flow sparc modes

# Version info
./claude-flow --version
```