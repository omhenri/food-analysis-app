// Debug the mock service directly
const singleFoodAnalysis = require('./src/mockdata/responses/single-food-analysis.json');

console.log('=== DIRECT MOCK DATA TEST ===');

// Simulate the conversion logic from MockAIService
function convertBackendResponseToAnalysisResult(backendData, foodItem) {
  // Convert ingredients
  const ingredients = backendData.ingredients.map(ing => ing.name);
  const ingredientDetails = backendData.ingredients;

  // Convert ALL nutrients to ChemicalSubstances
  const chemicalSubstances = [];

  // Extract ALL nutrients from backendData.nutrients_g
  Object.keys(backendData.nutrients_g).forEach(nutrientKey => {
    const nutrient = backendData.nutrients_g[nutrientKey];

    // Only include nutrients with positive amounts
    if (nutrient && nutrient.total_g > 0) {
      let category = 'neutral';
      if (nutrient.impact === 'positive') {
        category = 'good';
      } else if (nutrient.impact === 'negative') {
        category = 'bad';
      }

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

// Test with sample data
const testFood = { id: '1', name: 'test', mealType: 'breakfast' };
const result = convertBackendResponseToAnalysisResult(singleFoodAnalysis[0], testFood);

console.log('Result foodId:', result.foodId);
console.log('Ingredients count:', result.ingredients.length);
console.log('Chemical substances count:', result.chemicalSubstances.length);
console.log('First 3 substances:');
result.chemicalSubstances.slice(0, 3).forEach((sub, i) => {
  console.log(`  ${i+1}. ${sub.name}: ${sub.amount}g (${sub.category})`);
});
