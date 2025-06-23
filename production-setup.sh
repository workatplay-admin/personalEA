#!/bin/bash

# PersonalEA Production Setup Script
# Builds and configures for production-like environment

set -e

PROJECT_DIR="/workspaces/personalEA"
FRONTEND_DIR="$PROJECT_DIR/testing/goal-strategy-test"
LOG_DIR="$PROJECT_DIR/logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 PersonalEA Production Setup${NC}"
echo ""

# Create necessary directories
echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p "$LOG_DIR"

# Stop any running servers
echo -e "${BLUE}🛑 Stopping development servers...${NC}"
$PROJECT_DIR/server-manager.sh stop

# Build frontend for production
echo -e "${BLUE}📦 Building frontend for production...${NC}"
cd "$FRONTEND_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📥 Installing dependencies...${NC}"
    npm install
fi

# Build the frontend
echo -e "${BLUE}🔨 Building React application...${NC}"
npm run build

# Verify build was successful
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

# Update package.json to include preview script if not present
if ! grep -q '"preview"' package.json; then
    echo -e "${BLUE}📝 Adding preview script to package.json...${NC}"
    # Add preview script after build script
    sed -i '/"build":/a\    "preview": "vite preview --host 0.0.0.0 --port 5174",' package.json
fi

# Create environment configuration
echo -e "${BLUE}⚙️ Creating environment configuration...${NC}"
cat > "$PROJECT_DIR/.env.production" << EOF
# PersonalEA Production Environment Configuration
NODE_ENV=production

# Server Configuration
BACKEND_PORT=3000
FRONTEND_PORT=5174

# Logging
LOG_LEVEL=info
LOG_DIR=$LOG_DIR

# Health Check Configuration  
HEALTH_CHECK_INTERVAL=30
MAX_HEALTH_FAILURES=3

# OpenAI Configuration (set your API key)
# OPENAI_API_KEY=your_api_key_here
EOF

# Create startup script
echo -e "${BLUE}📝 Creating startup script...${NC}"
cat > "$PROJECT_DIR/start-production.sh" << 'EOF'
#!/bin/bash

# PersonalEA Production Startup Script

PROJECT_DIR="/workspaces/personalEA"

echo "🚀 Starting PersonalEA in production mode..."

# Load environment
if [ -f "$PROJECT_DIR/.env.production" ]; then
    source "$PROJECT_DIR/.env.production"
fi

# Start servers
$PROJECT_DIR/server-manager.sh start

# Start health monitoring
$PROJECT_DIR/health-monitor.sh start

echo ""
echo "✅ PersonalEA is running!"
echo ""
echo "🌐 Frontend: http://localhost:5174"
echo "🔧 Backend API: http://localhost:3000"
echo "❤️ Health Check: http://localhost:3000/health"
echo ""
echo "📋 Management Commands:"
echo "  Status:  $PROJECT_DIR/server-manager.sh status"
echo "  Logs:    $PROJECT_DIR/server-manager.sh logs"
echo "  Stop:    $PROJECT_DIR/server-manager.sh stop"
echo "  Monitor: $PROJECT_DIR/health-monitor.sh status"
echo ""
EOF

chmod +x "$PROJECT_DIR/start-production.sh"

# Create systemd service file (optional)
echo -e "${BLUE}📝 Creating systemd service template...${NC}"
cat > "$PROJECT_DIR/personalea.service.template" << EOF
[Unit]
Description=PersonalEA Goal Strategy Service
After=network.target

[Service]
Type=forking
User=codespace
WorkingDirectory=$PROJECT_DIR
ExecStart=$PROJECT_DIR/start-production.sh
ExecStop=$PROJECT_DIR/server-manager.sh stop
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create quick reference guide
echo -e "${BLUE}📖 Creating quick reference guide...${NC}"
cat > "$PROJECT_DIR/README-PRODUCTION.md" << 'EOF'
# PersonalEA Production Setup

## Quick Start

```bash
# Start everything in production mode
./start-production.sh

# Check status
./server-manager.sh status

# View logs
./server-manager.sh logs

# Stop everything
./server-manager.sh stop
```

## Architecture

- **Frontend**: React + Vite (production build) on port 5174
- **Backend**: Node.js + Express on port 3000  
- **Health Monitor**: Automatic restart on failure
- **Process Management**: Custom scripts with logging

## Files

- `server-manager.sh` - Start/stop/restart servers
- `health-monitor.sh` - Automatic health monitoring
- `start-production.sh` - One-command startup
- `logs/` - All service logs
- `.env.production` - Environment configuration

## Health Monitoring

The health monitor checks:
- Backend API `/health` endpoint every 30 seconds
- Frontend port availability
- Auto-restarts after 3 consecutive failures
- Logs all activity to `logs/health-monitor.log`

## Production Features

- ✅ Automatic restart on failure
- ✅ Health monitoring and logging
- ✅ Production builds (optimized)
- ✅ Process management scripts
- ✅ Centralized logging
- ✅ Environment configuration
- ✅ Non-hanging command execution

## Reliability Improvements

1. **No More Hanging Commands**: All servers run with proper backgrounding
2. **Health Checks**: Automatic monitoring and restart
3. **Production Builds**: Optimized frontend serving
4. **Centralized Management**: Single command to control everything
5. **Logging**: All output captured for debugging
6. **Error Recovery**: Automatic restart on failures
EOF

echo ""
echo -e "${GREEN}✅ Production setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Start production mode: ./start-production.sh"
echo "2. Check status: ./server-manager.sh status"
echo "3. Monitor health: ./health-monitor.sh status"
echo "4. View logs: ./server-manager.sh logs"
echo ""
echo -e "${BLUE}📖 Documentation: $PROJECT_DIR/README-PRODUCTION.md${NC}"