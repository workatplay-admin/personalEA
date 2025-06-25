#!/bin/bash

echo "🧹 Cleaning up duplicate processes..."

# Kill all existing goal-strategy and vite processes
pkill -f "goal-strategy" || true
pkill -f "vite" || true
pkill -f "npm run dev" || true

sleep 2

echo "✅ Cleanup complete"
echo ""
echo "🚀 Starting fresh services..."

# Start backend
cd /workspaces/personalEA/services/goal-strategy
npm run dev > backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
sleep 5

# Start frontend
cd /workspaces/personalEA/testing/goal-strategy-test
npm run preview > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "📍 Services running at:"
echo "   Backend: http://localhost:3003"
echo "   Frontend: http://localhost:5174"
echo ""
echo "✅ Ready for testing!"