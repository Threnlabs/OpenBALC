#!/bin/bash
# Stop the OpenBALC app

cd "$(dirname "$0")"

# Helper function to check if a process belongs to this workspace
in_workspace() {
  local pid=$1
  local ws_dir="$(pwd)"
  
  # Check working directory of process
  if pwdx "$pid" 2>/dev/null | grep -q "$ws_dir"; then
    return 0
  fi
  
  # Fallback: check command line arguments/path
  if [ -f "/proc/$pid/cmdline" ]; then
    if tr '\0' ' ' < "/proc/$pid/cmdline" | grep -q "$ws_dir"; then
      return 0
    fi
  fi
  
  return 1
}

# Helper function to kill a process and all its descendants
kill_descendants() {
  local target_pid=$1
  if [ -z "$target_pid" ]; then
    return
  fi
  
  # Find child processes
  local children=$(pgrep -P "$target_pid" 2>/dev/null)
  for child in $children; do
    kill_descendants "$child"
  done
  
  # Only kill if it's in our workspace (safety check)
  if in_workspace "$target_pid"; then
    kill "$target_pid" 2>/dev/null
  fi
}

if [ -f .app.pid ]; then
  PID=$(cat .app.pid)
  echo "Stopping app with PID $PID..."
  
  kill_descendants "$PID"
  
  # Wait a bit for graceful termination, then force kill if still alive
  sleep 0.5
  if kill -0 "$PID" 2>/dev/null; then
    if in_workspace "$PID"; then
      kill -9 "$PID" 2>/dev/null
    fi
  fi
  
  rm -f .app.pid
  echo "App stopped."
else
  echo "App is not currently running (no .app.pid found)."
fi

# Fallback: find and clean up any remaining orphaned processes associated with this workspace
# matching 'vite'
echo "Checking for orphaned processes..."
ORPHANED_PIDS=$(pgrep -f "vite" 2>/dev/null)
for p in $ORPHANED_PIDS; do
  # Skip current script process
  if [ "$p" = "$$" ]; then
    continue
  fi
  
  if in_workspace "$p"; then
    echo "Cleaning up orphaned process $p..."
    kill "$p" 2>/dev/null
    sleep 0.2
    kill -9 "$p" 2>/dev/null
  fi
done

echo "Done."
