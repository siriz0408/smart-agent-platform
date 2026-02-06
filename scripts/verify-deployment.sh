#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Smart Agent - Deployment Verification Script
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Verifies that a deployment is healthy by checking:
#   1. Frontend loads (HTTP 200)
#   2. Security headers are present
#   3. Supabase API is reachable
#   4. Edge functions are responding
#   5. Page content is valid HTML with React root
#
# Usage:
#   ./scripts/verify-deployment.sh                    # Check production
#   ./scripts/verify-deployment.sh <url>              # Check specific URL
#   ./scripts/verify-deployment.sh --preview          # Check latest preview
#   DEPLOY_URL=https://... ./scripts/verify-deployment.sh
#
# Exit codes:
#   0 = All checks passed
#   1 = One or more critical checks failed
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────
PRODUCTION_URL="https://smart-agent-platform-sigma.vercel.app"
SUPABASE_URL="${SUPABASE_URL:-https://sthnezuadfbmbqlxiwtq.supabase.co}"
TIMEOUT=15
MAX_RETRIES=3
RETRY_DELAY=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Resolve deploy URL ──────────────────────────────────────────────
if [ "${1:-}" = "--preview" ]; then
  # Try to get the latest Vercel preview URL
  if command -v vercel &> /dev/null; then
    DEPLOY_URL=$(vercel ls --json 2>/dev/null | node -e "
      const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      const latest = Array.isArray(data) ? data[0] : null;
      console.log(latest?.url ? 'https://' + latest.url : '');
    " 2>/dev/null || echo "")
    if [ -z "$DEPLOY_URL" ]; then
      echo -e "${RED}Could not detect preview URL. Use: ./scripts/verify-deployment.sh <url>${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Vercel CLI not installed. Use: ./scripts/verify-deployment.sh <url>${NC}"
    exit 1
  fi
elif [ -n "${1:-}" ]; then
  DEPLOY_URL="$1"
else
  DEPLOY_URL="${DEPLOY_URL:-$PRODUCTION_URL}"
fi

# ── State tracking ──────────────────────────────────────────────────
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0
CHECKS_TOTAL=0
START_TIME=$(date +%s)

pass() {
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  echo -e "  ${GREEN}✅ $1${NC}"
}

fail() {
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  echo -e "  ${RED}❌ $1${NC}"
}

warn() {
  CHECKS_WARNED=$((CHECKS_WARNED + 1))
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  echo -e "  ${YELLOW}⚠️  $1${NC}"
}

info() {
  echo -e "  ${CYAN}$1${NC}"
}

# ── Header ──────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  🔍 Smart Agent - Deployment Verification${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BLUE}URL:${NC}       $DEPLOY_URL"
echo -e "  ${BLUE}Supabase:${NC}  $SUPABASE_URL"
echo -e "  ${BLUE}Time:${NC}      $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ── Check 1: Frontend Health ────────────────────────────────────────
echo -e "${BOLD}[1/5] Frontend Health Check${NC}"

FRONTEND_OK=false
for i in $(seq 1 $MAX_RETRIES); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$DEPLOY_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    FRONTEND_OK=true
    break
  fi
  if [ $i -lt $MAX_RETRIES ]; then
    info "Attempt $i/$MAX_RETRIES: HTTP $HTTP_CODE, retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  fi
done

if [ "$FRONTEND_OK" = true ]; then
  pass "Frontend reachable (HTTP $HTTP_CODE)"

  # Measure response time
  RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time $TIMEOUT "$DEPLOY_URL" 2>/dev/null || echo "0")
  RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "?")
  info "Response time: ${RESPONSE_MS}ms"
else
  fail "Frontend unreachable after $MAX_RETRIES attempts (last HTTP $HTTP_CODE)"
fi
echo ""

# ── Check 2: Security Headers ──────────────────────────────────────
echo -e "${BOLD}[2/5] Security Headers${NC}"

HEADERS=$(curl -s -I --max-time $TIMEOUT "$DEPLOY_URL" 2>/dev/null || echo "")
HEADERS_MISSING=""

check_header() {
  local header="$1"
  local expected="${2:-}"
  if echo "$HEADERS" | grep -iq "$header"; then
    if [ -n "$expected" ]; then
      local value=$(echo "$HEADERS" | grep -i "$header" | head -1 | cut -d: -f2- | tr -d '[:space:]')
      if echo "$value" | grep -iq "$expected"; then
        pass "$header: $value"
      else
        warn "$header present but unexpected value: $value"
      fi
    else
      pass "$header present"
    fi
  else
    warn "$header missing"
    HEADERS_MISSING="$HEADERS_MISSING $header"
  fi
}

check_header "x-content-type-options" "nosniff"
check_header "x-frame-options" "DENY"
check_header "x-xss-protection"
check_header "content-security-policy"
echo ""

# ── Check 3: Supabase Connectivity ─────────────────────────────────
echo -e "${BOLD}[3/5] Supabase Connectivity${NC}"

SUPA_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$SUPABASE_URL/rest/v1/" 2>/dev/null || echo "000")

# Supabase REST endpoint returns various codes depending on auth:
# 200 = public access, 401 = requires auth, 406 = not acceptable
# All indicate the server is running
if [ "$SUPA_CODE" = "200" ] || [ "$SUPA_CODE" = "401" ] || [ "$SUPA_CODE" = "406" ] || [ "$SUPA_CODE" = "403" ]; then
  pass "Supabase REST API responding (HTTP $SUPA_CODE)"
else
  # Try base URL as fallback
  SUPA_BASE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$SUPABASE_URL" 2>/dev/null || echo "000")
  if [ "$SUPA_BASE" = "200" ] || [ "$SUPA_BASE" = "301" ] || [ "$SUPA_BASE" = "302" ]; then
    pass "Supabase base URL reachable (HTTP $SUPA_BASE)"
  else
    fail "Supabase unreachable (REST: HTTP $SUPA_CODE, Base: HTTP $SUPA_BASE)"
  fi
fi

# Check Supabase Auth endpoint
SUPA_AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$SUPABASE_URL/auth/v1/health" 2>/dev/null || echo "000")
if [ "$SUPA_AUTH_CODE" = "200" ]; then
  pass "Supabase Auth healthy"
else
  warn "Supabase Auth health check returned HTTP $SUPA_AUTH_CODE"
fi
echo ""

# ── Check 4: Edge Functions ─────────────────────────────────────────
echo -e "${BOLD}[4/5] Edge Functions${NC}"

FUNCTIONS=("universal-search" "ai-chat" "search-documents" "index-document" "calculate-profile-completion")
FUNC_REACHABLE=0
FUNC_TOTAL=${#FUNCTIONS[@]}

for FUNC in "${FUNCTIONS[@]}"; do
  URL="$SUPABASE_URL/functions/v1/$FUNC"
  FUNC_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
    -X OPTIONS "$URL" \
    -H "Origin: $DEPLOY_URL" 2>/dev/null || echo "000")

  # OPTIONS 200/204 = CORS configured, function exists
  # 401 = function exists, auth required (still good)
  # 404 = function not deployed
  if [ "$FUNC_CODE" = "200" ] || [ "$FUNC_CODE" = "204" ] || [ "$FUNC_CODE" = "401" ]; then
    pass "$FUNC (HTTP $FUNC_CODE)"
    FUNC_REACHABLE=$((FUNC_REACHABLE + 1))
  elif [ "$FUNC_CODE" = "000" ]; then
    fail "$FUNC (timeout/unreachable)"
  else
    warn "$FUNC (HTTP $FUNC_CODE)"
  fi
done

if [ $FUNC_REACHABLE -eq 0 ]; then
  info "No edge functions reachable - check Supabase deployment"
fi
echo ""

# ── Check 5: Page Content Validation ───────────────────────────────
echo -e "${BOLD}[5/5] Content Validation${NC}"

BODY=$(curl -s --max-time $TIMEOUT "$DEPLOY_URL" 2>/dev/null || echo "")

if [ -n "$BODY" ]; then
  # Valid HTML
  if echo "$BODY" | grep -qi "<!doctype html\|<html"; then
    pass "Valid HTML document"
  else
    fail "Response is not HTML"
  fi

  # React root
  if echo "$BODY" | grep -q 'id="root"'; then
    pass "React root element present"
  else
    warn "React root element not found"
  fi

  # JS assets
  if echo "$BODY" | grep -q 'src="/assets/'; then
    pass "JavaScript assets referenced"
  else
    warn "JS assets not found in HTML"
  fi

  # Error pages
  if echo "$BODY" | grep -qi "application error\|internal server error\|502 bad gateway\|503 service"; then
    fail "Error page detected in response"
  else
    pass "No error pages detected"
  fi
else
  fail "Empty response from frontend"
fi
echo ""

# ── Summary ─────────────────────────────────────────────────────────
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  📋 VERIFICATION SUMMARY${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC}  $CHECKS_PASSED"
echo -e "  ${YELLOW}Warned:${NC}  $CHECKS_WARNED"
echo -e "  ${RED}Failed:${NC}  $CHECKS_FAILED"
echo -e "  Total:   $CHECKS_TOTAL checks in ${DURATION}s"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}✅ DEPLOYMENT VERIFIED${NC}"
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
else
  echo -e "  ${RED}${BOLD}❌ DEPLOYMENT VERIFICATION FAILED${NC}"
  echo ""
  echo -e "  ${YELLOW}Troubleshooting:${NC}"
  echo "    1. Check Vercel dashboard: https://vercel.com/dashboard"
  echo "    2. Check Supabase dashboard: https://supabase.com/dashboard"
  echo "    3. Review recent git commits: git log --oneline -5"
  echo "    4. Check edge function logs: supabase functions logs"
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi
