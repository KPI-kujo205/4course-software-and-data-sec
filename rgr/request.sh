#!/bin/sh

PORT=${1:-6000}
TARGET=${2:-d}
shift 2
DATA="$*"

if [ -z "$DATA" ]; then
  echo "Usage: $0 PORT TARGET DATA"
  exit 1
fi

ESCAPED=$(printf '%s' "$DATA" | sed 's/\\/\\\\/g; s/"/\\"/g')

URL="http://localhost:${PORT}/initiate"

echo "Step 1: Initiating TLS Handshake with ${TARGET}..."

# крок1: ініціалізація TLS-з'єднання
curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "{\"target\":\"${TARGET}\"}"

echo ""
echo "Waiting for handshake to complete..."

# чекати завершення рукопотискання
sleep 2

echo "Step 2: Sending encrypted data to ${TARGET}..."

curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "{\"target\":\"${TARGET}\",\"data\":\"${ESCAPED}\"}"

echo ""
echo "Done!"
