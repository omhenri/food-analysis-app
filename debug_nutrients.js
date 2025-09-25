// Debug script to check nutrient extraction
const singleFoodAnalysis = require('./FoodAnalysisApp/src/mockdata/responses/single-food-analysis.json');
const multiFoodAnalysis = require('./FoodAnalysisApp/src/mockdata/responses/multi-food-analysis.json');

console.log('=== SINGLE FOOD ANALYSIS ===');
const data = singleFoodAnalysis[0];
console.log('Food:', data.food_name);
console.log('Nutrients keys:', Object.keys(data.nutrients_g));
console.log('Sample protein:', data.nutrients_g.protein);

console.log('\n=== CONVERSION SIMULATION ===');
// Simulate the conversion logic
const chemicalSubstances = [];
Object.keys(data.nutrients_g).forEach(nutrientKey => {
  const nutrient = data.nutrients_g[nutrientKey];
  if (nutrient && nutrient.total_g > 0) {
    let category = 'neutral';
    if (nutrient.impact === 'positive') category = 'good';
    else if (nutrient.impact === 'negative') category = 'bad';
    
    chemicalSubstances.push({
      name: nutrient.full_name,
      category,
      amount: nutrient.total_g,
      mealType: 'breakfast',
    });
  }
});

console.log('Chemical substances count:', chemicalSubstances.length);
console.log('First 3 substances:', chemicalSubstances.slice(0, 3));
