# Common Issues and Troubleshooting

This guide helps you diagnose and resolve common issues with PersonalEA.

## Development Environment Issues

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Database Connection Failed

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions**:

1. **Start PostgreSQL**:
   ```bash
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   
   # Docker
   docker-compose up -d postgres
   ```

2. **Check connection string**:
   ```bash
   # Verify .env file
   DATABASE_URL="postgresql://user:password@localhost:5432/personalea"
   ```

3. **Create database**:
   ```bash
   createdb personalea
   ```

### Redis Connection Issues

**Error**: `Error: Redis connection to localhost:6379 failed`

**Solutions**:

1. **Start Redis**:
   ```bash
   # macOS
   brew services start redis
   
   # Linux
   sudo systemctl start redis
   
   # Docker
   docker run -d -p 6379:6379 redis
   ```

2. **Test connection**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

### Node Version Mismatch

**Error**: `The engine "node" is incompatible with this module`

**Solution**:
```bash
# Check current version
node --version

# Install correct version with nvm
nvm install 18
nvm use 18

# Or update .nvmrc
echo "18" > .nvmrc
nvm use
```

## API Issues

### Authentication Errors

**Error**: `401 Unauthorized`

**Solutions**:

1. **Check token expiration**:
   ```javascript
   // Decode JWT to check expiration
   const decoded = jwt.decode(token);
   console.log('Expires:', new Date(decoded.exp * 1000));
   ```

2. **Refresh token**:
   ```bash
   curl -X POST http://localhost:3001/api/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refreshToken": "your-refresh-token"}'
   ```

3. **Verify JWT secret**:
   ```bash
   # Ensure JWT_SECRET matches across services
   echo $JWT_SECRET
   ```

### CORS Errors

**Error**: `Access to fetch at 'http://localhost:3001' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution**:
```javascript
// In services/goal-strategy/src/index.ts
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

### Rate Limiting

**Error**: `429 Too Many Requests`

**Solutions**:

1. **Check rate limit headers**:
   ```bash
   curl -I http://localhost:3001/api/goals
   # Look for: X-RateLimit-Remaining
   ```

2. **Implement exponential backoff**:
   ```javascript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.status === 429 && i < maxRetries - 1) {
           await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
         } else {
           throw error;
         }
       }
     }
   }
   ```

## OpenAI Integration Issues

### Invalid API Key

**Error**: `Error: Incorrect API key provided`

**Solution**:
```bash
# Verify API key
echo $OPENAI_API_KEY

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Rate Limits

**Error**: `Rate limit reached for requests`

**Solutions**:

1. **Implement caching**:
   ```javascript
   const cache = new Map();
   
   async function getCachedCompletion(prompt) {
     if (cache.has(prompt)) {
       return cache.get(prompt);
     }
     
     const completion = await openai.createCompletion({
       model: "gpt-4",
       prompt: prompt
     });
     
     cache.set(prompt, completion);
     return completion;
   }
   ```

2. **Use streaming**:
   ```javascript
   const stream = await openai.createCompletion({
     model: "gpt-4",
     prompt: prompt,
     stream: true
   });
   ```

### Timeout Errors

**Error**: `Error: Request timeout`

**Solution**:
```javascript
// Increase timeout
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000 // 60 seconds
});
```

## Database Issues

### Migration Failures

**Error**: `Error: P3009: migrate found failed migrations`

**Solutions**:

1. **Reset migrations**:
   ```bash
   # Development only!
   npx prisma migrate reset
   ```

2. **Fix failed migration**:
   ```bash
   # Mark as rolled back
   npx prisma migrate resolve --rolled-back 20250625123456_migration_name
   
   # Or mark as applied
   npx prisma migrate resolve --applied 20250625123456_migration_name
   ```

### Slow Queries

**Symptoms**: API endpoints taking > 1 second

**Solutions**:

1. **Add indexes**:
   ```sql
   -- Check slow queries
   SELECT query, calls, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC;
   
   -- Add index
   CREATE INDEX idx_goals_user_status ON goals(user_id, status);
   ```

2. **Optimize Prisma queries**:
   ```javascript
   // Bad - N+1 query
   const goals = await prisma.goal.findMany();
   for (const goal of goals) {
     goal.tasks = await prisma.task.findMany({ where: { goalId: goal.id } });
   }
   
   // Good - Include relation
   const goals = await prisma.goal.findMany({
     include: { tasks: true }
   });
   ```

## Docker Issues

### Container Won't Start

**Error**: `docker: Error response from daemon: Conflict. The container name "/goal-strategy" is already in use`

**Solution**:
```bash
# Remove existing container
docker rm -f goal-strategy

# Or use docker-compose
docker-compose down
docker-compose up
```

### Build Failures

**Error**: `npm ERR! code ENOENT`

**Solutions**:

1. **Clear Docker cache**:
   ```bash
   docker-compose build --no-cache
   ```

2. **Check Dockerfile**:
   ```dockerfile
   # Ensure WORKDIR is correct
   WORKDIR /app
   
   # Copy package files first
   COPY package*.json ./
   RUN npm ci
   
   # Then copy source
   COPY . .
   ```

### Memory Issues

**Error**: `JavaScript heap out of memory`

**Solution**:
```yaml
# docker-compose.yml
services:
  goal-strategy:
    environment:
      - NODE_OPTIONS=--max-old-space-size=4096
```

## Frontend Issues

### Blank Page

**Symptoms**: App loads but shows blank page

**Solutions**:

1. **Check console errors**:
   - Open browser DevTools
   - Look for JavaScript errors
   - Check network tab for failed requests

2. **Verify environment variables**:
   ```javascript
   // Add debug logging
   console.log('API URL:', process.env.REACT_APP_API_URL);
   ```

3. **Clear cache**:
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Clear browser cache
   # Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
   ```

### State Management Issues

**Error**: `Cannot read property 'state' of undefined`

**Solution**:
```javascript
// Check Redux DevTools
// Install browser extension: Redux DevTools

// Add error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
  
  render() {
    return this.props.children;
  }
}
```

## Testing Issues

### Test Timeouts

**Error**: `Timeout - Async callback was not invoked within the 5000 ms timeout`

**Solution**:
```javascript
// Increase timeout for specific test
test('slow operation', async () => {
  // Test code
}, 10000);

// Or globally in jest.config.js
module.exports = {
  testTimeout: 10000
};
```

### Mock Issues

**Error**: `Cannot find module 'openai' from 'services/goal-strategy/src/services/ai.service.ts'`

**Solution**:
```javascript
// Create __mocks__/openai.js
module.exports = {
  Configuration: jest.fn(),
  OpenAIApi: jest.fn(() => ({
    createCompletion: jest.fn().mockResolvedValue({
      data: { choices: [{ text: 'Mocked response' }] }
    })
  }))
};
```

## Performance Issues

### High Memory Usage

**Symptoms**: Node process using > 1GB RAM

**Solutions**:

1. **Find memory leaks**:
   ```javascript
   // Add heapdump
   const heapdump = require('heapdump');
   
   // Take snapshot
   heapdump.writeSnapshot((err, filename) => {
     console.log('Heap dump written to', filename);
   });
   ```

2. **Optimize data handling**:
   ```javascript
   // Use streams for large data
   const stream = prisma.goal.findMany({
     take: 100,
     cursor: { id: lastId }
   });
   ```

### Slow API Responses

**Symptoms**: API calls taking > 500ms

**Solutions**:

1. **Add caching**:
   ```javascript
   const cached = await redis.get(cacheKey);
   if (cached) return JSON.parse(cached);
   ```

2. **Optimize queries**:
   ```javascript
   // Use select to limit fields
   const goals = await prisma.goal.findMany({
     select: {
       id: true,
       title: true,
       status: true
     }
   });
   ```

## Claude-Flow Issues

### Command Not Found

**Error**: `bash: ./claude-flow: command not found`

**Solution**:
```bash
# Make executable
chmod +x claude-flow

# Add to PATH
export PATH="$PATH:$(pwd)"

# Or use full path
/path/to/personalEA/claude-flow --help
```

### API Key Issues

**Error**: `Error: Missing API key`

**Solution**:
```bash
# Set environment variable
export CLAUDE_FLOW_API_KEY="your-api-key"

# Or use config
./claude-flow config set apiKey "your-api-key"
```

## Getting Help

If you can't resolve an issue:

1. **Check logs**:
   ```bash
   # Application logs
   docker-compose logs -f goal-strategy
   
   # System logs
   journalctl -u personalea
   ```

2. **Enable debug mode**:
   ```bash
   DEBUG=* npm run dev
   ```

3. **Contact support**:
   - Slack: #personalea-support
   - Email: support@personalea.com
   - GitHub Issues: https://github.com/your-org/personalEA/issues