#!/bin/bash

# Start Backend Service
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/logs"

mkdir -p "$PID_DIR" "$LOG_DIR"

cd "$PROJECT_ROOT/services/goal-strategy"

if [ ! -d "node_modules" ]; then
    npm install
fi

npm start > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$PID_DIR/backend.pid"