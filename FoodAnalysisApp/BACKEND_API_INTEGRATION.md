# Backend API Integration Guide

## Overview
This document outlines the integration between the Food Analysis App and the food-backend service that uses OpenRouter for AI model queries.

## API Endpoint Structure

### 1. Food Analysis Endpoint
**POST** `/api/analyze/foods`

#### Request Format
```json
{
  "foods": [
    {
      "name": "Apple",
      "mealType": "snack",
      "portion": "1 medium",
      "quantity": 1,
      "unit": "piece"
    },
    {
      "name": "Chicken breast",
      "mealType": "lunch", 
      "portion": "150g",
      "quantity": 150,
      "unit": "grams"
    }
  ],
  "userId": "user123",
  "sessionId": "session_1234567890_abc123",
  "analysisType": "detailed"
}
```

#### Expected AI Prompt Structure
The backend should construct a prompt like this for the AI model:

```
Analyze the following foods and provide detailed nutritional information in JSON format.

Foods to analyze:
1. Apple (1 medium, snack)
2. Chicken breast (150g, lunch)

Please provide the response in the following JSON structure:

{
  "foods": [
    {
      "foodId": "1",
      "foodName": "Apple",
      "mealType": "snack",
      "portion": "1 medium",
      "ingredients": [
        {
          "name": "Fructose",
          "percentage": 45,
          "category": "primary",
          "description": "Natural fruit sugar",
          "associatedChemicals": ["Fructose", "Simple Carbohydrates"]
        },
        {
          "name": "Fiber",
          "percentage": 15,
          "category": "primary", 
          "description": "Dietary fiber from fruit pulp",
          "associatedChemicals": ["Cellulose", "Pectin"]
        }
      ],
      "chemicalSubstances": [
        {
          "name": "Fructose",
          "amount": 12.5,
          "unit": "g",
          "category": "macronutrient",
          "sourceIngredients": ["Fructose"],
          "healthImpact": "neutral",
          "description": "Natural fruit sugar that provides energy",
          "recommendedDailyIntake": {
            "min": 0,
            "max": 50,
            "unit": "g"
          }
        },
        {
          "name": "Vitamin C",
          "amount": 8.4,
          "unit": "mg", 
          "category": "vitamin",
          "sourceIngredients": ["Apple flesh"],
          "healthImpact": "positive",
          "description": "Essential vitamin for immune system",
          "recommendedDailyIntake": {
            "min": 65,
            "max": 2000,
            "unit": "mg"
          }
        }
      ],
      "nutritionalInfo": {
        "calories": 95,
        "macronutrients": {
          "protein": 0.5,
          "carbohydrates": 25,
          "fat": 0.3,
          "fiber": 4.4
        },
        "micronutrients": {
          "vitamins": {
            "vitamin-c": 8.4,
            "vitamin-k": 4.0
          },
          "minerals": {
            "potassium": 195,
            "calcium": 11
          }
        }
      },
      "confidence": 0.92
    }
  ],
  "summary": {
    "totalCalories": 245,
    "totalItems": 2,
    "healthScore": 78,
    "recommendations": [
      "Good source of vitamin C from the apple",
      "Excellent protein content from chicken breast"
    ],
    "warnings": [
      "Consider adding vegetables for more micronutrients"
    ]
  }
}

Requirements:
1. Provide accurate nutritional data based on USDA standards
2. Include all major ingredients for each food item
3. List chemical substances with their amounts and health impacts
4. Associate each chemical substance with its source ingredients
5. Provide realistic confidence scores (0.0 to 1.0)
6. Include helpful recommendations and warnings
7. Use standard units (g, mg, μg, kcal)
8. Categorize substances as: macronutrient, micronutrient, vitamin, mineral, additive, harmful
9. Rate health impact as: positive, neutral, negative
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis_1234567890",
    "foods": [
      {
        "foodId": "1",
        "foodName": "Apple",
        "mealType": "snack",
        "portion": "1 medium",
        "ingredients": [
          {
            "name": "Fructose",
            "percentage": 45,
            "category": "primary",
            "description": "Natural fruit sugar",
            "associatedChemicals": ["Fructose", "Simple Carbohydrates"]
          }
        ],
        "chemicalSubstances": [
          {
            "name": "Fructose", 
            "amount": 12.5,
            "unit": "g",
            "category": "macronutrient",
            "sourceIngredients": ["Fructose"],
            "healthImpact": "neutral",
            "description": "Natural fruit sugar that provides energy"
          }
        ],
        "nutritionalInfo": {
          "calories": 95,
          "macronutrients": {
            "protein": 0.5,
            "carbohydrates": 25,
            "fat": 0.3,
            "fiber": 4.4
          }
        },
        "confidence": 0.92
      }
    ],
    "summary": {
      "totalCalories": 245,
      "totalItems": 2, 
      "healthScore": 78,
      "recommendations": ["Good source of vitamin C"],
      "warnings": []
    },
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "processingTime": 2.5
}
```

### 2. Health Check Endpoint
**GET** `/api/health`

#### Response
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "ai": "connected", 
    "openrouter": "connected"
  }
}
```

### 3. Recommended Intake Endpoint
**GET** `/api/nutrition/recommended-intake?age=25&gender=male`

#### Response
```json
{
  "success": true,
  "data": {
    "protein": 56,
    "carbohydrates": 300,
    "fat": 65,
    "fiber": 25,
    "sugar": 50,
    "sodium": 2.3,
    "calcium": 1000,
    "iron": 18,
    "vitamin-c": 90,
    "vitamin-d": 20
  }
}
```

## Backend Implementation Requirements

### 1. OpenRouter Integration
- Use OpenRouter API for AI model queries
- Implement proper error handling for AI service failures
- Add retry logic for transient failures
- Log AI usage for monitoring

### 2. Request Processing
- Validate incoming food data
- Construct detailed prompts for AI analysis
- Parse and validate AI responses
- Handle malformed JSON responses gracefully

### 3. Response Formatting
- Ensure consistent JSON structure
- Include confidence scores for reliability
- Provide meaningful error messages
- Add processing time metrics

### 4. Error Handling
- Network timeouts (30+ seconds for AI processing)
- AI service unavailability
- Invalid or incomplete AI responses
- Rate limiting and quota management

### 5. Performance Considerations
- Implement request caching for common foods
- Use connection pooling for database
- Add request queuing for high load
- Monitor response times and success rates

## App Integration Points

### 1. Service Configuration
```typescript
// Configure backend service
const analysisManager = AnalysisServiceManager.getInstance();
analysisManager.enableBackendService('http://localhost:3000/api');
```

### 2. Making Analysis Requests
```typescript
// Analyze foods via backend
const foods = [
  { name: 'Apple', mealType: 'snack', portion: '1 medium' },
  { name: 'Chicken breast', mealType: 'lunch', portion: '150g' }
];

const results = await analysisManager.analyzeFoods(foods);
```

### 3. Error Handling
```typescript
try {
  const results = await analysisManager.analyzeFoods(foods);
  // Process successful results
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout - show retry option
  } else if (error.message.includes('unavailable')) {
    // Handle service unavailable - fallback to mock
  } else {
    // Handle other errors
  }
}
```

## Testing Strategy

### 1. Backend Testing
- Unit tests for prompt construction
- Integration tests with OpenRouter
- Load testing for concurrent requests
- Error scenario testing

### 2. App Testing  
- Mock backend responses for UI testing
- Network failure simulation
- Timeout handling verification
- Fallback mechanism testing

## Deployment Considerations

### 1. Environment Configuration
- Development: `http://localhost:3000/api`
- Staging: `https://staging-food-backend.herokuapp.com/api`
- Production: `https://food-backend.herokuapp.com/api`

### 2. Monitoring
- Request success/failure rates
- Response time metrics
- AI service usage and costs
- Error frequency and types

### 3. Security
- API key management for OpenRouter
- Request rate limiting
- Input validation and sanitization
- HTTPS enforcement in production

This integration provides a robust foundation for AI-powered food analysis while maintaining fallback options and proper error handling.