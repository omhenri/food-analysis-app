// Test nutrient display name formatting
const testNutrients = [
  'protein',
  'fat',
  'carbohydrate',
  'fiber',
  'vitamin_c',
  'vitamin_d',
  'vitamin_b6',
  'vitamin_b12',
  'saturated_fat',
  'monounsaturated_fat',
  'dietary_fiber',
  'unknown_nutrient'
];

function getNutrientDisplayName(nutrientKey) {
  const displayNames = {
    'protein': 'Protein',
    'fat': 'Total Fat',
    'carbohydrate': 'Carbohydrates',
    'fiber': 'Dietary Fiber',
    'sugar': 'Sugar',
    'sodium': 'Sodium',
    'potassium': 'Potassium',
    'calcium': 'Calcium',
    'iron': 'Iron',
    'magnesium': 'Magnesium',
    'vitamin_c': 'Vitamin C',
    'vitamin_d': 'Vitamin D',
    'vitamin_a': 'Vitamin A',
    'vitamin_e': 'Vitamin E',
    'vitamin_k': 'Vitamin K',
    'vitamin_b1': 'Vitamin B1 (Thiamin)',
    'vitamin_b2': 'Vitamin B2 (Riboflavin)',
    'vitamin_b3': 'Vitamin B3 (Niacin)',
    'vitamin_b6': 'Vitamin B6',
    'vitamin_b12': 'Vitamin B12',
    'folic_acid': 'Folic Acid',
    'pantothenic_acid': 'Pantothenic Acid',
    'saturated_fat': 'Saturated Fat',
    'monounsaturated_fat': 'Monounsaturated Fat',
    'polyunsaturated_fat': 'Polyunsaturated Fat',
    'cholesterol': 'Cholesterol',
    'phosphorus': 'Phosphorus',
    'zinc': 'Zinc',
    'selenium': 'Selenium',
    'niacin': 'Niacin',
    'riboflavin': 'Riboflavin',
    'thiamin': 'Thiamin',
    'water': 'Water'
  };

  // Check if we have a specific display name
  if (displayNames[nutrientKey]) {
    return displayNames[nutrientKey];
  }

  // Fallback: replace underscores and dashes with spaces, capitalize words
  return nutrientKey
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

console.log('=== NUTRIENT DISPLAY NAME TEST ===\n');

testNutrients.forEach(nutrient => {
  const displayName = getNutrientDisplayName(nutrient);
  console.log(`${nutrient.padEnd(20)} → ${displayName}`);
});

console.log('\n✅ Nutrient display name formatting test completed!');
