#!/bin/bash
# Start the OpenBALC app

cd "$(dirname "$0")"

if [ -f .app.pid ]; then
  echo "App might be already running (PID: $(cat .app.pid)). Stop it first using ./stop.sh"
  exit 1
fi

export PORT=3001
export BASE_PATH="/"

echo "Starting the app on port $PORT..."
npm run dev > app.log 2>&1 &
PID=$!
echo $PID > .app.pid
echo "App started in background with PID $PID."
echo "Local Access Link: http://localhost:$PORT$BASE_PATH"
echo "Logs are being written to app.log"
