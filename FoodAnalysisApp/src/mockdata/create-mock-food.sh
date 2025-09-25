#!/bin/bash

# Script to create new mock food data
# Usage: ./create-mock-food.sh "food_name" "meal_type"

FOOD_NAME="$1"
MEAL_TYPE="${2:-breakfast}"

if [ -z "$FOOD_NAME" ]; then
    echo "Usage: $0 <food_name> [meal_type]"
    echo "Example: $0 'grilled chicken' lunch"
    exit 1
fi

# Convert spaces to underscores for filename
FILENAME=$(echo "$FOOD_NAME" | tr ' ' '_' | tr '[:upper:]' '[:lower:]').json
FILEPATH="foods/$FILENAME"

cat > "$FILEPATH" << FOOD_JSON
{
  "name": "$FOOD_NAME",
  "variations": ["$FOOD_NAME"],
  "meal_type": "$MEAL_TYPE",
  "mock_response": {
    "food_name": "$FOOD_NAME",
    "meal_type": "$MEAL_TYPE",
    "serving": {
      "description": "One serving of $FOOD_NAME",
      "grams": 100.0
    },
    "ingredients": [
      {"name": "$FOOD_NAME", "portion_percent": 100.0}
    ],
    "nutrients_g": {
      "protein": {
        "full_name": "Protein",
        "class": "macronutrient",
        "impact": "positive",
        "total_g": 20.0,
        "by_ingredient": [
          {"ingredient": "$FOOD_NAME", "grams": 20.0, "percent_of_chemical": 100.0}
        ]
      },
      "carbohydrate": {
        "full_name": "Carbohydrate",
        "class": "macronutrient",
        "impact": "neutral",
        "total_g": 10.0,
        "by_ingredient": [
          {"ingredient": "$FOOD_NAME", "grams": 10.0, "percent_of_chemical": 100.0}
        ]
      }
    }
  }
}
FOOD_JSON

echo "Created mock data file: $FILEPATH"
echo "Edit the file to customize nutritional values and ingredients."
