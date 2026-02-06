#!/bin/bash

# Document Indexing Audit Script
# Runs the audit-document-indexing edge function and displays results

echo "🔍 Running Document Indexing Audit"
echo "=================================="
echo ""

# Get Supabase URL and keys from environment or use defaults
SUPABASE_URL="${SUPABASE_URL:-https://sthnezuadfbmbqlxiwtq.supabase.co}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set"
  echo ""
  echo "Set it with:"
  echo "  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
  echo ""
  echo "Or add to .env.local:"
  echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
  exit 1
fi

echo "📡 Calling audit-document-indexing edge function..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/functions/v1/audit-document-indexing" \
  -d '{}')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Error: HTTP $HTTP_STATUS"
  echo ""
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

echo "✅ Audit Complete"
echo ""
echo "📊 Summary:"
echo "$BODY" | jq '.summary' 2>/dev/null || echo "Failed to parse summary"

echo ""
echo "🔍 Issues Found: $(echo "$BODY" | jq '.issues | length' 2>/dev/null || echo '?')"
echo ""

# Show critical issues first
echo "🚨 Critical Issues:"
echo "$BODY" | jq -r '.issues[] | select(.severity == "critical") | "  - [\(.type)] \(.documentName): \(.message)"' 2>/dev/null || echo "  None"

echo ""
echo "⚠️  High Priority Issues:"
echo "$BODY" | jq -r '.issues[] | select(.severity == "high") | "  - [\(.type)] \(.documentName): \(.message)"' 2>/dev/null || echo "  None"

echo ""
echo "💡 Recommendations:"
echo "$BODY" | jq -r '.recommendations[] | "  - \(.)"' 2>/dev/null || echo "  None"

echo ""
echo "📄 Full Report:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

echo ""
echo "💾 Save full report to file? (y/n)"
read -r SAVE
if [ "$SAVE" = "y" ] || [ "$SAVE" = "Y" ]; then
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  FILENAME="document-audit-${TIMESTAMP}.json"
  echo "$BODY" | jq '.' > "$FILENAME" 2>/dev/null || echo "$BODY" > "$FILENAME"
  echo "✅ Saved to: $FILENAME"
fi
