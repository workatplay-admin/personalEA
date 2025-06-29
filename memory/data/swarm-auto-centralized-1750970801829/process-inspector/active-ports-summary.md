# Active Ports Analysis Report
Generated: 2025-06-26T20:47:00Z

## Currently Active Ports

### Application Services
- **Port 3000** - Mock API Server (node mock-api-server.js, PID: 10922)
- **Port 8085** - Goal Strategy Service (node/tsx src/index.ts, PID: 141226)

### Database Services
- **Port 5432** - PostgreSQL Database (Docker container: personalea-postgres)
- **Port 6379** - Redis Cache (Docker container: personalea-redis)

### System Services
- **Port 53** - DNS Resolver (127.0.0.53)
- **Port 2000** - Unknown service (listening on all interfaces)
- **Port 2222** - Alternative SSH port

### VS Code Remote Development
- **Port 24647** - VS Code Extension Host (PID: 401)
- **Port 36907** - VS Code Server (PID: 378)
- **Port 16634, 16635** - VS Code IPC (localhost only)
- **Port 43833** - Unknown local service

## Port Allocation by Environment

### Development Environment (docker-compose.dev.yml)
- **3000** - Dialog Gateway / Main Frontend
- **3001** - Email Processing Service
- **3002** - Goal Service (placeholder)
- **3003** - Calendar Service (placeholder)
- **5174** - Vite Dev Server (Frontend testing)
- **5432** - PostgreSQL
- **6379** - Redis
- **8080** - API Documentation Server
- **8083** - Email Service Mock
- **8085** - Goal & Strategy Service
- **8086** - Calendar Service Mock
- **8090** - Mock Data Server

### Production Environment (docker-compose.production.yml)
- **3000** - PersonalEA Web Interface
- **5432** - PostgreSQL (127.0.0.1 only)
- **6379** - Redis (127.0.0.1 only)
- **8085** - Goal Strategy Service

### Testing Environment (docker-compose.testing.yml)
- **3000** - PersonalEA Web Interface
- **3001** - Email Processing Service
- **5432** - PostgreSQL
- **6379** - Redis

## Key Findings

1. **Active Services**: Currently running Mock API Server (3000) and Goal Strategy Service (8085)
2. **Database Stack**: Both PostgreSQL and Redis are running in Docker containers
3. **Port Conflicts**: Port 3000 is used by multiple services across environments
4. **Security**: Production binds database ports to localhost only for security

## Recommendations

1. Standardize port allocation to avoid conflicts
2. Document port usage in a central configuration file
3. Use environment-specific port mappings
4. Consider using a reverse proxy for production deployment