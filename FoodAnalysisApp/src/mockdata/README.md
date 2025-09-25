# Mock Data Directory Structure

This directory contains mock data for testing the Food Analysis App without requiring API calls.

## Directory Structure

```
mockdata/
├── foods/                    # Individual food mock data
│   ├── apple.json           # Detailed apple data
│   ├── chicken.json         # Chicken breast data
│   └── ...                  # Other foods
├── responses/               # Complete API response examples
│   ├── single-food-analysis.json    # Single food response
│   ├── multi-food-analysis.json     # Multiple foods response
│   └── ...                  # Other response types
├── scenarios/               # Test scenarios and edge cases
│   ├── error-responses.json         # Error handling tests
│   ├── large-dataset.json           # Performance testing
│   └── ...                  # Other scenarios
└── README.md               # This file
```

## File Formats

### Food Data (foods/*.json)
```json
{
  "name": "apple",
  "variations": ["red apple", "green apple", "honeycrisp apple"],
  "mock_response": {
    "food_name": "Apple",
    "meal_type": "breakfast",
    "serving": {
      "description": "One medium apple",
      "grams": 182.0
    },
    "ingredients": [
      {"name": "Apple flesh", "portion_percent": 95.0},
      {"name": "Apple skin", "portion_percent": 4.5}
    ],
    "nutrients_g": {
      "carbohydrate": {
        "full_name": "Carbohydrate",
        "class": "macronutrient",
        "impact": "neutral",
        "total_g": 25.13,
        "by_ingredient": [...]
      }
    }
  }
}
```

### API Response (responses/*.json)
```json
[
  {
    "food_name": "Apple",
    "meal_type": "breakfast",
    "serving": {...},
    "ingredients": [...],
    "nutrients_g": {...}
  }
]
```

## Usage in Code

### Loading Mock Data in Tests
```typescript
import mockData from '../../mockdata/responses/single-food-analysis.json';

// Use in tests
expect(result).toEqual(mockData);
```

### Dynamic Mock Responses
```typescript
// In MockAIService.ts
private loadMockData(foodName: string): AnalysisResult {
  const mockFiles = require.context('../../mockdata/foods', false, /\.json$/);
  const foodData = mockFiles(`./${foodName}.json`);
  return this.convertToAnalysisResult(foodData.mock_response);
}
```

## Adding New Mock Data

### 1. For New Foods
```bash
# Create new food data
cd mockdata/foods
cp apple.json banana.json  # Copy template
# Edit banana.json with banana-specific data
```

### 2. For New Scenarios
```bash
# Create scenario data
cd mockdata/scenarios
# Add files like: empty-response.json, malformed-data.json, etc.
```

### 3. For API Responses
```bash
# Create response examples
cd mockdata/responses
# Add files like: breakfast-meal.json, lunch-combo.json, etc.
```

## Testing Guidelines

- **Unit Tests**: Use individual food data from `foods/`
- **Integration Tests**: Use complete responses from `responses/`
- **Error Tests**: Use scenarios from `scenarios/`
- **Performance Tests**: Use large datasets from `scenarios/`

## Validation

All mock data should:
- ✅ Match the backend API response schema
- ✅ Include realistic nutritional values
- ✅ Have proper portion percentages (sum to 100%)
- ✅ Include diverse nutrient types (macros, micros, vitamins, minerals)
- ✅ Have consistent impact classifications (positive/neutral/negative)
