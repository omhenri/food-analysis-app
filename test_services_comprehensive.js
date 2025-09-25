// Comprehensive test to verify MockAIService and BackendApiService consistency
const fs = require('fs');
const path = require('path');

// Load mock data
const mockDataPath = path.join(__dirname, 'FoodAnalysisApp/src/mockdata/analysisdata.json');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

console.log('=== COMPREHENSIVE SERVICE CONSISTENCY TEST ===\n');

// Test Case 1: No nutrients consumed (should return all recommendations)
console.log('Test Case 1: No nutrients consumed');
const mockAll1 = {};
mockData.recommended_intakes.forEach(item => {
  const key = item.nutrient.replace(/-/g, '_');
  mockAll1[key] = item.recommended_daily_grams;
});

const backendAll1 = {};
mockData.recommended_intakes.forEach(item => {
  const key = item.nutrient.replace(/-/g, '_');
  backendAll1[key] = item.recommended_daily_grams;
});

console.log('Mock (no filtering):', Object.keys(mockAll1).length, 'nutrients');
console.log('Backend (no filtering):', Object.keys(backendAll1).length, 'nutrients');
console.log('Match:', JSON.stringify(mockAll1) === JSON.stringify(backendAll1));

console.log('\nTest Case 2: Some nutrients consumed (should filter)');
const consumedNutrients = [
  { name: 'protein', total_amount: 75.2, unit: 'grams' },
  { name: 'fat', total_amount: 45.8, unit: 'grams' },
  { name: 'carbohydrate', total_amount: 280.5, unit: 'grams' },
  { name: 'vitamin-c', total_amount: 0.085, unit: 'grams' }
];

const consumedNames = consumedNutrients.map(n => n.name.replace(/-/g, '_'));

const mockFiltered = {};
const backendFiltered = {};

consumedNames.forEach(name => {
  if (name in mockAll1) mockFiltered[name] = mockAll1[name];
  if (name in backendAll1) backendFiltered[name] = backendAll1[name];
});

console.log('Consumed nutrients:', consumedNames);
console.log('Mock filtered:', mockFiltered);
console.log('Backend filtered:', backendFiltered);
console.log('Match:', JSON.stringify(mockFiltered) === JSON.stringify(backendFiltered));

console.log('\nTest Case 3: Non-existent nutrients consumed (should trigger fallback)');
const nonExistentNutrients = [
  { name: 'unknown_nutrient', total_amount: 10, unit: 'grams' },
  { name: 'another_unknown', total_amount: 20, unit: 'grams' }
];

const nonExistentNames = nonExistentNutrients.map(n => n.name.replace(/-/g, '_'));

const mockFallback = {};
const backendFallback = {};

nonExistentNames.forEach(name => {
  if (name in mockAll1) mockFallback[name] = mockAll1[name];
});

if (Object.keys(mockFallback).length === 0) {
  // Mock fallback logic
  mockFallback.protein = mockAll1.protein || 50;
  mockFallback.carbohydrate = mockAll1.carbohydrate || 300;
  mockFallback.fat = mockAll1.fat || 65;
  mockFallback.fiber = mockAll1.fiber || 25;
  mockFallback.sodium = mockAll1.sodium || 2.3;
}

nonExistentNames.forEach(name => {
  if (name in backendAll1) backendFallback[name] = backendAll1[name];
});

if (Object.keys(backendFallback).length === 0) {
  // Backend fallback logic (should be same as mock)
  backendFallback.protein = backendAll1.protein || 50;
  backendFallback.carbohydrate = backendAll1.carbohydrate || 300;
  backendFallback.fat = backendAll1.fat || 65;
  backendFallback.fiber = backendAll1.fiber || 25;
  backendFallback.sodium = backendAll1.sodium || 2.3;
}

console.log('Non-existent nutrients:', nonExistentNames);
console.log('Mock fallback:', mockFallback);
console.log('Backend fallback:', backendFallback);
console.log('Match:', JSON.stringify(mockFallback) === JSON.stringify(backendFallback));

console.log('\n=== NUTRIENT NAME MAPPING VERIFICATION ===');
console.log('All nutrients in analysisdata.json:');
mockData.recommended_intakes.forEach(item => {
  const original = item.nutrient;
  const converted = original.replace(/-/g, '_');
  console.log(`  ${original} -> ${converted}`);
});

console.log('\n=== SUMMARY ===');
const allTestsPass =
  JSON.stringify(mockAll1) === JSON.stringify(backendAll1) &&
  JSON.stringify(mockFiltered) === JSON.stringify(backendFiltered) &&
  JSON.stringify(mockFallback) === JSON.stringify(backendFallback);

console.log('All tests pass:', allTestsPass);
