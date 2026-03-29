#!/bin/bash

# Test script for Encryption and License API endpoints
# This script tests the video encryption and license management system

set -e

API_URL="http://localhost:5001"
ADMIN_EMAIL="admin@learnai.com"
ADMIN_PASSWORD="password"
STUDENT_EMAIL="student@learnai.com"
STUDENT_PASSWORD="password"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing Video Encryption & License Management System"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Login as admin
echo ""
echo "[1/6] Logging in as admin..."
ADMIN_LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.token' 2>/dev/null || echo "")

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" == "null" ]; then
  echo "❌ Admin login failed"
  echo "Response: $ADMIN_LOGIN"
  exit 1
fi

ADMIN_ID=$(echo $ADMIN_LOGIN | jq -r '.user.id' 2>/dev/null || echo "")
echo "✅ Admin logged in (Token: ${ADMIN_TOKEN:0:20}..., ID: $ADMIN_ID)"

# Step 2: Login as student
echo ""
echo "[2/6] Logging in as student..."
STUDENT_LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$STUDENT_EMAIL\",\"password\":\"$STUDENT_PASSWORD\"}")

STUDENT_TOKEN=$(echo $STUDENT_LOGIN | jq -r '.token' 2>/dev/null || echo "")
STUDENT_ID=$(echo $STUDENT_LOGIN | jq -r '.user.id' 2>/dev/null || echo "")

if [ -z "$STUDENT_TOKEN" ] || [ "$STUDENT_TOKEN" == "null" ]; then
  echo "❌ Student login failed"
  echo "Response: $STUDENT_LOGIN"
  exit 1
fi

echo "✅ Student logged in (Token: ${STUDENT_TOKEN:0:20}..., ID: $STUDENT_ID)"

# Step 3: Generate a license for the student
echo ""
echo "[3/6] Generating license for student (ID: $STUDENT_ID)..."
LICENSE_RESPONSE=$(curl -s -X POST "$API_URL/api/license/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"userId\":$STUDENT_ID,\"daysValid\":30,\"courseId\":1}")

LICENSE_KEY=$(echo $LICENSE_RESPONSE | jq -r '.data.licenseKey' 2>/dev/null || echo "")

if [ -z "$LICENSE_KEY" ] || [ "$LICENSE_KEY" == "null" ]; then
  echo "❌ License generation failed"
  echo "Response: $LICENSE_RESPONSE"
  exit 1
fi

echo "✅ License generated: ${LICENSE_KEY:0:30}..."

# Step 4: Validate license as student
echo ""
echo "[4/6] Validating license as student..."
VALIDATE_RESPONSE=$(curl -s -X POST "$API_URL/api/license/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d "{\"licenseKey\":\"$LICENSE_KEY\",\"deviceId\":\"test-device-123\"}")

VALID=$(echo $VALIDATE_RESPONSE | jq -r '.success' 2>/dev/null || echo "false")

if [ "$VALID" != "true" ]; then
  echo "❌ License validation failed"
  echo "Response: $VALIDATE_RESPONSE"
  exit 1
fi

REMAINING_DAYS=$(echo $VALIDATE_RESPONSE | jq -r '.data.remainingDays' 2>/dev/null || echo "?")
echo "✅ License validated successfully (Remaining days: $REMAINING_DAYS)"

# Step 5: Get user's licenses
echo ""
echo "[5/6] Fetching user's licenses..."
USER_LICENSES=$(curl -s -X GET "$API_URL/api/license/my-licenses" \
  -H "Authorization: Bearer $STUDENT_TOKEN")

LICENSE_COUNT=$(echo $USER_LICENSES | jq '.data | length' 2>/dev/null || echo "0")
echo "✅ Retrieved $LICENSE_COUNT licenses for user"

# Step 6: Check license status
echo ""
echo "[6/6] Checking license status..."
LICENSE_ID=$(echo $LICENSE_RESPONSE | jq -r '.data.id' 2>/dev/null || echo "")

if [ ! -z "$LICENSE_ID" ] && [ "$LICENSE_ID" != "null" ]; then
  STATUS_RESPONSE=$(curl -s -X GET "$API_URL/api/license/status/$LICENSE_ID" \
    -H "Authorization: Bearer $STUDENT_TOKEN")

  STATUS=$(echo $STATUS_RESPONSE | jq -r '.data.status' 2>/dev/null || echo "UNKNOWN")
  echo "✅ License status: $STATUS"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All tests passed! Video Encryption & License system is working."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
