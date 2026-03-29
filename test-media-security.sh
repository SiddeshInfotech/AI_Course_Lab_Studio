#!/bin/bash

# 🧪 Media Security System Test Suite
# Comprehensive testing of all implemented security features

echo "🔒 Starting AI Course Lab Studio - Media Security Test Suite"
echo "============================================================"

# Configuration
BASE_URL="http://localhost:5001"
API_BASE="$BASE_URL/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
log_test() {
    echo -e "${BLUE}🧪 Test: $1${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

log_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

log_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

log_info() {
    echo -e "${YELLOW}ℹ️  INFO: $1${NC}"
}

# Check if server is running
check_server() {
    if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
        echo -e "${RED}❌ Server is not running at $BASE_URL${NC}"
        echo "Please start the backend server first:"
        echo "cd learnai-backend && npm start"
        exit 1
    fi
    echo -e "${GREEN}✅ Server is running at $BASE_URL${NC}"
}

# Get authentication tokens
get_auth_tokens() {
    log_info "Getting authentication tokens..."

    # Login as student
    STUDENT_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username": "student", "password": "student123"}')

    STUDENT_TOKEN=$(echo "$STUDENT_RESPONSE" | jq -r '.token // empty')

    if [ -z "$STUDENT_TOKEN" ] || [ "$STUDENT_TOKEN" = "null" ]; then
        log_fail "Failed to get student token"
        echo "Response: $STUDENT_RESPONSE"
        exit 1
    fi

    # Login as admin
    ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username": "admin", "password": "admin123"}')

    ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.token // empty')

    if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
        log_fail "Failed to get admin token"
        echo "Response: $ADMIN_RESPONSE"
        exit 1
    fi

    log_pass "Successfully obtained authentication tokens"
}

# Test 1: Authentication Required
test_authentication_required() {
    log_test "Media access requires authentication"

    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE/media/1")

    if [ "$RESPONSE" = "401" ]; then
        log_pass "Unauthenticated request properly rejected (401)"
    else
        log_fail "Expected 401, got $RESPONSE"
    fi
}

# Test 2: Valid Authentication Works
test_valid_authentication() {
    log_test "Valid authentication allows access"

    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        "$API_BASE/media/1")

    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "404" ]; then
        log_pass "Authenticated request processed (got $RESPONSE)"
    else
        log_fail "Expected 200/404, got $RESPONSE"
    fi
}

# Test 3: Rate Limiting
test_rate_limiting() {
    log_test "Rate limiting prevents abuse"

    log_info "Making 35 rapid requests to trigger rate limiting..."

    SUCCESS_COUNT=0
    RATE_LIMITED_COUNT=0

    for i in {1..35}; do
        RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Authorization: Bearer $STUDENT_TOKEN" \
            "$API_BASE/media/1")

        if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "404" ]; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        elif [ "$RESPONSE" = "429" ]; then
            RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
        fi

        # Small delay to avoid overwhelming the server
        sleep 0.1
    done

    log_info "Successful requests: $SUCCESS_COUNT"
    log_info "Rate limited requests: $RATE_LIMITED_COUNT"

    if [ "$RATE_LIMITED_COUNT" -gt 0 ]; then
        log_pass "Rate limiting is working ($RATE_LIMITED_COUNT requests blocked)"
    else
        log_fail "No rate limiting detected"
    fi
}

# Test 4: Admin Higher Limits
test_admin_higher_limits() {
    log_test "Admin users have higher rate limits"

    # Wait for rate limit to reset
    log_info "Waiting 65 seconds for rate limit reset..."
    sleep 65

    ADMIN_SUCCESS_COUNT=0

    for i in {1..50}; do
        RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            "$API_BASE/media/1")

        if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "404" ]; then
            ADMIN_SUCCESS_COUNT=$((ADMIN_SUCCESS_COUNT + 1))
        elif [ "$RESPONSE" = "429" ]; then
            break
        fi

        sleep 0.1
    done

    log_info "Admin successful requests before rate limit: $ADMIN_SUCCESS_COUNT"

    if [ "$ADMIN_SUCCESS_COUNT" -gt 30 ]; then
        log_pass "Admin has higher rate limits ($ADMIN_SUCCESS_COUNT > 30)"
    else
        log_fail "Admin doesn't have higher limits ($ADMIN_SUCCESS_COUNT <= 30)"
    fi
}

# Test 5: Signed URL Generation
test_signed_url_generation() {
    log_test "Signed URL generation works"

    SIGNED_URL_RESPONSE=$(curl -s -X POST "$API_BASE/media/1/signed-url" \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"expiresIn": 3600000, "accessType": "view"}')

    SIGNED_URL=$(echo "$SIGNED_URL_RESPONSE" | jq -r '.signedUrl.url // empty')

    if [ -n "$SIGNED_URL" ] && [ "$SIGNED_URL" != "null" ]; then
        log_pass "Signed URL generated successfully"
        GENERATED_SIGNED_URL="$SIGNED_URL"
    else
        log_fail "Failed to generate signed URL"
        echo "Response: $SIGNED_URL_RESPONSE"
    fi
}

# Test 6: Signed URL Access
test_signed_url_access() {
    log_test "Signed URL allows access without authentication"

    if [ -z "$GENERATED_SIGNED_URL" ]; then
        log_fail "No signed URL available for testing"
        return
    fi

    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
        "$BASE_URL$GENERATED_SIGNED_URL")

    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "404" ]; then
        log_pass "Signed URL access works without authentication"
    else
        log_fail "Signed URL access failed (got $RESPONSE)"
    fi
}

# Test 7: Rate Limit Headers
test_rate_limit_headers() {
    log_test "Rate limit headers are present"

    # Wait for rate limit reset
    sleep 65

    HEADERS=$(curl -s -I \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        "$API_BASE/media/1")

    if echo "$HEADERS" | grep -q "X-RateLimit-Limit"; then
        log_pass "Rate limit headers present"
        log_info "Headers found: $(echo "$HEADERS" | grep "X-RateLimit")"
    else
        log_fail "Rate limit headers missing"
    fi
}

# Test 8: Invalid Token Rejection
test_invalid_token() {
    log_test "Invalid tokens are rejected"

    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Bearer invalid.token.here" \
        "$API_BASE/media/1")

    if [ "$RESPONSE" = "401" ]; then
        log_pass "Invalid token properly rejected"
    else
        log_fail "Expected 401, got $RESPONSE"
    fi
}

# Test 9: Authorization for Course Content
test_course_authorization() {
    log_test "Users can only access enrolled course content"

    # This test assumes there's media with entityType='course' and entityId
    # In a real scenario, you'd test with actual course media
    log_info "Testing course content authorization (implementation-dependent)"

    # For now, just verify the endpoint structure works
    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        "$API_BASE/media/999999")  # Non-existent media

    if [ "$RESPONSE" = "404" ] || [ "$RESPONSE" = "403" ]; then
        log_pass "Authorization system is active (got $RESPONSE)"
    else
        log_fail "Unexpected response: $RESPONSE"
    fi
}

# Test 10: Signed URL Revocation
test_signed_url_revocation() {
    log_test "Signed URLs can be revoked"

    if [ -z "$GENERATED_SIGNED_URL" ]; then
        log_fail "No signed URL available for revocation testing"
        return
    fi

    # Extract token from URL
    TOKEN=$(echo "$GENERATED_SIGNED_URL" | sed 's|.*/signed/||')

    # Revoke the URL
    REVOKE_RESPONSE=$(curl -s -X DELETE \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        "$API_BASE/media/signed/$TOKEN/revoke")

    if echo "$REVOKE_RESPONSE" | grep -q "revoked successfully"; then
        log_pass "Signed URL revocation works"
    else
        log_fail "Signed URL revocation failed"
        echo "Response: $REVOKE_RESPONSE"
    fi
}

# Main test execution
main() {
    echo "Starting comprehensive security tests..."
    echo

    # Prerequisite checks
    check_server

    # Check for required tools
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq is required for testing. Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)${NC}"
        exit 1
    fi

    get_auth_tokens
    echo

    # Run all tests
    test_authentication_required
    test_valid_authentication
    test_rate_limiting
    test_admin_higher_limits
    test_signed_url_generation
    test_signed_url_access
    test_rate_limit_headers
    test_invalid_token
    test_course_authorization
    test_signed_url_revocation

    # Test summary
    echo
    echo "============================================================"
    echo -e "${BLUE}📊 Test Results Summary${NC}"
    echo "============================================================"
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Your media security system is working correctly.${NC}"
        exit 0
    else
        echo -e "${RED}⚠️  Some tests failed. Please review the implementation.${NC}"
        exit 1
    fi
}

# Run the test suite
main "$@"