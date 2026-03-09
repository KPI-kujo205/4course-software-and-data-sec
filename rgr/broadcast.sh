#!/bin/sh

PORT=${1:-6000}
shift
DATA="$*"

if [ -z "$DATA" ]; then
  echo "Usage: $0 PORT \"MESSAGE\""
  echo "Example: $0 6000 \"Broadcast message to all nodes\""
  exit 1
fi

# Escape backslashes and double quotes for JSON
ESCAPED=$(printf '%s' "$DATA" | sed 's/\\/\\\\/g; s/"/\\"/g')

URL="http://localhost:${PORT}/initiate"

echo "Broadcasting message from port ${PORT} to ALL nodes..."

# Send broadcast request
curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "{\"isBroadcast\": true,\"data\":\"${ESCAPED}\"}"

echo ""
echo "Broadcast sent!"
