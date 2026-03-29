#!/bin/bash

# 🧪 Admin Course Management System Test
# Validates the enhanced course management functionality

echo "🔧 Testing Enhanced Admin Course Management System"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:5001/api"
ADMIN_TOKEN=""
STUDENT_TOKEN=""

# Test result counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_test() {
    echo -e "${BLUE}🧪 Testing: $1${NC}"
}

log_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((TESTS_FAILED++))
}

# Get authentication tokens
get_tokens() {
    echo "🔐 Getting authentication tokens..."

    # Login as admin
    ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username": "admin", "password": "admin123"}')

    ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.token // empty')

    if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
        echo "❌ Failed to get admin token"
        echo "Response: $ADMIN_RESPONSE"
        exit 1
    fi

    # Login as student
    STUDENT_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username": "student", "password": "student123"}')

    STUDENT_TOKEN=$(echo "$STUDENT_RESPONSE" | jq -r '.token // empty')

    if [ -z "$STUDENT_TOKEN" ] || [ "$STUDENT_TOKEN" = "null" ]; then
        echo "❌ Failed to get student token"
        exit 1
    fi

    log_pass "Authentication tokens acquired"
}

# Test 1: Admin can access course statistics
test_course_stats() {
    log_test "Course statistics access (admin only)"

    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$API_BASE/courses/admin/stats")

    if [ "$RESPONSE" = "200" ]; then
        log_pass "Admin can access course statistics"
    else
        log_fail "Admin statistics access failed (HTTP $RESPONSE)"
    fi
}

# Test 2: Student cannot access admin endpoints
test_student_restriction() {
    log_test "Student access restriction for admin endpoints"

    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        "$API_BASE/courses/admin/stats")

    if [ "$RESPONSE" = "403" ]; then
        log_pass "Students properly blocked from admin endpoints"
    else
        log_fail "Student restriction failed (expected 403, got $RESPONSE)"
    fi
}

# Test 3: Course creation (admin only)
test_course_creation() {
    log_test "Course creation with admin privileges"

    COURSE_DATA='{
        "title": "Test Course - Advanced Security",
        "description": "A comprehensive test course for security validation",
        "category": "Cybersecurity",
        "level": "advanced",
        "instructor": "Test Instructor",
        "duration": "4 weeks",
        "imageUrl": "https://example.com/test-image.jpg"
    }'

    RESPONSE=$(curl -s -X POST "$API_BASE/courses" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$COURSE_DATA")

    SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
    COURSE_ID=$(echo "$RESPONSE" | jq -r '.course.id // empty')

    if [ "$SUCCESS" = "true" ] && [ -n "$COURSE_ID" ]; then
        log_pass "Course creation successful (ID: $COURSE_ID)"
        export CREATED_COURSE_ID="$COURSE_ID"
        export CREATED_COURSE_TITLE=$(echo "$RESPONSE" | jq -r '.course.title')
    else
        log_fail "Course creation failed"
        echo "Response: $RESPONSE"
    fi
}

# Test 4: Student cannot create courses
test_student_course_creation() {
    log_test "Student course creation restriction"

    COURSE_DATA='{
        "title": "Unauthorized Course",
        "description": "This should fail",
        "category": "Test",
        "level": "beginner",
        "instructor": "Student",
        "duration": "1 week"
    }'

    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$COURSE_DATA" \
        "$API_BASE/courses")

    if [ "$RESPONSE" = "403" ]; then
        log_pass "Students properly blocked from creating courses"
    else
        log_fail "Student course creation not properly restricted (got $RESPONSE)"
    fi
}

# Test 5: Course update (admin only)
test_course_update() {
    if [ -z "$CREATED_COURSE_ID" ]; then
        log_fail "No course ID available for update test"
        return
    fi

    log_test "Course update functionality"

    UPDATE_DATA='{
        "title": "Updated Test Course - Advanced Security Pro",
        "description": "Updated description for security testing"
    }'

    RESPONSE=$(curl -s -X PUT "$API_BASE/courses/$CREATED_COURSE_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$UPDATE_DATA")

    SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')

    if [ "$SUCCESS" = "true" ]; then
        log_pass "Course update successful"
    else
        log_fail "Course update failed"
        echo "Response: $RESPONSE"
    fi
}

# Test 6: Course detailed list with metadata
test_detailed_course_list() {
    log_test "Detailed course list with metadata"

    RESPONSE=$(curl -s \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$API_BASE/courses/admin/detailed?page=1&limit=5")

    SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
    COURSE_COUNT=$(echo "$RESPONSE" | jq -r '.courses | length')

    if [ "$SUCCESS" = "true" ] && [ "$COURSE_COUNT" -gt "0" ]; then
        log_pass "Detailed course list retrieved ($COURSE_COUNT courses)"
    else
        log_fail "Detailed course list failed"
        echo "Response: $RESPONSE"
    fi
}

# Test 7: Course filtering and search
test_course_filtering() {
    log_test "Course filtering and search functionality"

    RESPONSE=$(curl -s \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$API_BASE/courses/admin/detailed?level=advanced&search=security")

    SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
    FILTERS=$(echo "$RESPONSE" | jq -r '.filters.level')

    if [ "$SUCCESS" = "true" ] && [ "$FILTERS" = "advanced" ]; then
        log_pass "Course filtering works correctly"
    else
        log_fail "Course filtering failed"
        echo "Response: $RESPONSE"
    fi
}

# Test 8: Input validation
test_input_validation() {
    log_test "Input validation for course creation"

    INVALID_DATA='{
        "title": "",
        "description": "Missing title should fail",
        "category": "Test",
        "level": "invalid_level",
        "instructor": "",
        "duration": ""
    }'

    RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/validation_response \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$INVALID_DATA" \
        "$API_BASE/courses")

    HTTP_CODE=$(tail -n 1 <<< "$RESPONSE")
    BODY_RESPONSE=$(cat /tmp/validation_response)

    if [ "$HTTP_CODE" = "400" ]; then
        log_pass "Input validation working (rejected invalid data)"
    else
        log_fail "Input validation failed (expected 400, got $HTTP_CODE)"
        echo "Body: $BODY_RESPONSE"
    fi
}

# Test 9: Course deletion protection (if has enrollments)
test_deletion_protection() {
    if [ -z "$CREATED_COURSE_ID" ]; then
        log_fail "No course ID available for deletion test"
        return
    fi

    log_test "Course deletion (admin only)"

    RESPONSE=$(curl -s -X DELETE "$API_BASE/courses/$CREATED_COURSE_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN")

    SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')

    if [ "$SUCCESS" = "true" ]; then
        log_pass "Course deletion successful"
    else
        # Check if it's because of enrollments
        MESSAGE=$(echo "$RESPONSE" | jq -r '.message // empty')
        if [[ "$MESSAGE" == *"enrollment"* ]]; then
            log_pass "Course deletion properly protected (has enrollments)"
        else
            log_fail "Course deletion failed unexpectedly"
            echo "Response: $RESPONSE"
        fi
    fi
}

# Main test execution
main() {
    echo "Starting enhanced course management tests..."
    echo

    # Check for required tools
    if ! command -v jq &> /dev/null; then
        echo "❌ jq is required for testing. Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
        exit 1
    fi

    # Check if server is running
    if ! curl -s "$API_BASE" > /dev/null 2>&1; then
        echo "❌ Server is not running at $API_BASE"
        echo "Please start the backend server first: cd learnai-backend && npm start"
        exit 1
    fi

    # Run tests
    get_tokens
    echo

    test_course_stats
    test_student_restriction
    test_course_creation
    test_student_course_creation
    test_course_update
    test_detailed_course_list
    test_course_filtering
    test_input_validation
    test_deletion_protection

    # Cleanup
    rm -f /tmp/validation_response

    # Summary
    echo
    echo "=================================================="
    echo "📊 Test Results Summary"
    echo "=================================================="
    echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

    if [ "$TESTS_FAILED" -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Your enhanced admin course management system is working correctly.${NC}"
        exit 0
    else
        echo -e "${RED}⚠️  Some tests failed. Please review the implementation.${NC}"
        exit 1
    fi
}

# Run the test suite
main "$@"