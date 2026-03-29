#!/bin/bash

echo "🧪 Testing Security Routes..."
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo "📌 Test 1: Health Check"
HEALTH=$(curl -s http://localhost:5001/api/health)
if [[ $HEALTH == *"ok"* ]]; then
  echo -e "${GREEN}✅ PASS${NC}: Backend is running"
else
  echo -e "${RED}❌ FAIL${NC}: Backend not responding"
  exit 1
fi
echo ""

# Test 2: GET /my-logs (should return empty array or 401 if no auth)
echo "📌 Test 2: GET /api/security/my-logs (without token)"
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5001/api/security/my-logs)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ $HTTP_CODE == "401" ]] || [[ $BODY == *"logs"* ]]; then
  echo -e "${GREEN}✅ PASS${NC}: Route is accessible (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
else
  echo -e "${RED}❌ FAIL${NC}: Got HTTP $HTTP_CODE"
  echo "   Response: $BODY"
fi
echo ""

# Test 3: POST /log-access (should return 401 if no auth)
echo "📌 Test 3: POST /api/security/log-access (without token)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5001/api/security/log-access \
  -H "Content-Type: application/json" \
  -d '{"videoId": 1, "deviceId": "test"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ $HTTP_CODE == "401" ]] || [[ $BODY == *"error"* ]] || [[ $BODY == *"Unauthorized"* ]]; then
  echo -e "${GREEN}✅ PASS${NC}: Route is accessible (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
else
  echo -e "${RED}❌ FAIL${NC}: Got HTTP $HTTP_CODE"
  echo "   Response: $BODY"
fi
echo ""

echo "================================"
echo "✅ All route tests completed!"
echo ""
echo "Next: Test with proper JWT token for full functionality"
