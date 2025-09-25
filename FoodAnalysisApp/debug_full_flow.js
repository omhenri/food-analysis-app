// Debug the full flow from AnalysisServiceManager
const singleFoodAnalysis = require('./src/mockdata/responses/single-food-analysis.json');

console.log('=== FULL FLOW DEBUG ===');

// Simulate MockAIService.convertBackendResponseToAnalysisResult
function convertBackendResponseToAnalysisResult(backendData, foodItem) {
  const ingredients = backendData.ingredients.map(ing => ing.name);
  const ingredientDetails = backendData.ingredients;
  const chemicalSubstances = [];

  Object.keys(backendData.nutrients_g).forEach(nutrientKey => {
    const nutrient = backendData.nutrients_g[nutrientKey];
    if (nutrient && nutrient.total_g > 0) {
      let category = 'neutral';
      if (nutrient.impact === 'positive') category = 'good';
      else if (nutrient.impact === 'negative') category = 'bad';

      chemicalSubstances.push({
        name: nutrient.full_name,
        category,
        amount: nutrient.total_g,
        mealType: foodItem.mealType,
      });
    }
  });

  return {
    foodId: foodItem.id,
    foodEntryId: 0,
    ingredients,
    ingredientDetails,
    chemicalSubstances,
    analyzedAt: new Date().toISOString(),
    servingInfo: backendData.serving,
    detailedNutrients: backendData.nutrients_g,
  };
}

// Simulate MockAIService.analyzeFoods
function mockAnalyzeFoods(foods) {
  if (foods.length === 1) {
    return [convertBackendResponseToAnalysisResult(singleFoodAnalysis[0], foods[0])];
  }
  return [];
}

// Simulate AnalysisServiceManager.analyzeFoods
function analysisServiceManagerAnalyzeFoods(foods, useMockService = true) {
  if (useMockService) {
    return mockAnalyzeFoods(foods);
  }
  return [];
}

// Test the flow
const testFood = { id: '1', name: 'Apple', mealType: 'breakfast', portion: '1/1' };
const results = analysisServiceManagerAnalyzeFoods([testFood], true);

console.log('Results count:', results.length);
if (results.length > 0) {
  console.log('First result:');
  console.log('  foodId:', results[0].foodId);
  console.log('  ingredients:', results[0].ingredients.length);
  console.log('  chemicalSubstances:', results[0].chemicalSubstances.length);
  console.log('  substances sample:', results[0].chemicalSubstances.slice(0, 2));
}
