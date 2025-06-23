#!/bin/bash

# PersonalEA Goal Strategy Service Testing Environment
# This script starts ONLY the working Goal Strategy testing interface
# No Docker required - uses the existing standalone testing setup

set -e

echo "🎯 Starting PersonalEA Goal Strategy Testing Environment..."
echo ""
echo "⚠️  This is LIMITED testing of ONLY Goal Strategy Service:"
echo "   ✅ SMART Goal Translation"
echo "   ✅ Task Breakdown (WBS)"
echo "   ✅ Task Estimation"
echo "   ✅ Dependency Mapping"
echo "   ✅ Milestone Generation"
echo ""
echo "❌ NOT AVAILABLE:"
echo "   ❌ Calendar Service (missing entirely)"
echo "   ❌ Email Integration (missing privacy framework)"
echo "   ❌ Data Privacy Controls (not implemented)"
echo "   ❌ Complete workflows (blocked by missing services)"
echo ""

# Check if OpenAI API key is provided
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY environment variable is required"
    echo ""
    echo "🔑 To get an OpenAI API key:"
    echo "   1. Visit: https://platform.openai.com/api-keys"
    echo "   2. Create a new API key"
    echo "   3. Set it in your environment:"
    echo "      export OPENAI_API_KEY='sk-your-api-key-here'"
    echo ""
    echo "⚠️  PRIVACY WARNING:"
    echo "   This violates PersonalEA's data sovereignty principle."
    echo "   In production, users should control their own API keys."
    echo "   Do NOT enter sensitive personal information during testing."
    echo ""
    exit 1
fi

echo "✅ OpenAI API key is set"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "   Please install Node.js (version 18 or higher) and try again"
    exit 1
fi

echo "✅ Node.js is available"

# Check if we're in the right directory
if [ ! -f "testing/goal-strategy-test/package.json" ]; then
    echo "❌ This script must be run from the PersonalEA root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: testing/goal-strategy-test/package.json"
    exit 1
fi

echo "✅ PersonalEA root directory confirmed"

# Navigate to testing directory
cd testing/goal-strategy-test

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🚀 Starting Goal Strategy Testing Environment..."
echo ""
echo "   This will start:"
echo "   📊 OpenAI-powered API server (port 3000)"
echo "   🖥️  React testing interface (port 5173)"
echo ""
echo "   Once started, open: http://localhost:5173"
echo ""
echo "🔄 Starting services (this may take a moment)..."

# Start the testing environment with OpenAI integration
npm run test-env-openai &

# Get the PID to stop it later
TESTING_PID=$!

# Wait a moment for services to start
sleep 5

echo ""
echo "🎉 Goal Strategy Testing Environment is running!"
echo ""
echo "🔗 Access Points:"
echo "   🎯 Testing Interface:  http://localhost:5173"
echo "   📊 API Server:         http://localhost:3000"
echo "   🏥 Health Check:       http://localhost:3000/health"
echo ""
echo "📋 Testing Instructions:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Enter your OpenAI API key in the configuration"
echo "   3. Test goal translation and task breakdown features"
echo "   4. Try different types of goals (personal, professional, fitness)"
echo ""
echo "🛑 To stop the testing environment:"
echo "   Press Ctrl+C in this terminal"
echo ""
echo "📝 What to test:"
echo "   ✅ Enter vague goals like 'I want to learn programming'"
echo "   ✅ Test business goals like 'Launch a new product'"
echo "   ✅ Try fitness goals like 'Run a marathon'"
echo "   ✅ Evaluate AI-generated SMART goals and task breakdowns"
echo "   ✅ Check time estimates and dependencies"
echo ""
echo "⚠️  REMEMBER: This is partial testing only!"
echo "   Full PersonalEA requires Data Sovereignty + Calendar Service"
echo ""

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping Goal Strategy Testing Environment..."
    
    # Kill the testing process
    if [ ! -z "$TESTING_PID" ]; then
        kill $TESTING_PID 2>/dev/null || true
        wait $TESTING_PID 2>/dev/null || true
    fi
    
    # Kill any remaining node processes on our ports
    pkill -f "node.*3000" 2>/dev/null || true
    pkill -f "node.*5173" 2>/dev/null || true
    
    echo "✅ Testing environment stopped"
    echo ""
    echo "📋 Testing Summary:"
    echo "   Thank you for testing the Goal Strategy Service!"
    echo "   Please provide feedback on:"
    echo "   - Goal translation quality and accuracy"
    echo "   - Task breakdown completeness and usefulness"
    echo "   - Time estimation realism"
    echo "   - User interface clarity and responsiveness"
    echo ""
    echo "🔄 To restart testing:"
    echo "   ./start-goal-testing.sh"
    echo ""
    exit 0
}

# Set up trap to catch Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for user to stop
echo "🔄 Testing environment is running..."
echo "   Press Ctrl+C to stop when finished testing"
echo ""

# Keep the script running
wait