#!/bin/bash

# Cross-platform testing script for Food Analysis App

echo "🧪 Running Cross-Platform Tests for Food Analysis App"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0

# 1. Run utility tests
echo -e "\n${YELLOW}1. Testing Platform Utilities${NC}"
npm test -- --testPathPattern="utils/platform" --silent
RESULT=$?
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $RESULT -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
print_status $RESULT "Platform utilities tests"

# 2. Run accessibility tests
echo -e "\n${YELLOW}2. Testing Accessibility Features${NC}"
npm test -- --testPathPattern="utils/accessibility" --silent
RESULT=$?
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $RESULT -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
print_status $RESULT "Accessibility tests"

# 3. Run performance tests
echo -e "\n${YELLOW}3. Testing Performance Optimizations${NC}"
npm test -- --testPathPattern="utils/performance" --silent
RESULT=$?
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $RESULT -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
print_status $RESULT "Performance tests"

# 4. Run component tests
echo -e "\n${YELLOW}4. Testing Components with Cross-Platform Features${NC}"
npm test -- --testPathPattern="components" --silent
RESULT=$?
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $RESULT -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
print_status $RESULT "Component tests"

# 5. Run integration tests
echo -e "\n${YELLOW}5. Testing Cross-Platform Integration${NC}"
npm test -- --testPathPattern="integration" --silent
RESULT=$?
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $RESULT -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
print_status $RESULT "Integration tests"

# 6. Run performance dataset tests
echo -e "\n${YELLOW}6. Testing Large Dataset Performance${NC}"
npm test -- --testPathPattern="performance" --silent
RESULT=$?
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $RESULT -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
print_status $RESULT "Large dataset performance tests"

# Summary
echo -e "\n${YELLOW}📊 Test Summary${NC}"
echo "==============="
echo "Total test suites: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS))"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "\n${GREEN}🎉 All cross-platform tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please check the output above.${NC}"
    exit 1
fi