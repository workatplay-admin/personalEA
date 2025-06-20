#!/bin/bash

echo "🚀 Starting Goal Strategy Testing Environment"
echo "============================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔧 Starting mock API server and frontend..."
echo "Frontend will be available at: http://localhost:5173"
echo "Mock API will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Start both the mock API and frontend
npm run test-env