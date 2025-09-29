#!/bin/bash

# Setup AWS Secrets and Environment Variables for Rejuvenai Backend
# This script helps configure AWS Secrets Manager and Lambda environment variables

set -e

# Configuration
REGION="us-east-1"  # Update to your preferred region
SECRET_NAME="rejuvenai-backend-secrets"
LAMBDA_FUNCTION_NAME="rejuvenai-backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔐 Setting up AWS Secrets for Rejuvenai Backend${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${YELLOW}📝 Please provide the following API keys:${NC}"

# Get OpenRouter API key
read -p "Enter your OpenRouter API key: " OPENROUTER_KEY
if [ -z "$OPENROUTER_KEY" ]; then
    echo -e "${RED}❌ OpenRouter API key is required.${NC}"
    exit 1
fi

# Generate a random secret key
SECRET_KEY=$(openssl rand -hex 32)

echo -e "\n${BLUE}🔑 Creating AWS Secrets Manager secret...${NC}"

# Check if secret already exists
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo -e "${YELLOW}🔄 Secret '$SECRET_NAME' already exists. Updating...${NC}"
    aws secretsmanager update-secret \
        --secret-id "$SECRET_NAME" \
        --secret-string "{\"OPENAI_API_KEY\":\"$OPENROUTER_KEY\",\"SECRET_KEY\":\"$SECRET_KEY\"}" \
        --region "$REGION"
else
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "API keys and secrets for Rejuvenai backend" \
        --secret-string "{\"OPENAI_API_KEY\":\"$OPENROUTER_KEY\",\"SECRET_KEY\":\"$SECRET_KEY\"}" \
        --region "$REGION"
fi

echo -e "${GREEN}✅ Secret created/updated successfully${NC}"

# Get the secret ARN
SECRET_ARN=$(aws secretsmanager describe-secret \
    --secret-id "$SECRET_NAME" \
    --region "$REGION" \
    --query 'ARN' \
    --output text)

echo -e "${YELLOW}📍 Secret ARN: ${SECRET_ARN}${NC}"

# Update Lambda environment variables
echo -e "\n${BLUE}⚙️ Updating Lambda environment variables...${NC}"

if aws lambda get-function --function-name "$LAMBDA_FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
    aws lambda update-function-configuration \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --region "$REGION" \
        --environment "Variables={
            SECRET_KEY=$SECRET_KEY,
            MAX_REQUESTS_PER_MINUTE=10,
            FLASK_ENV=production
        }"

    echo -e "${GREEN}✅ Lambda environment variables updated${NC}"

    # Add Secrets Manager permission to Lambda role
    echo -e "\n${BLUE}🔒 Adding Secrets Manager permissions to Lambda role...${NC}"

    LAMBDA_ROLE_ARN=$(aws lambda get-function \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --region "$REGION" \
        --query 'Configuration.Role' \
        --output text)

    LAMBDA_ROLE_NAME=$(basename "$LAMBDA_ROLE_ARN")

    # Create policy for Secrets Manager access
    POLICY_DOCUMENT=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "$SECRET_ARN"
        }
    ]
}
EOF
)

    aws iam put-role-policy \
        --role-name "$LAMBDA_ROLE_NAME" \
        --policy-name "RejuvenaiSecretsAccess" \
        --policy-document "$POLICY_DOCUMENT"

    echo -e "${GREEN}✅ Secrets Manager permissions added${NC}"

else
    echo -e "${YELLOW}⚠️ Lambda function '$LAMBDA_FUNCTION_NAME' not found. Please deploy it first.${NC}"
    echo -e "${YELLOW}Run: ./deploy-to-aws.sh${NC}"
fi

echo -e "\n${GREEN}🎉 AWS Secrets setup completed!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "  • Secret Name: $SECRET_NAME"
echo -e "  • Secret ARN: $SECRET_ARN"
echo -e "  • Lambda Function: $LAMBDA_FUNCTION_NAME"
echo -e "  • Region: $REGION"
echo -e "\n${YELLOW}🔧 Next steps:${NC}"
echo -e "  1. Test your Lambda function"
echo -e "  2. Update your React Native app with the API Gateway URL"
echo -e "  3. Monitor CloudWatch logs for any issues"
