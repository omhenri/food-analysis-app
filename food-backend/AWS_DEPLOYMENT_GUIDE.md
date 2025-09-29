# 🚀 Rejuvenai Backend AWS Serverless Deployment Guide

This guide provides complete instructions for deploying the Rejuvenai food analysis backend to AWS Lambda with API Gateway.

## 📋 Prerequisites

- AWS Account with appropriate permissions
- Python 3.9+
- AWS CLI installed and configured
- OpenRouter API key (for AI food analysis)

---

## 1. 🛠️ AWS CLI Setup

### Install AWS CLI

**macOS (using Homebrew):**
```bash
brew install awscli
```

**Other platforms:**
Visit: https://aws.amazon.com/cli/

### Configure AWS CLI

```bash
aws configure
```

You'll be prompted for:
- **AWS Access Key ID**: Your AWS access key
- **AWS Secret Access Key**: Your AWS secret key
- **Default region name**: `us-east-1` (or your preferred region)
- **Default output format**: `json`

### Verify Configuration

```bash
aws sts get-caller-identity
```

This should return your AWS account information.

### Required IAM Permissions

Your AWS user/role needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "lambda:*",
                "apigateway:*",
                "iam:*",
                "secretsmanager:*",
                "logs:*"
            ],
            "Resource": "*"
        }
    ]
}
```

---

## 2. 🔑 Environment Variables Setup

### Create AWS Secrets Manager Secret for API Keys

```bash
# Create secret for OpenRouter API key
aws secretsmanager create-secret \
    --name rejuvenai-openrouter-key \
    --description "OpenRouter API key for Rejuvenai backend" \
    --secret-string '{"OPENAI_API_KEY":"your-openrouter-api-key-here"}'
```

### Alternative: Environment Variables in Lambda

You can also set environment variables directly in the Lambda console after deployment.

---

## 3. 🚀 Deployment

### Make Deployment Script Executable

```bash
cd food-backend
chmod +x deploy-to-aws.sh
```

### Run Deployment

```bash
./deploy-to-aws.sh
```

The script will:
- ✅ Check prerequisites
- 📦 Create Lambda deployment package
- ☁️ Deploy to AWS Lambda
- 🌐 Set up API Gateway
- 🔗 Configure integrations

### Expected Output

```
🚀 Starting Rejuvenai Backend Deployment
Region: us-east-1
Account ID: 123456789012

📋 Checking prerequisites...
✅ Prerequisites check passed

📦 Creating deployment package...
📚 Installing Python dependencies...
📦 Creating deployment ZIP...
✅ Deployment package created successfully

☁️  Deploying to AWS...
🆕 Creating new Lambda function...
👤 Creating IAM role for Lambda...
⏳ Waiting for IAM role to propagate...
✅ Lambda function deployed successfully
Function ARN: arn:aws:lambda:us-east-1:123456789012:function:rejuvenai-backend

🌐 Setting up API Gateway...
🆕 Creating API Gateway...
📍 Creating endpoint: POST /analyze-food
📍 Creating endpoint: POST /recommended-intake
📍 Creating endpoint: POST /recommended-intake-for-week
📍 Creating endpoint: POST /neutralization-recommendations

🎉 Deployment completed successfully!
API Gateway URL: https://abc123def4.execute-api.us-east-1.amazonaws.com/prod
Health Check: https://abc123def4.execute-api.us-east-1.amazonaws.com/prod/health
Lambda Function: rejuvenai-backend
```

---

## 4. ⚙️ Post-Deployment Configuration

### Set Environment Variables in Lambda

1. Go to AWS Lambda Console
2. Find your `rejuvenai-backend` function
3. Go to Configuration → Environment variables
4. Add these variables:

```bash
OPENAI_API_KEY = your-openrouter-api-key
SECRET_KEY = your-secret-key-here
MAX_REQUESTS_PER_MINUTE = 10
```

### Or use AWS CLI:

```bash
aws lambda update-function-configuration \
    --function-name rejuvenai-backend \
    --environment "Variables={
        OPENAI_API_KEY=your-openrouter-api-key,
        SECRET_KEY=your-secret-key,
        MAX_REQUESTS_PER_MINUTE=10
    }"
```

---

## 5. 🧪 Testing the Deployment

### Health Check

```bash
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/health
```

Expected response:
```json
{
    "status": "healthy",
    "service": "food-impact-api",
    "version": "1.0.0"
}
```

### Test Food Analysis

```bash
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/api/analyze-food \
  -H "Content-Type: application/json" \
  -d '[{"food_name": "apple", "meal_type": "breakfast"}]'
```

---

## 6. 📱 Update React Native App

Update your React Native app to use the new AWS API endpoint:

```typescript
// In BackendApiService.ts
private baseUrl: string = 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod';
```

---

## 7. 🔒 Security Enhancements (Optional)

### Add API Key Authentication

```bash
# Create API key
API_KEY_ID=$(aws apigateway create-api-key \
    --name rejuvenai-mobile-app \
    --description "API key for Rejuvenai mobile app" \
    --query 'id' \
    --output text)

# Create usage plan
USAGE_PLAN_ID=$(aws apigateway create-usage-plan \
    --name rejuvenai-usage-plan \
    --throttle-rate-limit 10 \
    --throttle-burst-limit 20 \
    --quota-limit 1000 \
    --quota-period DAY \
    --query 'id' \
    --output text)

# Link API key to usage plan
aws apigateway create-usage-plan-key \
    --usage-plan-id $USAGE_PLAN_ID \
    --key-id $API_KEY_ID \
    --key-type API_KEY
```

### Update React Native App with API Key

```typescript
// Add to fetch headers
const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key-here'
  },
  // ... rest of options
});
```

---

## 8. 📊 Monitoring and Logs

### View Lambda Logs

```bash
aws logs tail /aws/lambda/rejuvenai-backend --follow
```

### API Gateway Logs

Enable CloudWatch logging in API Gateway console for detailed request/response logging.

---

## 9. 🔧 Troubleshooting

### Common Issues

**"The role defined for the function cannot be assumed by Lambda"**
- Wait a few minutes after creating the IAM role
- Check IAM role permissions

**"Function not found"**
- Verify the function name and region
- Check AWS CLI configuration

**Timeout errors**
- Increase Lambda timeout (currently set to 300 seconds)
- Check OpenRouter API response times

**CORS errors**
- API Gateway automatically handles CORS for the configured headers

---

## 10. 💰 Cost Estimation

### Monthly Costs (approximate):
- **Lambda**: ~$2-5/month (1M requests, 300ms avg duration)
- **API Gateway**: ~$3-5/month (1M requests)
- **Secrets Manager**: ~$0.40/month
- **CloudWatch Logs**: ~$1-2/month

**Total**: ~$6-12/month for moderate usage

---

## 11. 🚀 Production Deployment Checklist

- [ ] Test all endpoints thoroughly
- [ ] Set up proper monitoring and alerting
- [ ] Configure backup and disaster recovery
- [ ] Set up CI/CD pipeline for updates
- [ ] Enable API Gateway caching for better performance
- [ ] Configure proper rate limiting and throttling
- [ ] Set up proper logging and log retention
- [ ] Enable encryption at rest and in transit
- [ ] Regular security updates and dependency checks

---

## 📞 Support

If you encounter issues:
1. Check AWS CloudWatch logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with the health check endpoint first
4. Check API Gateway execution logs

Happy deploying! 🎉
