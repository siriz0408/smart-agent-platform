#!/bin/bash

# Quick Search Test Script
# Tests the universal-search edge function with curl

echo "🔍 Testing Universal Search Edge Function"
echo "=========================================="
echo ""

SUPABASE_URL="${VITE_SUPABASE_URL:-https://sthnezuadfbmbqlxiwtq.supabase.co}"
ANON_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-your-anon-key-here}"

# First, let's check if the function is deployed
echo "📡 Step 1: Checking if edge function exists..."
curl -s -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/functions/v1/" \
  | head -20

echo ""
echo ""
echo "🧪 Step 2: Testing universal-search (without auth - should fail)..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/functions/v1/universal-search" \
  -d '{
    "query": "sarah",
    "entityTypes": ["contact"],
    "matchThreshold": 0.0,
    "matchCountPerType": 10
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

echo ""
echo ""
echo "📊 Step 3: Testing RPC function directly (check if it exists)..."
curl -s -X POST \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/rpc/search_all_entities_hybrid" \
  -d '{
    "p_query": "sarah",
    "p_query_embedding": '"$(python3 -c 'import json; print(json.dumps([0.1]*1536))')"',
    "p_tenant_id": "5098bedb-a0bc-40ae-83fa-799df8f44981",
    "p_entity_types": ["contact"],
    "p_match_threshold": 0.0,
    "p_match_count_per_type": 10
  }' | jq '.' 2>/dev/null || echo "RPC call failed or returned non-JSON"

echo ""
echo ""
echo "✅ Test complete"
echo ""
echo "Next steps:"
echo "1. Check Supabase logs at: https://supabase.com/dashboard/project/sthnezuadfbmbqlxiwtq/logs/edge-functions"
echo "2. Look for 🔍 emoji log messages"
echo "3. Check what tenant_id is being used"
