#!/bin/bash
set -e

echo "🚀 Starting PersonalEA Testing Environment"
echo "=========================================="

# Check environment
if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ Error: OPENAI_API_KEY environment variable is required"
  exit 1
fi

echo "✅ OpenAI API key detected (${#OPENAI_API_KEY} chars)"

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "npm run dev" || true
pkill -f "node.*mock-api-server" || true
pkill -f "node.*openai-api-server" || true
pkill -f "tsx watch" || true
sleep 2

# Start backend service
echo "🔧 Starting backend service..."
cd /workspaces/personalEA/services/goal-strategy
mkdir -p logs
OPENAI_API_KEY="$OPENAI_API_KEY" npm run dev > logs/backend-dev.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Test backend health
for i in {1..10}; do
  if curl -s http://localhost:8085/health > /dev/null; then
    echo "✅ Backend service is healthy"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "❌ Backend failed to start"
    exit 1
  fi
  sleep 2
done

# Start frontend
echo "🎨 Starting frontend service..."
cd /workspaces/personalEA/testing/goal-strategy-test
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 5

# Test frontend health
for i in {1..10}; do
  if curl -s http://localhost:5174 > /dev/null; then
    echo "✅ Frontend service is healthy"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "❌ Frontend failed to start"
    exit 1
  fi
  sleep 2
done

echo ""
echo "🌐 PersonalEA Testing Environment Ready!"
echo "======================================"
echo "Frontend: http://localhost:5174"
echo "Backend API: http://localhost:8085"
echo "Backend Health: http://localhost:8085/health"
echo "API Documentation: http://localhost:8085/api/v1/health"
echo ""
echo "Process IDs:"
echo "  Backend: $BACKEND_PID"
echo "  Frontend: $FRONTEND_PID"
echo ""
echo "Logs:"
echo "  Backend: /workspaces/personalEA/services/goal-strategy/logs/backend-dev.log"
echo "  Frontend: /workspaces/personalEA/testing/goal-strategy-test/frontend.log"
echo ""
echo "To stop services: pkill -f 'npm run dev'"
echo "To monitor logs: tail -f /workspaces/personalEA/services/goal-strategy/logs/backend-dev.log"