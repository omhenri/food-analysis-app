#!/bin/bash

# RejuvenAI Flask Backend - Serverless Framework Deployment Script
# This script provides a simple interface to deploy using Serverless Framework

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 RejuvenAI Flask Backend - Serverless Deployment${NC}"

# Check prerequisites
echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install it first.${NC}"
    echo -e "${YELLOW}💡 Visit: https://nodejs.org/${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install it first.${NC}"
    exit 1
fi

# Check Serverless Framework
if ! command -v serverless &> /dev/null; then
    echo -e "${RED}❌ Serverless Framework is not installed.${NC}"
    echo -e "${YELLOW}💡 Install with: npm install -g serverless${NC}"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    echo -e "${YELLOW}💡 Install with: pip install awscli${NC}"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Parse command line arguments
STAGE="dev"
REGION="us-east-1"

while [[ $# -gt 0 ]]; do
    case $1 in
        --stage)
            STAGE="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--stage STAGE] [--region REGION]"
            echo ""
            echo "Options:"
            echo "  --stage STAGE    Deployment stage (dev, prod) [default: dev]"
            echo "  --region REGION  AWS region [default: us-east-1]"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}📦 Deploying to stage: ${STAGE}, region: ${REGION}${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    if [ -f "env-template-serverless.txt" ]; then
        cp env-template-serverless.txt .env
        echo -e "${YELLOW}📝 Please edit .env file with your actual values before deploying${NC}"
        echo -e "${YELLOW}   Required: OPENAI_API_KEY or OPENROUTER_API_KEY${NC}"
        echo -e "${YELLOW}   Required: SECRET_KEY${NC}"
        read -p "Press Enter to continue after editing .env..."
    else
        echo -e "${RED}❌ No .env template found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

# Install serverless plugins if package.json exists or create it
if [ ! -f "package.json" ]; then
    echo -e "${BLUE}📦 Creating package.json for serverless plugins...${NC}"
    cat > package.json << 'EOF'
{
  "name": "rejuvenai-flask-backend",
  "version": "1.0.0",
  "description": "RejuvenAI Flask Backend with Serverless Framework",
  "scripts": {
    "deploy": "serverless deploy",
    "deploy:prod": "serverless deploy --stage prod",
    "logs": "serverless logs -f api --tail",
    "remove": "serverless remove"
  },
  "devDependencies": {
    "serverless-python-requirements": "^6.1.0",
    "serverless-dotenv-plugin": "^6.0.0"
  }
}
EOF
fi

# Install serverless plugins
echo -e "${BLUE}📦 Installing serverless plugins...${NC}"
npm install

# Deploy
echo -e "${BLUE}☁️  Deploying to AWS...${NC}"
serverless deploy --stage "$STAGE" --region "$REGION"

# Get deployment info
echo -e "\n${BLUE}📊 Deployment Information:${NC}"
serverless info --stage "$STAGE" --region "$REGION"

echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Test your API endpoints using the URL above"
echo "2. Monitor logs with: serverless logs -f api --tail"
echo "3. For production deployment: ./deploy-serverless.sh --stage prod"
echo "4. Update your client applications with the new API URL"

# Test health endpoint
API_URL=$(serverless info --stage "$STAGE" --region "$REGION" | grep -o 'https://[^"]*')
if [ -n "$API_URL" ]; then
    echo -e "\n${BLUE}🧪 Testing health endpoint...${NC}"
    if curl -s "$API_URL/health" | grep -q "healthy"; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed - check logs${NC}"
    fi
fi
