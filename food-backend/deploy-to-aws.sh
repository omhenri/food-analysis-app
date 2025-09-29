#!/bin/bash

# Rejuvenai Backend AWS Lambda Deployment Script
# This script deploys the Flask backend to AWS Lambda with API Gateway

set -e  # Exit on any error

# Configuration - Update these variables
STACK_NAME="rejuvenai-backend"
REGION="us-east-1"  # Update to your preferred region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
LAMBDA_FUNCTION_NAME="rejuvenai-backend"
API_NAME="rejuvenai-api"
STAGE_NAME="prod"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Rejuvenai Backend Deployment${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}Account ID: ${ACCOUNT_ID}${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists aws; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://aws.amazon.com/cli/"
    exit 1
fi

if ! command_exists zip; then
    echo -e "${RED}❌ zip command is not installed.${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}❌ python3 is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Create deployment directory
echo -e "\n${BLUE}📦 Creating deployment package...${NC}"
DEPLOY_DIR="lambda-deployment"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy application files
cp -r app "$DEPLOY_DIR/"
cp app.py "$DEPLOY_DIR/"
cp -r config "$DEPLOY_DIR/"

# Create requirements.txt for Lambda
cat > "$DEPLOY_DIR/requirements.txt" << 'EOF'
Flask==2.3.3
Flask-CORS==4.0.0
openai>=1.3.0
python-dotenv==1.0.0
requests==2.31.0
httpx>=0.24.0
boto3>=1.28.0
serverless-wsgi>=3.0.0
EOF

# Create Lambda handler using serverless-wsgi
cat > "$DEPLOY_DIR/lambda_handler.py" << 'EOF'
import os
import logging
from serverless_wsgi import handle_request
from app import create_app

# Set up logging for Lambda
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set production environment
os.environ['FLASK_ENV'] = 'production'

# Create Flask app once (Lambda container reuse)
logger.info("Creating Flask application...")
# Global variable to store the Flask app (created on first request)
app = None
logger.info("Flask application created successfully")

def lambda_handler(event, context):
    """
    AWS Lambda handler for API Gateway events using serverless-wsgi
    """
    logger.info(f"Received event: {event.get('httpMethod', 'UNKNOWN')} {event.get('path', 'UNKNOWN')}")
    global app
    if app is None:
        from app import create_app  # ✅ Import only when needed
        app = create_app()  # ✅ Create only when needed
    
    return handle_request(app, event, context)

logger.info("Lambda handler created and ready to serve requests")
EOF

# Install dependencies in deployment directory
echo -e "\n${BLUE}📚 Installing Python dependencies...${NC}"
cd "$DEPLOY_DIR"
pip install -r requirements.txt --target .

# Remove unnecessary files
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete
find . -name ".DS_Store" -delete

# Create deployment package
echo -e "\n${BLUE}📦 Creating deployment ZIP...${NC}"
zip -r deployment.zip ./*
mv deployment.zip ..
cd ..

echo -e "${GREEN}✅ Deployment package created successfully${NC}"

# Deploy to AWS
echo -e "\n${BLUE}☁️  Deploying to AWS...${NC}"

# Check if Lambda function exists
if aws lambda get-function --function-name "$LAMBDA_FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo -e "${YELLOW}🔄 Updating existing Lambda function...${NC}"
    aws lambda update-function-code \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --zip-file fileb://deployment.zip \
        --architectures x86_64 \
        --region "$REGION"
else
    echo -e "${YELLOW}🆕 Creating new Lambda function...${NC}"

    # Create IAM role for Lambda (if it doesn't exist)
    ROLE_NAME="rejuvenai-lambda-role"
    ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || echo "")

    if [ -z "$ROLE_ARN" ]; then
        echo -e "${YELLOW}👤 Creating IAM role for Lambda...${NC}"
        ROLE_ARN=$(aws iam create-role \
            --role-name "$ROLE_NAME" \
            --assume-role-policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "lambda.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }' \
            --query 'Role.Arn' \
            --output text)

        # Attach basic execution role
        aws iam attach-role-policy \
            --role-name "$ROLE_NAME" \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

        # Wait for role to be available
        echo -e "${YELLOW}⏳ Waiting for IAM role to propagate...${NC}"
        sleep 10
    fi

    # Create Lambda function
    aws lambda create-function \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --runtime python3.10 \
        --handler lambda_handler.lambda_handler \
        --zip-file fileb://deployment.zip \
        --role "$ROLE_ARN" \
        --region "$REGION" \
        --timeout 300 \
        --memory-size 1024 \
        --environment "Variables={FLASK_ENV=production}" \
        --architectures x86_64
fi

# Get Lambda function ARN
LAMBDA_ARN=$(aws lambda get-function --function-name "$LAMBDA_FUNCTION_NAME" --region "$REGION" --query 'Configuration.FunctionArn' --output text)

echo -e "${GREEN}✅ Lambda function deployed successfully${NC}"
echo -e "${YELLOW}Function ARN: ${LAMBDA_ARN}${NC}"

# Create API Gateway
echo -e "\n${BLUE}🌐 Setting up API Gateway...${NC}"

# Check if API Gateway exists
API_ID=$(aws apigateway get-rest-apis --region "$REGION" --query "items[?name=='$API_NAME'].id" --output text)

if [ -z "$API_ID" ]; then
    echo -e "${YELLOW}🆕 Creating API Gateway...${NC}"
    API_ID=$(aws apigateway create-rest-api \
        --name "$API_NAME" \
        --description "Rejuvenai Food Analysis API" \
        --region "$REGION" \
        --query 'id' \
        --output text)

    # Get root resource ID
    ROOT_RESOURCE_ID=$(aws apigateway get-resources \
        --rest-api-id "$API_ID" \
        --region "$REGION" \
        --query 'items[?path==`/`].id' \
        --output text)

    # Create /api resource
    API_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id "$API_ID" \
        --region "$REGION" \
        --parent-id "$ROOT_RESOURCE_ID" \
        --path-part "api" \
        --query 'id' \
        --output text)

    # Create endpoints
    declare -a endpoints=(
        "analyze-food:POST"
        "recommended-intake:POST"
        "recommended-intake-for-week:POST"
        "neutralization-recommendations:POST"
    )

    for endpoint in "${endpoints[@]}"; do
        IFS=':' read -r path method <<< "$endpoint"

        echo -e "${YELLOW}📍 Creating endpoint: $method /$path${NC}"

        # Create resource
        RESOURCE_ID=$(aws apigateway create-resource \
            --rest-api-id "$API_ID" \
            --region "$REGION" \
            --parent-id "$API_RESOURCE_ID" \
            --path-part "$path" \
            --query 'id' \
            --output text)

        # Create method
        aws apigateway put-method \
            --rest-api-id "$API_ID" \
            --resource-id "$RESOURCE_ID" \
            --http-method "$method" \
            --authorization-type "NONE" \
            --region "$REGION"

        # Create integration
        aws apigateway put-integration \
            --rest-api-id "$API_ID" \
            --resource-id "$RESOURCE_ID" \
            --http-method "$method" \
            --type AWS_PROXY \
            --integration-http-method POST \
            --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
            --region "$REGION"

        # Create method response
        aws apigateway put-method-response \
            --rest-api-id "$API_ID" \
            --resource-id "$RESOURCE_ID" \
            --http-method "$method" \
            --status-code 200 \
            --region "$REGION"

        # Create integration response
        aws apigateway put-integration-response \
            --rest-api-id "$API_ID" \
            --resource-id "$RESOURCE_ID" \
            --http-method "$method" \
            --status-code 200 \
            --region "$REGION"
    done

    # Create health check endpoint
    HEALTH_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id "$API_ID" \
        --region "$REGION" \
        --parent-id "$ROOT_RESOURCE_ID" \
        --path-part "health" \
        --query 'id' \
        --output text)

    aws apigateway put-method \
        --rest-api-id "$API_ID" \
        --resource-id "$HEALTH_RESOURCE_ID" \
        --http-method GET \
        --authorization-type "NONE" \
        --region "$REGION"

    aws apigateway put-integration \
        --rest-api-id "$API_ID" \
        --resource-id "$HEALTH_RESOURCE_ID" \
        --http-method GET \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
        --region "$REGION"

    aws apigateway put-method-response \
        --rest-api-id "$API_ID" \
        --resource-id "$HEALTH_RESOURCE_ID" \
        --http-method GET \
        --status-code 200 \
        --region "$REGION"

    aws apigateway put-integration-response \
        --rest-api-id "$API_ID" \
        --resource-id "$HEALTH_RESOURCE_ID" \
        --http-method GET \
        --status-code 200 \
        --region "$REGION"

    # Create deployment
    aws apigateway create-deployment \
        --rest-api-id "$API_ID" \
        --stage-name "$STAGE_NAME" \
        --region "$REGION"

    # Add Lambda permission for API Gateway
    aws lambda add-permission \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --statement-id "AllowAPIGatewayInvoke" \
        --action "lambda:InvokeFunction" \
        --principal "apigateway.amazonaws.com" \
        --source-arn "arn:aws:apigateway:$REGION::/restapis/$API_ID/*" \
        --region "$REGION"

else
    echo -e "${YELLOW}🔄 API Gateway already exists, creating new deployment...${NC}"
    aws apigateway create-deployment \
        --rest-api-id "$API_ID" \
        --stage-name "$STAGE_NAME" \
        --region "$REGION"
fi

# Get API Gateway URL
API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE_NAME"

echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}API Gateway URL: ${API_URL}${NC}"
echo -e "${BLUE}Health Check: ${API_URL}/health${NC}"
echo -e "${BLUE}Lambda Function: ${LAMBDA_FUNCTION_NAME}${NC}"
echo -e "\n${YELLOW}📝 Next steps:${NC}"
echo -e "1. Set environment variables in Lambda console or via AWS CLI"
echo -e "2. Update your React Native app to use: ${API_URL}"
echo -e "3. Test the endpoints with the health check URL"
echo -e "\n${YELLOW}🔐 Remember to set these environment variables:${NC}"
echo -e "- OPENAI_API_KEY (store in AWS Secrets Manager)"
echo -e "- SECRET_KEY"
echo -e "- MAX_REQUESTS_PER_MINUTE"

# Clean up
rm -rf "$DEPLOY_DIR" deployment.zip
