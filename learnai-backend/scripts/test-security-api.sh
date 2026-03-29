#!/bin/bash

# Security Implementation Testing Script
# Test all new security features

set -e

# Configuration
API_BASE="http://localhost:3000/api"
TOKEN="${JWT_TOKEN:-your-jwt-token-here}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}LearnAI Security Implementation Tests${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Function to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_code=$4

  echo -e "${YELLOW}Testing:${NC} $method $endpoint"

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$data")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}✓ Status $http_code${NC}"
    echo -e "Response: $body\n"
    return 0
  else
    echo -e "${RED}✗ Expected $expected_code, got $http_code${NC}"
    echo -e "Response: $body\n"
    return 1
  fi
}

echo -e "${YELLOW}1. Testing Access Logging${NC}\n"

test_endpoint "POST" "/security/log-access" \
  '{
    "videoId": 1,
    "courseId": 1,
    "duration": 300,
    "completionPercentage": 50
  }' "200"

echo -e "${YELLOW}2. Testing Get User's Own Logs${NC}\n"

test_endpoint "GET" "/security/my-logs" "" "200"

echo -e "${YELLOW}3. Testing License Status Check${NC}\n"

test_endpoint "GET" "/license/status/1" "" "200"

echo -e "${YELLOW}4. Testing Admin: Get All Logs${NC}\n"

# Note: This requires admin token
test_endpoint "GET" "/security/logs?limit=10&offset=0" "" "200"

echo -e "${YELLOW}5. Testing Admin: Get Security Alerts${NC}\n"

test_endpoint "GET" "/security/alerts?reviewed=false" "" "200"

echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}All tests completed!${NC}"
echo -e "${YELLOW}========================================${NC}\n"

echo -e "Next steps:"
echo -e "1. Check database: psql -d learnai_db"
echo -e "2. Query logs: SELECT * FROM video_access_log LIMIT 10;"
echo -e "3. Query alerts: SELECT * FROM security_alert LIMIT 10;"
echo -e "4. Monitor anomalies in real-time"
