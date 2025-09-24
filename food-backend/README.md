# Food Impact Backend API

A Flask-based REST API that analyzes food names using Generative AI (OpenAI GPT-4) to provide detailed information about ingredients, beneficial substances, and health mitigation tips.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- OpenAI API key (optional - will use mock data if not provided)

### Installation

1. **Clone and setup:**
```bash
cd food-backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp config.template .env
# Edit .env with your OpenAI API key and other settings
```

3. **Run the API:**
```bash
python app.py
```

The API will be available at `http://localhost:8000` (port 5000 may be in use by other services)

## 📚 API Documentation

### Health Check
**GET** `/health`

Check if the API is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "service": "food-impact-api",
  "version": "1.0.0"
}
```

### Analyze Food
**POST** `/api/analyze-food`

Analyze a food item using GenAI prompt chaining to provide detailed nutritional information.

**Request:**
```json
{
  "food_name": "grilled chicken breast"
}
```

**Success Response (200):**
```json
{
  "ingredients": [
    "chicken",
    "salt",
    "pepper",
    "herbs"
  ],
  "substances": [
    "Protein",
    "Vitamin B6",
    "Niacin",
    "Selenium"
  ],
  "mitigation_tips": [
    "Grill instead of frying to reduce fat content",
    "Include with vegetables for balanced nutrition",
    "Choose organic chicken when possible",
    "Limit portion to 4-6 oz per serving"
  ],
  "disclaimer": "This is AI-generated information for educational purposes only and should not be considered as professional medical or nutritional advice."
}
```

**Error Responses:**

- **400 Bad Request** - Invalid input
```json
{
  "error": "Food name cannot be empty",
  "code": "MISSING_FIELD"
}
```

- **429 Too Many Requests** - Rate limit exceeded
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

- **500 Internal Server Error** - Server error
```json
{
  "error": "Internal server error. Please try again later.",
  "code": "INTERNAL_ERROR"
}
```

## 🤖 AI Integration

This API uses **OpenRouter** with **Claude-3-Haiku** for cost-effective AI-powered food analysis:

- **Cost**: 98% cheaper than GPT-4 ($0.0015 vs $0.09 per 1K tokens)
- **Quality**: Claude-3-Haiku provides excellent analysis quality
- **Speed**: Fast response times with high reliability
- **Fallback**: Automatically uses mock responses if no API key is configured

### OpenAI v1.0+ Compatibility ✅
- Updated to use modern OpenAI client syntax
- Compatible with OpenAI v1.3.0+ and httpx v0.24.0+
- Uses `client.chat.completions.create()` instead of deprecated `openai.ChatCompletion.create()`

### Setup OpenRouter (2 minutes)

1. **Get API Key**: Visit https://openrouter.ai/ and sign up
2. **Configure**: Add `OPENROUTER_API_KEY=your-key` to `.env`
3. **Test**: Run `python switch_to_openrouter.py`

## 🧪 Testing

### Run All Tests
```bash
python -m pytest tests/
```

### Manual Testing with curl

**Health Check:**
```bash
curl http://localhost:8000/health
```

**Analyze Food:**
```bash
curl -X POST http://localhost:8000/api/analyze-food \
  -H "Content-Type: application/json" \
  -d '{"food_name": "salmon"}'
```

**Test Rate Limiting:**
```bash
for i in {1..12}; do
  curl -X POST http://localhost:8000/api/analyze-food \
    -H "Content-Type: application/json" \
    -d '{"food_name": "test"}' \
    -w "%{http_code}\n" \
    -s
done
```

### Test OpenRouter Integration
```bash
python switch_to_openrouter.py
```

### Test Script
```bash
python tests/test_api.py
```

Test specific food:
```bash
python tests/test_api.py --single "organic apple"
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `development` | Environment mode |
| `OPENAI_API_KEY` | `None` | OpenAI API key (uses mock if not set) |
| `OPENAI_MODEL` | `gpt-4` | OpenAI model to use |
| `MAX_REQUESTS_PER_MINUTE` | `10` | Rate limiting threshold |
| `SECRET_KEY` | `dev-secret-key` | Flask secret key |
| `PORT` | `5000` | Server port |
| `HOST` | `0.0.0.0` | Server host |

### GenAI Integration

The API uses a 3-step prompt chaining approach:

1. **Ingredient Inference**: Extracts likely ingredients from food name
2. **Substance Analysis**: Identifies beneficial substances/nutrients
3. **Health Tips**: Generates practical health and nutrition advice

If no OpenAI API key is provided, the API falls back to mock responses for development and testing.

## 🔒 Security Features

- **Input Validation**: Comprehensive validation and sanitization
- **Rate Limiting**: IP-based rate limiting to prevent abuse
- **CORS Support**: Configured for mobile app integration
- **Error Handling**: Proper HTTP status codes and error messages
- **Logging**: Request/response logging for debugging

## 🏗️ Project Structure

```
food-backend/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── routes/
│   │   ├── __init__.py
│   │   └── api.py           # API endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   └── food_analyzer.py  # GenAI integration
│   ├── models/
│   │   ├── __init__.py
│   │   └── response_models.py # Data models
│   └── utils/
│       ├── __init__.py
│       ├── validators.py     # Input validation
│       └── rate_limiter.py   # Rate limiting
├── config/
│   └── config.py            # Configuration management
├── tests/
│   ├── __init__.py
│   └── test_api.py          # API tests
├── app.py                   # Main application entry
├── requirements.txt         # Python dependencies
├── config.template          # Environment template
└── README.md               # This file
```

## 🚀 Deployment

The API is designed to be easily deployed to cloud platforms:

- **Heroku**: Add `gunicorn` to requirements.txt
- **Railway**: Use the included configuration
- **AWS/GCP**: Container-ready structure

## 🤝 Integration with Mobile App

The API is designed to integrate seamlessly with the React Native mobile app:

- CORS enabled for cross-origin requests
- JSON responses match mobile app expectations
- Error handling designed for mobile UX
- Rate limiting suitable for mobile usage patterns

## 📝 Development

### Adding New Endpoints
1. Add route handler in `app/routes/api.py`
2. Create service logic in `app/services/`
3. Add data models in `app/models/`
4. Update tests in `tests/`

### Running in Development
```bash
export FLASK_ENV=development
python app.py
```

### Running Tests
```bash
python -m pytest tests/ -v
```

## 📄 License

This project is part of the AWS Hackathon 2025 submission.
