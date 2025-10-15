#!/bin/bash

# Test script for /v2/json-report/upload endpoint
# Usage: ./test-upload-json-report.sh <API_KEY>

API_KEY="${1:-YOUR_API_KEY_HERE}"
REPORT_FILE="example-reports/web-app-qa-hotfix-4645-2025-10-02-19-25-35.json"
ENDPOINT="http://localhost:3001/api/v2/json-report/upload"

if [ "$API_KEY" = "YOUR_API_KEY_HERE" ]; then
  echo "Error: Please provide an API key as the first argument"
  echo "Usage: $0 <API_KEY>"
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
