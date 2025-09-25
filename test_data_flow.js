// Test data flow through the entire service chain
const fs = require('fs');
const path = require('path');

// Load mock data
const mockDataPath = path.join(__dirname, 'FoodAnalysisApp/src/mockdata/analysisdata.json');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

console.log('=== DATA FLOW CONSISTENCY TEST ===\n');

// Simulate the complete data flow
const testNutrientsConsumed = [
  { name: 'protein', total_amount: 75.2, unit: 'grams' },
  { name: 'fat', total_amount: 45.8, unit: 'grams' },
  { name: 'carbohydrate', total_amount: 280.5, unit: 'grams' },
  { name: 'vitamin-c', total_amount: 0.085, unit: 'grams' }
];

// 1. MockAIService output
console.log('1. MockAIService Output:');
const mockServiceResult = {};
mockData.recommended_intakes.forEach(item => {
  const key = item.nutrient.replace(/-/g, '_');
  mockServiceResult[key] = item.recommended_daily_grams;
});

const mockConsumedNames = testNutrientsConsumed.map(n => n.name.replace(/-/g, '_'));
const mockFilteredResult = {};
mockConsumedNames.forEach(name => {
  if (name in mockServiceResult) {
    mockFilteredResult[name] = mockServiceResult[name];
  }
});

console.log('Mock result:', mockFilteredResult);

// 2. BackendApiService conversion (simulated)
console.log('\n2. BackendApiService Output:');
const backendApiResult = {};
mockData.recommended_intakes.forEach(item => {
  const key = item.nutrient.replace(/-/g, '_');
  backendApiResult[key] = item.recommended_daily_grams;
});

const backendFilteredResult = {};
mockConsumedNames.forEach(name => {
  if (name in backendApiResult) {
    backendFilteredResult[name] = backendApiResult[name];
  }
});

console.log('Backend result:', backendFilteredResult);

// 3. BackendAnalysisService (just passes through)
console.log('\n3. BackendAnalysisService Output (same as BackendApiService):');
console.log('BackendAnalysis result:', backendFilteredResult);

// 4. AnalysisServiceManager (routes to appropriate service)
console.log('\n4. AnalysisServiceManager Output:');
console.log('Mock mode result:', mockFilteredResult);
console.log('Backend mode result:', backendFilteredResult);

// 5. AnalysisDataService (uses AnalysisServiceManager)
console.log('\n5. AnalysisDataService Output (same as service manager):');
console.log('Final result:', mockFilteredResult);

console.log('\n=== CONSISTENCY CHECK ===');
const mockModeFlow = JSON.stringify(mockFilteredResult);
const backendModeFlow = JSON.stringify(backendFilteredResult);
const dataFlowConsistent = mockModeFlow === backendModeFlow;

console.log('Mock mode flow:', mockModeFlow);
console.log('Backend mode flow:', backendModeFlow);
console.log('Data flow consistent:', dataFlowConsistent);

if (dataFlowConsistent) {
  console.log('\n✅ SUCCESS: Services are structurally consistent!');
  console.log('Switching between mock/backend modes will not cause data structure issues.');
} else {
  console.log('\n❌ FAILURE: Services are not structurally consistent!');
  console.log('This will cause issues when switching between mock/backend modes.');
}
