#!/bin/bash

# Simple, Non-Hanging Server Startup
# Addresses the hanging command issues

set -e

echo "🚀 Starting PersonalEA (Simple Mode)"
echo ""

# Kill any existing processes cleanly
echo "🧹 Cleaning up existing processes..."
pkill -f "openai-api-server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 2

# Start backend (non-hanging)
echo "🔧 Starting backend on port 3000..."
cd /workspaces/personalEA/testing/goal-strategy-test
nohup node openai-api-server.js > /dev/null 2>&1 &
sleep 3

# Check backend
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend running and healthy"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend dev server (non-hanging)
echo "🌐 Starting frontend on port 5174..."
nohup npm run dev > /dev/null 2>&1 &
sleep 5

# Check frontend
if curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo "✅ Frontend running"
else
    echo "⚠️ Frontend may still be starting..."
fi

echo ""
echo "🎉 System started!"
echo ""
echo "🌐 Frontend: http://localhost:5174"
echo "🔧 Backend: http://localhost:3000/health"
echo ""
echo "💡 To stop: pkill -f 'openai-api-server.js' && pkill -f 'vite'"