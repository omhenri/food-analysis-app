#!/bin/bash

# API Test Script for Food Impact Backend
# This script tests the API endpoints using curl

API_URL="http://localhost:5000"
echo "🧪 Testing Food Impact API at $API_URL"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test health check
echo "1. Testing Health Check..."
health_response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$API_URL/health")
health_status=$(tail -c 3 <<< "$health_response")
health_body=$(head -n -1 <<< "$health_response" | head -n 1)

if [ "$health_status" -eq 200 ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "Response: $health_body"
else
    echo -e "${RED}❌ Health check failed (Status: $health_status)${NC}"
fi

echo ""

# Test analyze food endpoint
echo "2. Testing Analyze Food Endpoint..."

# Test valid food
echo "   Testing valid food: 'grilled chicken breast'"
analyze_response=$(curl -s -w "%{http_code}" -o /tmp/analyze_response.json \
    -X POST "$API_URL/api/analyze-food" \
    -H "Content-Type: application/json" \
    -d '{"food_name": "grilled chicken breast"}')

analyze_status=$(tail -c 3 <<< "$analyze_response")

if [ "$analyze_status" -eq 200 ]; then
    echo -e "${GREEN}✅ Analyze food successful${NC}"

    # Check response structure
    if command -v jq &> /dev/null; then
        ingredients_count=$(jq '.ingredients | length' /tmp/analyze_response.json 2>/dev/null || echo "0")
        substances_count=$(jq '.substances | length' /tmp/analyze_response.json 2>/dev/null || echo "0")
        tips_count=$(jq '.mitigation_tips | length' /tmp/analyze_response.json 2>/dev/null || echo "0")
        has_disclaimer=$(jq 'has("disclaimer")' /tmp/analyze_response.json 2>/dev/null || echo "false")

        echo "   📊 Response structure:"
        echo "      - Ingredients: $ingredients_count"
        echo "      - Substances: $substances_count"
        echo "      - Tips: $tips_count"
        echo "      - Has disclaimer: $has_disclaimer"

        # Show sample data
        echo "   🍗 Sample ingredients:"
        jq '.ingredients[:3]' /tmp/analyze_response.json 2>/dev/null || echo "   (jq not available)"
    else
        echo "   ⚠️ jq not available for detailed response analysis"
        head -n 5 /tmp/analyze_response.json
    fi
else
    echo -e "${RED}❌ Analyze food failed (Status: $analyze_status)${NC}"
    cat /tmp/analyze_response.json
fi

echo ""

# Test invalid input
echo "3. Testing Input Validation..."
echo "   Testing empty food name..."
invalid_response=$(curl -s -w "%{http_code}" -o /tmp/invalid_response.json \
    -X POST "$API_URL/api/analyze-food" \
    -H "Content-Type: application/json" \
    -d '{"food_name": ""}')

invalid_status=$(tail -c 3 <<< "$invalid_response")

if [ "$invalid_status" -eq 400 ]; then
    echo -e "${GREEN}✅ Input validation working${NC}"
else
    echo -e "${YELLOW}⚠️ Input validation: Expected 400, got $invalid_status${NC}"
fi

echo ""

# Test rate limiting
echo "4. Testing Rate Limiting..."
echo "   Making multiple rapid requests..."

rate_limited=false
for i in {1..12}
do
    rate_response=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST "$API_URL/api/analyze-food" \
        -H "Content-Type: application/json" \
        -d "{\"food_name\": \"test_food_$i\"}")

    if [ "$rate_response" -eq 429 ]; then
        echo -e "${GREEN}✅ Rate limiting activated on request $i${NC}"
        rate_limited=true
        break
    fi

    # Small delay to avoid overwhelming
    sleep 0.1
done

if [ "$rate_limited" = false ]; then
    echo -e "${YELLOW}⚠️ Rate limiting may not be working (no 429 response)${NC}"
fi

echo ""

# Clean up
rm -f /tmp/health_response.json /tmp/analyze_response.json /tmp/invalid_response.json

echo "🏁 API Testing Complete!"
echo ""
echo "📖 For more detailed testing, run:"
echo "   python tests/test_api.py"
echo ""
echo "📚 See README.md for complete API documentation"
