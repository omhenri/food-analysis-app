# RejuvenAI Flask Backend - Serverless Framework Deployment

This guide covers deploying the Flask application using the Serverless Framework instead of the custom bash script.

## Prerequisites

1. **Node.js and npm** (for Serverless Framework)
   ```bash
   # Install Node.js (if not already installed)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install node
   nvm use node
   ```

2. **Serverless Framework**
   ```bash
   npm install -g serverless
   ```

3. **AWS CLI configured**
   ```bash
   aws configure
   ```

4. **Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## Installation

1. **Install Serverless plugins:**
   ```bash
   npm install --save-dev serverless-python-requirements serverless-dotenv-plugin
   ```

2. **Set up environment variables:**
   ```bash
   cp env-template-serverless.txt .env
   # Edit .env with your actual values
   ```

## Configuration

The `serverless.yml` file contains all deployment configuration:

```yaml
service: rejuvenai-flask-backend
provider:
  name: aws
  runtime: python3.10
  stage: dev  # Change to 'prod' for production
  region: us-east-1
  architecture: x86_64
```

### Stages

- **dev**: Development environment (`FLASK_ENV=dev`)
- **prod**: Production environment (`FLASK_ENV=prod`)

### Environment Variables

Set these in your `.env` file or AWS Lambda console:

```bash
OPENAI_API_KEY=your-openai-key
SECRET_KEY=your-secret-key
MAX_REQUESTS_PER_MINUTE=10
```

## Deployment

### Deploy to Development

```bash
# Deploy to dev stage
serverless deploy

# Or specify stage explicitly
serverless deploy --stage dev
```

### Deploy to Production

```bash
# Deploy to production
serverless deploy --stage prod
```

### Deploy to Different Region

```bash
# Deploy to different AWS region
serverless deploy --region eu-west-1
```

## Testing Deployment

### Get Service Information

```bash
# Get deployment info
serverless info

# Output example:
# service: rejuvenai-flask-backend
# stage: dev
# region: us-east-1
# stack: rejuvenai-flask-backend-dev
# api keys:
#   None
# endpoints:
#   ANY - https://abc123def.execute-api.us-east-1.amazonaws.com/dev/{proxy+}
# functions:
#   api: rejuvenai-flask-backend-dev-api
```

### Test Endpoints

```bash
# Get the API URL from serverless info
API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"

# Test health endpoint
curl "$API_URL/health"

# Test food analysis
curl -X POST "$API_URL/api/analyze-food" \
  -H "Content-Type: application/json" \
  -d '{
    "foods": [
      {
        "food_name": "apple",
        "meal_type": "snack"
      }
    ]
  }'
```

## Local Development

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Locally

```bash
# Set environment variables
export FLASK_ENV=development
export OPENAI_API_KEY=your-key

# Run Flask app
python app.py
```

### Test with Serverless Offline (Optional)

```bash
# Install serverless offline plugin
npm install --save-dev serverless-offline

# Add to serverless.yml plugins:
# plugins:
#   - serverless-offline

# Run locally
serverless offline
```

## Monitoring and Logs

### View Logs

```bash
# View recent logs
serverless logs -f api

# View logs for specific stage
serverless logs -f api --stage prod

# Tail logs in real-time
serverless logs -f api --tail
```

### CloudWatch Logs

Logs are automatically sent to CloudWatch. You can view them in the AWS console or via CLI:

```bash
# View CloudWatch log groups
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/rejuvenai"

# View specific log stream
aws logs get-log-events \
  --log-group-name "/aws/lambda/rejuvenai-flask-backend-dev-api" \
  --log-stream-name "your-log-stream-name"
```

## Environment Management

### Different Environments

```bash
# Development
serverless deploy --stage dev

# Staging
serverless deploy --stage staging

# Production
serverless deploy --stage prod
```

### Environment Variables per Stage

You can override environment variables per stage in `serverless.yml`:

```yaml
provider:
  environment:
    MAX_REQUESTS_PER_MINUTE: 10

functions:
  api:
    environment:
      MAX_REQUESTS_PER_MINUTE: 100  # Override for production
    stages:
      prod:
        environment:
          MAX_REQUESTS_PER_MINUTE: 1000
```

## Troubleshooting

### Common Issues

1. **Import Errors (pydantic_core)**
   - The serverless framework uses Docker to build dependencies
   - This resolves architecture compatibility issues

2. **Timeout Errors**
   - AI processing can take time, timeout is set to 300 seconds
   - Increase if needed in `serverless.yml`

3. **Memory Issues**
   - Memory is set to 1024MB
   - Increase if you get memory errors

4. **CORS Issues**
   - CORS is enabled in Flask app
   - Check `serverless.yml` for API Gateway configuration

### Debug Commands

```bash
# Check serverless configuration
serverless print

# Validate serverless.yml
serverless validate

# Check AWS resources
serverless resources

# Clean up deployment
serverless remove
```

## Cost Optimization

### Lambda Configuration

- **Memory**: 1024MB (balanced performance/cost)
- **Timeout**: 300 seconds (sufficient for AI processing)
- **Architecture**: x86_64 (cost-effective)

### API Gateway

- Uses HTTP API (cheaper than REST API)
- No API keys required (add if needed for security)

## Security

### Environment Variables

Never commit secrets to version control. Use:

1. `.env` file (local development)
2. AWS Lambda environment variables (production)
3. AWS Secrets Manager (recommended for production)

### API Security

Add authentication if needed:

```yaml
# In serverless.yml
functions:
  api:
    events:
      - httpApi:
          authorizer:
            type: aws_iam  # or jwt
```

## Advanced Configuration

### Custom Domain

```yaml
# Add to serverless.yml
plugins:
  - serverless-domain-manager

custom:
  customDomain:
    domainName: api.rejuvenai.com
    basePath: ''
    stage: ${self:provider.stage}
    createRoute53Record: true
```

### VPC Configuration

If your Lambda needs to access VPC resources:

```yaml
provider:
  vpc:
    securityGroupIds:
      - sg-12345678
    subnetIds:
      - subnet-12345678
      - subnet-87654321
```

## Migration from Bash Script

If you're migrating from the previous bash deployment:

1. **Keep your existing AWS resources** or create new ones
2. **Environment variables** can be migrated from Lambda console
3. **API Gateway** will be recreated (different URL)
4. **Update your client apps** with the new API URL

## Performance Tips

1. **Use provisioned concurrency** for consistent performance:
   ```yaml
   functions:
     api:
       provisionedConcurrency: 1
   ```

2. **Enable X-Ray tracing** for performance monitoring:
   ```yaml
   provider:
     tracing:
       lambda: true
       apiGateway: true
   ```

3. **Use CloudFront** for global distribution and caching

## Support

- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Flask Documentation](https://flask.palletsprojects.com/)
