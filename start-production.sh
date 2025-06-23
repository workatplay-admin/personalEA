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
