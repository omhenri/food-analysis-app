#!/bin/bash

# Create AWS IAM User for Rejuvenai Deployment
# This script creates an IAM user with the necessary permissions for deployment

set -e

# Configuration
USER_NAME="rejuvenai-deployer"
POLICY_NAME="RejuvenaiDeploymentPolicy"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}👤 Creating AWS IAM User for Rejuvenai Deployment${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This script requires administrative privileges to create IAM users and policies.${NC}"
read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

# Check if user already exists
if aws iam get-user --user-name "$USER_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}ℹ️  User '$USER_NAME' already exists.${NC}"
else
    echo -e "${BLUE}👤 Creating IAM user: $USER_NAME${NC}"
    aws iam create-user --user-name "$USER_NAME"
    echo -e "${GREEN}✅ IAM user created${NC}"
fi

# Check if policy exists
POLICY_ARN=$(aws iam list-policies --scope Local --query "Policies[?PolicyName=='$POLICY_NAME'].Arn" --output text)

if [ -z "$POLICY_ARN" ]; then
    echo -e "${BLUE}📋 Creating IAM policy: $POLICY_NAME${NC}"
    POLICY_ARN=$(aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document file://aws-iam-policy.json \
        --query 'Policy.Arn' \
        --output text)
    echo -e "${GREEN}✅ IAM policy created${NC}"
else
    echo -e "${YELLOW}ℹ️  Policy '$POLICY_NAME' already exists.${NC}"
fi

# Attach policy to user
echo -e "${BLUE}🔗 Attaching policy to user${NC}"
aws iam attach-user-policy \
    --user-name "$USER_NAME" \
    --policy-arn "$POLICY_ARN"
echo -e "${GREEN}✅ Policy attached to user${NC}"

# Create access keys
echo -e "${BLUE}🔑 Creating access keys for user${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Save these credentials securely! They will only be shown once.${NC}"

ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name "$USER_NAME")

ACCESS_KEY_ID=$(echo "$ACCESS_KEY_OUTPUT" | grep AccessKeyId | cut -d'"' -f4)
SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_OUTPUT" | grep SecretAccessKey | cut -d'"' -f4)

echo -e "${GREEN}✅ Access keys created successfully!${NC}"
echo -e ""
echo -e "${BLUE}🔐 AWS Credentials for '$USER_NAME':${NC}"
echo -e "${YELLOW}AWS Access Key ID:${NC} $ACCESS_KEY_ID"
echo -e "${YELLOW}AWS Secret Access Key:${NC} $SECRET_ACCESS_KEY"
echo -e ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "1. Save these credentials in a secure location"
echo -e "2. Configure AWS CLI with these credentials:"
echo -e "   ${YELLOW}aws configure --profile rejuvenai${NC}"
echo -e "3. Use the profile for deployment:"
echo -e "   ${YELLOW}export AWS_PROFILE=rejuvenai${NC}"
echo -e "4. Run the deployment scripts"
echo -e ""
echo -e "${RED}🔒 Security Reminder:${NC}"
echo -e "- Never commit these credentials to version control"
echo -e "- Use AWS IAM roles instead of access keys when possible"
echo -e "- Rotate access keys regularly"
echo -e "- Delete the user when deployment is complete if not needed"
