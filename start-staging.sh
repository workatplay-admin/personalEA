#!/bin/bash

# PersonalEA Staging Environment Startup Script
# This script starts the available services for user testing

set -e

echo "🚀 Starting PersonalEA Staging Environment..."
echo "⚠️  WARNING: This is a LIMITED testing environment"
echo "   - Calendar Service is missing (blocks full workflow)"
echo "   - Data Sovereignty Framework not implemented"
echo "   - Uses shared API keys (violates privacy principles)"
echo ""

# Check if OpenAI API key is provided
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY environment variable is required"
    echo "   Please set your OpenAI API key:"
    echo "   export OPENAI_API_KEY='sk-your-api-key-here'"
    echo ""
    echo "   Note: This violates data sovereignty (should be user-controlled)"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo "✅ OpenAI API key is set"
echo ""

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose -f docker-compose.staging.yml down --remove-orphans > /dev/null 2>&1 || true

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose -f docker-compose.staging.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

check_service() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null; then
            echo "✅ $name is healthy"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ $name failed to start (timeout after ${max_attempts} attempts)"
            return 1
        fi
        
        echo "   Waiting for $name... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
}

# Check each service
if ! check_service "Database" "http://localhost:5432"; then
    echo "   Note: Database check failed (expected - no HTTP endpoint)"
fi

if ! check_service "Goal Strategy Service" "http://localhost:3000/health"; then
    echo "❌ Goal Strategy Service failed to start"
    echo "   Check logs: docker-compose -f docker-compose.staging.yml logs goal-strategy-service"
    exit 1
fi

if ! check_service "Email Processing Service" "http://localhost:3001/health"; then
    echo "❌ Email Processing Service failed to start" 
    echo "   Check logs: docker-compose -f docker-compose.staging.yml logs email-processing-service"
    exit 1
fi

echo ""
echo "🎉 PersonalEA Staging Environment is ready!"
echo ""
echo "📋 Available Services:"
echo "   🎯 Goal Strategy Service:   http://localhost:3000"
echo "   📧 Email Processing Service: http://localhost:3001"
echo "   🖥️  Testing Interface:       http://localhost:5173"
echo "   📊 Health Dashboard:        http://localhost:8080"
echo ""
echo "🧪 What you can test:"
echo "   ✅ SMART Goal Translation"
echo "   ✅ Task Breakdown (WBS)"
echo "   ✅ Task Estimation"
echo "   ✅ Dependency Mapping"
echo "   ✅ Milestone Generation"
echo ""
echo "❌ What you CANNOT test:"
echo "   ❌ Calendar Integration (service missing)"
echo "   ❌ Task Scheduling (requires calendar)"
echo "   ❌ Email → Goals → Calendar workflow"
echo "   ❌ Data Privacy Controls (not implemented)"
echo "   ❌ User-controlled API keys (not implemented)"
echo ""
echo "🔗 Quick Links:"
echo "   Start Testing: http://localhost:5173"
echo "   Health Dashboard: http://localhost:8080"
echo ""
echo "📝 To stop the environment:"
echo "   docker-compose -f docker-compose.staging.yml down"
echo ""
echo "⚠️  REMEMBER: This is partial testing only!"
echo "   Full PersonalEA requires Data Sovereignty Framework + Calendar Service"
echo ""