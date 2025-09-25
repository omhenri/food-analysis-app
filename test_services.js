// Test script to compare MockAIService and BackendApiService outputs
const fs = require('fs');
const path = require('path');

// Simulate the data structures
const mockDataPath = path.join(__dirname, 'FoodAnalysisApp/src/mockdata/analysisdata.json');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

// Test nutrients consumed
const testNutrientsConsumed = [
  { name: 'protein', total_amount: 75.2, unit: 'grams' },
  { name: 'fat', total_amount: 45.8, unit: 'grams' },
  { name: 'carbohydrate', total_amount: 280.5, unit: 'grams' },
  { name: 'fiber', total_amount: 18.3, unit: 'grams' },
  { name: 'vitamin-c', total_amount: 0.085, unit: 'grams' }
];

console.log('=== MOCK SERVICE SIMULATION ===');
// Simulate MockAIService.getRecommendedIntake()
const mockResult = {};
mockData.recommended_intakes.forEach(item => {
  const nutrientKey = item.nutrient.replace(/-/g, '_');
  mockResult[nutrientKey] = item.recommended_daily_grams;
});

// Filter for consumed nutrients
const consumedNames = testNutrientsConsumed.map(n => n.name.replace(/-/g, '_'));
const filteredMockResult = {};
consumedNames.forEach(name => {
  if (name in mockResult) {
    filteredMockResult[name] = mockResult[name];
  }
});

console.log('Mock Service Result:', filteredMockResult);

console.log('\n=== BACKEND SERVICE SIMULATION ===');
// Simulate BackendApiService conversion
const backendResult = {};
mockData.recommended_intakes.forEach(item => {
  const nutrientKey = item.nutrient.replace(/-/g, '_');
  backendResult[nutrientKey] = item.recommended_daily_grams;
});

// Filter for consumed nutrients
const backendFilteredResult = {};
consumedNames.forEach(name => {
  if (name in backendResult) {
    backendFilteredResult[name] = backendResult[name];
  }
});

console.log('Backend Service Result:', backendFilteredResult);

console.log('\n=== COMPARISON ===');
console.log('Results match:', JSON.stringify(filteredMockResult) === JSON.stringify(backendFilteredResult));

if (JSON.stringify(filteredMockResult) !== JSON.stringify(backendFilteredResult)) {
  console.log('Differences found!');
  console.log('Mock keys:', Object.keys(filteredMockResult).sort());
  console.log('Backend keys:', Object.keys(backendFilteredResult).sort());
}
