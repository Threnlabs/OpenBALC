#!/bin/bash
# Stop the OpenBALC app

cd "$(dirname "$0")"

if [ -f .app.pid ]; then
  PID=$(cat .app.pid)
  echo "Stopping app with PID $PID..."
  
  # Kill child processes (like the vite dev server) first
  pkill -P $PID 2>/dev/null
  # Kill the npm script process itself
  kill $PID 2>/dev/null
  
  rm .app.pid
  echo "App stopped."
else
  echo "App is not currently running (no .app.pid found)."
  
  # Optional fallback: Try to kill any orphaned vite processes
  if pgrep -f "vite --config vite.config.ts" > /dev/null; then
    echo "Found orphaned vite processes, cleaning them up..."
    pkill -f "vite --config vite.config.ts"
    echo "Done."
  fi
fi
