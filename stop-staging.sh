#!/bin/bash

# PersonalEA Staging Environment Stop Script
# This script cleanly stops all staging services

set -e

echo "🛑 Stopping PersonalEA Staging Environment..."

# Check if docker-compose file exists
if [ ! -f "docker-compose.staging.yml" ]; then
    echo "❌ docker-compose.staging.yml not found"
    echo "   Make sure you're running this from the PersonalEA root directory"
    exit 1
fi

# Stop and remove containers
echo "📦 Stopping containers..."
docker-compose -f docker-compose.staging.yml down

# Option to remove volumes (data)
read -p "🗑️  Remove all data volumes? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Removing data volumes..."
    docker-compose -f docker-compose.staging.yml down -v
    echo "✅ All data removed"
else
    echo "📦 Data volumes preserved for next startup"
fi

# Clean up unused images (optional)
read -p "🧹 Clean up unused Docker images? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Cleaning up unused images..."
    docker image prune -f
    echo "✅ Unused images removed"
fi

echo ""
echo "✅ PersonalEA Staging Environment stopped"
echo ""
echo "📝 To start again:"
echo "   ./start-staging.sh"
echo ""
echo "🔧 To check if anything is still running:"
echo "   docker ps"
echo ""
echo "📊 To view logs from last session:"
echo "   docker-compose -f docker-compose.staging.yml logs"
echo ""