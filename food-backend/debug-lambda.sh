#!/bin/bash

# Debug Lambda Function Issues
# This script helps identify why the Lambda function is returning 500 errors

set -e

# Configuration
FUNCTION_NAME="rejuvenai-backend"
REGION="us-east-1"
LOG_GROUP="/aws/lambda/${FUNCTION_NAME}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Debugging Lambda Function: ${FUNCTION_NAME}${NC}"

# Check AWS credentials
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured. Run:${NC}"
    echo -e "aws configure --profile rejuvenai"
    exit 1
fi

echo -e "${GREEN}✅ AWS credentials verified${NC}"

# Check if Lambda function exists
echo -e "\n${BLUE}📋 Checking Lambda function...${NC}"
if ! aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo -e "${RED}❌ Lambda function '${FUNCTION_NAME}' not found${NC}"
    echo -e "${YELLOW}Run: ./deploy-to-aws.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Lambda function exists${NC}"

# Get function configuration
echo -e "\n${BLUE}⚙️ Function configuration:${NC}"
aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" \
    --query '{Name:Configuration.FunctionName, Runtime:Configuration.Runtime, Handler:Configuration.Handler, Memory:Configuration.MemorySize, Timeout:Configuration.Timeout, EnvVars:Configuration.Environment.Variables}' \
    --output table

# Test the function
echo -e "\n${BLUE}🧪 Testing Lambda function...${NC}"

# Health check test (API Gateway format)
echo -e "${YELLOW}Testing health endpoint...${NC}"
HEALTH_PAYLOAD='{"httpMethod":"GET","path":"/health","headers":{"Content-Type":"application/json"},"requestContext":{"requestId":"test-request"}}'

aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload "$HEALTH_PAYLOAD" \
    --region "$REGION" \
    response.json >/dev/null 2>&1

if [ -f response.json ]; then
    STATUS_CODE=$(cat response.json | grep -o '"statusCode":[0-9]*' | cut -d':' -f2)
    echo -e "${BLUE}Response status: ${STATUS_CODE}${NC}"

    if [ "$STATUS_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        # Try to extract and display the response body
        BODY=$(cat response.json | grep -o '"body":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$BODY" ]; then
            echo -e "${YELLOW}Response body: ${BODY}${NC}"
        fi
    else
        echo -e "${RED}❌ Health check failed${NC}"
        echo -e "${YELLOW}Full response:${NC}"
        cat response.json | python3 -m json.tool 2>/dev/null || cat response.json
    fi
else
    echo -e "${RED}❌ No response file generated${NC}"
fi

# Show recent logs
echo -e "\n${BLUE}📜 Recent CloudWatch logs:${NC}"
if aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" --region "$REGION" >/dev/null 2>&1; then
    LATEST_LOG_STREAM=$(aws logs describe-log-streams \
        --log-group-name "$LOG_GROUP" \
        --region "$REGION" \
        --order-by LastEventTime \
        --descending \
        --max-items 1 \
        --query 'logStreams[0].logStreamName' \
        --output text 2>/dev/null)

    if [ "$LATEST_LOG_STREAM" != "None" ] && [ -n "$LATEST_LOG_STREAM" ]; then
        echo -e "${YELLOW}Latest log stream: ${LATEST_LOG_STREAM}${NC}"
        aws logs get-log-events \
            --log-group-name "$LOG_GROUP" \
            --log-stream-name "$LATEST_LOG_STREAM" \
            --region "$REGION" \
            --limit 20 \
            --query 'events[*].message' \
            --output text
    else
        echo -e "${YELLOW}No log streams found${NC}"
    fi
else
    echo -e "${RED}❌ Log group not found${NC}"
    echo -e "${YELLOW}Log group will be created on first function invocation${NC}"
fi

# Cleanup
rm -f response.json

echo -e "\n${BLUE}🔧 Troubleshooting tips:${NC}"
echo -e "1. ${YELLOW}Check environment variables:${NC} aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.Environment'"
echo -e "2. ${YELLOW}Update function code:${NC} ./deploy-to-aws.sh (if code changes made)"
echo -e "3. ${YELLOW}Check Secrets Manager:${NC} aws secretsmanager get-secret-value --secret-id rejuvenai-backend-secrets --region $REGION"
echo -e "4. ${YELLOW}Test locally:${NC} python3 -c \"from app import create_app; app = create_app(); print('App created successfully')\""

echo -e "\n${BLUE}📞 Common issues:${NC}"
echo -e "• ${RED}ImportError:${NC} Missing dependencies in deployment package"
echo -e "• ${RED}KeyError:${NC} Environment variables not set correctly"
echo -e "• ${RED}Timeout:${NC} Function taking too long to respond (increase timeout)"
echo -e "• ${RED}Memory:${NC} Function running out of memory (increase memory allocation)"
