#!/bin/bash

# Test script for /api/v2/upload-json-report-api-key endpoint
# Usage: ./test-upload-json-report.sh <API_KEY> <REPORT_FILE>

API_KEY="${1:-}"
REPORT_FILE="${2:-}"
ENDPOINT="http://localhost:3001/api/v2/upload-json-report-api-key"

if [ -z "$API_KEY" ] || [ -z "$REPORT_FILE" ]; then
  echo "Error: API key and report file are required"
  echo "Usage: $0 <API_KEY> <REPORT_FILE>"
  exit 1
fi

if [ ! -f "$REPORT_FILE" ]; then
  echo "Error: Report file not found: $REPORT_FILE"
  exit 1
fi

echo "Uploading JSON report to $ENDPOINT"
echo "Using API Key: ${API_KEY:0:10}..."
echo "Report file: $REPORT_FILE"
echo ""

curl -X POST "$ENDPOINT" \
  -H "x-api-key: $API_KEY" \
  -F "report=@$REPORT_FILE" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "Upload complete!"
