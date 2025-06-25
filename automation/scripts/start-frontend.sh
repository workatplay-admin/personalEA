#!/bin/bash

# Start Frontend
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/logs"
FRONTEND_PORT=5174

mkdir -p "$PID_DIR" "$LOG_DIR"

cd "$PROJECT_ROOT/testing/goal-strategy-test"

if [ ! -d "node_modules" ]; then
    npm install
fi

npm run dev -- --port $FRONTEND_PORT > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$PID_DIR/frontend.pid"