import { FoodItem, AnalysisResult, ChemicalSubstance, RecommendedIntake } from '../models/types';

// Import mock data
import singleFoodAnalysis from '../mockdata/responses/single-food-analysis.json';
import multiFoodAnalysis from '../mockdata/responses/multi-food-analysis.json';
import recommendedIntakesData from '../mockdata/analysisdata.json';

// Mock AI service for development and testing
export class MockAIService {
  private static instance: MockAIService;

  private constructor() {}

  public static getInstance(): MockAIService {
    if (!MockAIService.instance) {
      MockAIService.instance = new MockAIService();
    }
    return MockAIService.instance;
  }

  // Mock food analysis with realistic data from JSON files
  public async analyzeFoods(foods: FoodItem[]): Promise<AnalysisResult[]> {
    // Simulate API delay
    await this.delay(1500);

    if (foods.length === 1) {
      // Use detailed mock data for single food
      return [this.convertBackendResponseToAnalysisResult(singleFoodAnalysis[0], foods[0])];
    } else {
      // Use multi-food mock data or generate for multiple foods
      return foods.map((food, index) => {
        if (index < multiFoodAnalysis.length) {
          return this.convertBackendResponseToAnalysisResult(multiFoodAnalysis[index], food);
        } else {
          // Fallback to generated data for additional foods
          return this.generateMockAnalysis(food);
        }
      });
    }
  }

  // Mock recommended intake using data from analysisdata.json
  public async getRecommendedIntake(nutrientsConsumed?: Array<{name: string, total_amount: number, unit: string}>, age?: string, gender?: string): Promise<RecommendedIntake> {
    await this.delay(500);

    // Convert the mock data format to RecommendedIntake format
    const baseRecommendations: RecommendedIntake = {};

    // Convert from the array format in analysisdata.json to object format expected by frontend
    recommendedIntakesData.recommended_intakes.forEach((item: any) => {
      // Convert nutrient names to match the format expected by the frontend
      const nutrientKey = item.nutrient.replace(/-/g, '_');
      baseRecommendations[nutrientKey] = item.recommended_daily_grams;
    });

    // If nutrients consumed are provided, only return recommendations for those nutrients
    if (nutrientsConsumed && nutrientsConsumed.length > 0) {
      const consumedNutrientNames = nutrientsConsumed.map(n => n.name.replace(/-/g, '_'));
      const filteredRecommendations: RecommendedIntake = {};

      consumedNutrientNames.forEach(nutrientName => {
        if (nutrientName in baseRecommendations) {
          filteredRecommendations[nutrientName] = baseRecommendations[nutrientName];
        }
      });

      // If no matching nutrients found, return a subset of base recommendations
      if (Object.keys(filteredRecommendations).length === 0) {
        return {
          protein: baseRecommendations.protein || 50,
          carbohydrate: baseRecommendations.carbohydrate || 300,
          fat: baseRecommendations.fat || 65,
          fiber: baseRecommendations.fiber || 25,
          sodium: baseRecommendations.sodium || 2.3,
        };
      }

      return filteredRecommendations;
    }

    return baseRecommendations;
  }

  // Convert backend JSON response to AnalysisResult format
  private convertBackendResponseToAnalysisResult(backendData: any, foodItem: FoodItem): AnalysisResult {
    // Convert ingredients
    const ingredients = backendData.ingredients.map((ing: any) => ing.name);
    const ingredientDetails = backendData.ingredients;

    // Convert ALL nutrients to ChemicalSubstances
    const chemicalSubstances: ChemicalSubstance[] = [];

    // Extract ALL nutrients from backendData.nutrients_g
    Object.keys(backendData.nutrients_g).forEach(nutrientKey => {
      const nutrient = backendData.nutrients_g[nutrientKey];

      // Only include nutrients with positive amounts
      if (nutrient && nutrient.total_g > 0) {
        let category: 'good' | 'bad' | 'neutral' = 'neutral';
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

  // Generate mock analysis for a single food item
  private generateMockAnalysis(food: FoodItem): AnalysisResult {
    const mockData = this.getFoodMockData(food.name.toLowerCase());
    const portionMultiplier = this.getPortionMultiplier(food.portion);

    return {
      foodId: food.id,
      foodEntryId: 0,
      ingredients: mockData.ingredients,
      chemicalSubstances: mockData.substances.map(substance => ({
        ...substance,
        amount: substance.amount * portionMultiplier,
        mealType: food.mealType,
      })),
    };
  }

  // Get mock data based on food name
  private getFoodMockData(foodName: string): {
    ingredients: string[];
    substances: ChemicalSubstance[];
  } {
    // Common food patterns
    if (foodName.includes('apple') || foodName.includes('fruit')) {
      return {
        ingredients: ['Natural sugars', 'Fiber', 'Water', 'Pectin'],
        substances: [
          { name: 'Carbohydrates', category: 'good', amount: 25, mealType: '' },
          { name: 'Fiber', category: 'good', amount: 4, mealType: '' },
          { name: 'Vitamin C', category: 'good', amount: 0.005, mealType: '' },
          { name: 'Sugar', category: 'neutral', amount: 19, mealType: '' },
          { name: 'Potassium', category: 'good', amount: 0.2, mealType: '' },
        ],
      };
    }

    if (foodName.includes('chicken') || foodName.includes('meat')) {
      return {
        ingredients: ['Protein', 'Fat', 'Water', 'Minerals'],
        substances: [
          { name: 'Protein', category: 'good', amount: 31, mealType: '' },
          { name: 'Fat', category: 'neutral', amount: 3.6, mealType: '' },
          { name: 'Iron', category: 'good', amount: 0.0009, mealType: '' },
          { name: 'Vitamin B6', category: 'good', amount: 0.0005, mealType: '' },
          { name: 'Sodium', category: 'bad', amount: 0.074, mealType: '' },
        ],
      };
    }

    if (foodName.includes('rice') || foodName.includes('grain')) {
      return {
        ingredients: ['Starch', 'Protein', 'Water', 'Minerals'],
        substances: [
          { name: 'Carbohydrates', category: 'neutral', amount: 28, mealType: '' },
          { name: 'Protein', category: 'good', amount: 2.7, mealType: '' },
          { name: 'Fiber', category: 'good', amount: 0.4, mealType: '' },
          { name: 'Magnesium', category: 'good', amount: 0.025, mealType: '' },
          { name: 'Phosphorus', category: 'good', amount: 0.068, mealType: '' },
        ],
      };
    }

    if (foodName.includes('bread') || foodName.includes('wheat')) {
      return {
        ingredients: ['Wheat flour', 'Water', 'Yeast', 'Salt'],
        substances: [
          { name: 'Carbohydrates', category: 'neutral', amount: 49, mealType: '' },
          { name: 'Protein', category: 'good', amount: 9, mealType: '' },
          { name: 'Fiber', category: 'good', amount: 2.7, mealType: '' },
          { name: 'Sodium', category: 'bad', amount: 0.491, mealType: '' },
          { name: 'Iron', category: 'good', amount: 0.0036, mealType: '' },
        ],
      };
    }

    if (foodName.includes('milk') || foodName.includes('dairy')) {
      return {
        ingredients: ['Protein', 'Lactose', 'Fat', 'Water', 'Minerals'],
        substances: [
          { name: 'Protein', category: 'good', amount: 3.4, mealType: '' },
          { name: 'Carbohydrates', category: 'neutral', amount: 5, mealType: '' },
          { name: 'Fat', category: 'neutral', amount: 3.25, mealType: '' },
          { name: 'Calcium', category: 'good', amount: 0.113, mealType: '' },
          { name: 'Vitamin D', category: 'good', amount: 0.0000012, mealType: '' },
        ],
      };
    }

    // Default mock data for unknown foods
    return {
      ingredients: ['Various nutrients', 'Water', 'Organic compounds'],
      substances: [
        { name: 'Carbohydrates', category: 'neutral', amount: 20, mealType: '' },
        { name: 'Protein', category: 'good', amount: 8, mealType: '' },
        { name: 'Fat', category: 'neutral', amount: 5, mealType: '' },
        { name: 'Fiber', category: 'good', amount: 3, mealType: '' },
        { name: 'Sodium', category: 'bad', amount: 0.1, mealType: '' },
      ],
    };
  }

  // Get portion multiplier
  private getPortionMultiplier(portion: string): number {
    switch (portion) {
      case '1/1': return 1.0;
      case '1/2': return 0.5;
      case '1/3': return 0.33;
      case '1/4': return 0.25;
      case '1/8': return 0.125;
      default: return 1.0;
    }
  }

  // Simulate network delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test connection (always succeeds for mock)
  public async testConnection(): Promise<boolean> {
    await this.delay(100);
    return true;
  }
}