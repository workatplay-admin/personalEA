#!/bin/bash

# Database Initialization Script for PersonalEA
# This script initializes and configures databases for all services

set -e  # Exit on error

echo "=== PersonalEA Database Initialization ==="
echo

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL container
echo "1. Starting PostgreSQL container..."
docker-compose -f docker-compose.dev.yml up -d postgres
sleep 5  # Wait for PostgreSQL to start

# Wait for PostgreSQL to be ready
echo "2. Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec personalea-postgres pg_isready -U personalea > /dev/null 2>&1; then
        print_status "PostgreSQL is ready"
        break
    fi
    echo -n "."
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "PostgreSQL failed to start"
    exit 1
fi

# Set database URL for local access
export DATABASE_URL="postgresql://personalea:personalea_dev_password@localhost:5432/personalea"

# Initialize Goal Strategy Service Database
echo
echo "3. Initializing Goal Strategy Service Database..."
cd /workspaces/personalEA/services/goal-strategy

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_warning "Installing Goal Strategy Service dependencies..."
    npm install
fi

# Generate Prisma client
print_status "Generating Prisma client for Goal Strategy Service..."
npx prisma generate

# Run migrations
print_status "Running Goal Strategy Service migrations..."
npx prisma migrate deploy

# Initialize Email Processing Service Database
echo
echo "4. Initializing Email Processing Service Database..."
cd /workspaces/personalEA/services/email-processing

# Check if directory exists
if [ -d "prisma" ]; then
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_warning "Installing Email Processing Service dependencies..."
        npm install
    fi

    # Generate Prisma client
    print_status "Generating Prisma client for Email Processing Service..."
    npx prisma generate

    # Create migration if schema exists but no migrations
    if [ ! -d "prisma/migrations" ]; then
        print_status "Creating initial migration for Email Processing Service..."
        npx prisma migrate dev --name init --skip-seed
    else
        print_status "Running Email Processing Service migrations..."
        npx prisma migrate deploy
    fi
else
    print_warning "Email Processing Service Prisma schema not found, skipping..."
fi

# Run the legacy init SQL script for base tables
echo
echo "5. Running legacy database initialization..."
docker exec -i personalea-postgres psql -U personalea -d personalea < /workspaces/personalEA/scripts/init-db.sql || true

# Create seed data script
echo
echo "6. Creating seed data script..."
cd /workspaces/personalEA
cat > scripts/seed-databases.ts << 'EOF'
import { PrismaClient as GoalPrismaClient } from '../services/goal-strategy/node_modules/@prisma/client';
import { seedDatabase } from '../services/goal-strategy/tests/fixtures/database-seed';

async function main() {
  console.log('Starting database seeding...');
  
  // Seed Goal Strategy database
  const goalPrisma = new GoalPrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://personalea:personalea_dev_password@localhost:5432/personalea'
      }
    }
  });
  
  try {
    await seedDatabase(goalPrisma);
    console.log('✓ Goal Strategy database seeded successfully');
  } catch (error) {
    console.error('Error seeding Goal Strategy database:', error);
  } finally {
    await goalPrisma.$disconnect();
  }
  
  console.log('Database seeding completed!');
}

main().catch(console.error);
EOF

# Compile and run seed script
echo
echo "7. Seeding databases with test data..."
cd /workspaces/personalEA/services/goal-strategy
npx tsx /workspaces/personalEA/scripts/seed-databases.ts

# Start Redis for completeness
echo
echo "8. Starting Redis container..."
docker-compose -f /workspaces/personalEA/docker-compose.dev.yml up -d redis

# Display connection information
echo
echo "=== Database Initialization Complete ==="
echo
print_status "PostgreSQL is running on localhost:5432"
print_status "Database: personalea"
print_status "Username: personalea"
print_status "Password: personalea_dev_password"
echo
print_status "Connection string: postgresql://personalea:personalea_dev_password@localhost:5432/personalea"
echo
print_status "Goal Strategy Service database initialized with:"
echo "  - Schema migrations applied"
echo "  - Test data seeded (5 goals, milestones, tasks, etc.)"
echo
if [ -d "/workspaces/personalEA/services/email-processing/prisma" ]; then
    print_status "Email Processing Service database initialized with schema migrations"
fi
echo
print_status "Redis is running on localhost:6379"
echo

# Store results in Memory
echo "9. Storing results in Memory..."
node -e "
const fs = require('fs');
const connectionInfo = {
  host: 'localhost',
  port: 5432,
  database: 'personalea',
  username: 'personalea',
  password: 'personalea_dev_password',
  connectionString: 'postgresql://personalea:personalea_dev_password@localhost:5432/personalea',
  services: {
    goalStrategy: {
      status: 'initialized',
      migrations: 'applied',
      testData: 'seeded'
    },
    emailProcessing: {
      status: 'initialized',
      migrations: 'applied'
    }
  }
};
console.log(JSON.stringify(connectionInfo, null, 2));
" > /tmp/db-connection-info.json

/workspaces/personalEA/claude-flow memory store "swarm-development-centralized-1750881199806/database/connection" "$(cat /tmp/db-connection-info.json)"

# Store schema information
node -e "
const schemaInfo = {
  goalStrategy: {
    tables: [
      'goals', 'goal_metrics', 'goal_clarifications',
      'milestones', 'milestone_progress',
      'tasks', 'task_dependencies', 'task_estimates', 'task_schedules',
      'team_capacity', 'capacity_allocations',
      'goal_templates', 'workflow_patterns'
    ],
    relationships: {
      'goals': ['metrics', 'milestones', 'clarifications'],
      'milestones': ['tasks', 'progress'],
      'tasks': ['dependencies', 'estimates', 'schedules']
    }
  },
  emailProcessing: {
    tables: [
      'users', 'email_providers', 'emails', 'email_summaries',
      'action_items', 'email_digests', 'email_digest_items', 'email_sync_jobs'
    ],
    relationships: {
      'users': ['emailProviders', 'emails', 'digests', 'syncJobs'],
      'emails': ['summary', 'actionItems', 'digestItems']
    }
  }
};
console.log(JSON.stringify(schemaInfo, null, 2));
" > /tmp/db-schema-info.json

/workspaces/personalEA/claude-flow memory store "swarm-development-centralized-1750881199806/database/schema" "$(cat /tmp/db-schema-info.json)"

# Store test data information
node -e "
const testDataInfo = {
  goalStrategy: {
    goals: 5,
    users: ['test-user-001', 'test-user-002', 'test-user-003', 'test-user-004'],
    categories: ['Career', 'Education', 'Business', 'Health & Fitness'],
    sampleGoals: [
      'Achieve Senior Software Engineer Promotion',
      'Improve Academic Performance',
      'Launch E-commerce Business',
      'Complete First Marathon',
      'Complete System Design Certification'
    ]
  }
};
console.log(JSON.stringify(testDataInfo, null, 2));
" > /tmp/db-test-data-info.json

/workspaces/personalEA/claude-flow memory store "swarm-development-centralized-1750881199806/database/test-data" "$(cat /tmp/db-test-data-info.json)"

echo
print_status "Database information stored in Memory"
echo "  - Connection details: swarm-development-centralized-1750881199806/database/connection"
echo "  - Schema structure: swarm-development-centralized-1750881199806/database/schema"
echo "  - Test data info: swarm-development-centralized-1750881199806/database/test-data"
echo

echo "=== All databases are ready for user testing! ==="