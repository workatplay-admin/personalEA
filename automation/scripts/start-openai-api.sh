#!/bin/bash

# Start OpenAI API Server
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/logs"

mkdir -p "$PID_DIR" "$LOG_DIR"

cd "$PROJECT_ROOT/testing/goal-strategy-test"

node openai-api-server.js > "$LOG_DIR/openai-api.log" 2>&1 &
echo $! > "$PID_DIR/openai-api.pid"