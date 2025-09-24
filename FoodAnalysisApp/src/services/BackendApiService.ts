import { AnalysisResult, ChemicalSubstance, RecommendedIntake } from '../models/types';

// Backend API types
export interface BackendFoodItem {
  name: string;
  mealType: string;
  portion: string;
  quantity: number;
  unit: string;
}

export class BackendApiError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(statusCode: number, errorCode: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.name = "BackendApiError";
  }
}
export interface BackendResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface BackendAnalysisData {
  food_name: string;
  meal_type: string;
  serving: {
    description: string;
    grams: number;
  };
  ingredients: Array<{
    name: string;
    portion_percent: number;
  }>;
  nutrients_g: {
    [nutrientKey: string]: {
      full_name: string;
      class: string;
      impact: 'positive' | 'neutral' | 'negative';
      total_g: number;
      by_ingredient: Array<{
        ingredient: string;
        grams: number;
        percent_of_chemical: number;
      }>;
    };
  };
}

export interface BackendRecommendedIntake {
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  calcium?: number;
  iron?: number;
  'vitamin-c'?: number;
  'vitamin-d'?: number;
  potassium?: number;
  magnesium?: number;
}

export class BackendApiService {
  private static instance: BackendApiService;
  private baseUrl: string = 'http://localhost:5000'; // Default backend URL
  private timeout: number = 300000; // 5 minutes timeout (for OpenRouter responses)

  private constructor() {}

  public static getInstance(): BackendApiService {
    if (!BackendApiService.instance) {
      BackendApiService.instance = new BackendApiService();
    }
    return BackendApiService.instance;
  }

  // Configure backend connection
  public configure(baseUrl?: string, timeout?: number): void {
    if (baseUrl) {
      this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }
    if (timeout) {
      this.timeout = timeout;
    }
    console.log(`BackendApiService configured: ${this.baseUrl}, timeout: ${this.timeout}ms`);
  }

  // Test connection to backend
  public async testConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Health check failed: ${response.status} ${response.statusText}`);
        return false;
      }

      const data = await response.json();
      console.log('Backend health check successful:', data);
      return data.status === 'healthy';
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  // Analyze foods using backend
  public async analyzeFoods(foods: BackendFoodItem[]): Promise<BackendResponse<BackendAnalysisData[]>> {
    try {
      console.log('Analyzing foods via backend:', foods);

      // Convert foods to backend format (array of food objects)
      const backendFoods = foods.map(food => ({
        food_name: food.name,
        meal_type: food.mealType,
      }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/analyze-food`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendFoods),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BackendApiError(
          response.status,
          errorData.code || 'HTTP_ERROR',
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data: BackendAnalysisData[] = await response.json();
      console.log('Backend analysis successful:', data);

      return {
        success: true,
        data,
      };

    } catch (error) {
      console.error('Backend analysis failed:', error);

      if (error instanceof BackendApiError) {
        return {
          success: false,
          error: error.message,
          code: error.errorCode,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }



  // Get recommended intake from backend
  public async getRecommendedIntake(age?: number, gender?: string): Promise<BackendResponse<BackendRecommendedIntake>> {
    try {
      console.log('Getting recommended intake from backend');

      // Note: The backend doesn't have a dedicated endpoint for recommended intake yet
      // For now, return a mock response that matches the expected format
      // In the future, this should call a backend endpoint

      const mockRecommendedIntake: BackendRecommendedIntake = {
        protein: 50, // grams
        carbohydrates: 300, // grams
        fat: 65, // grams
        fiber: 25, // grams
        sugar: 50, // grams
        sodium: 2.3, // grams
        calcium: 1, // grams
        iron: 0.018, // grams
        'vitamin-c': 0.09, // grams
        'vitamin-d': 0.00002, // grams
        potassium: 3.5, // grams
        magnesium: 0.4, // grams
      };

      console.log('Mock recommended intake:', mockRecommendedIntake);

      return {
        success: true,
        data: mockRecommendedIntake,
      };

    } catch (error) {
      console.error('Failed to get recommended intake:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Convert backend response to app AnalysisResult format
  public convertToAnalysisResults(backendResponse: BackendResponse<BackendAnalysisData[]>): AnalysisResult[] {
    if (!backendResponse.success || !backendResponse.data) {
      console.error('Cannot convert failed backend response to analysis results');
      return [];
    }

    return backendResponse.data.map((data, index) => {
      // Convert ingredients to string array
      const ingredients = data.ingredients.map(ing => ing.name);

      // Convert comprehensive nutrients to ChemicalSubstances
      const chemicalSubstances: ChemicalSubstance[] = [];

      // Extract key nutrients to display (prioritize macronutrients and important micros)
      const priorityNutrients = [
        'protein_g', 'carbohydrate_g', 'total_fat_g', 'fiber_g',
        'vitamin_c_g', 'calcium_g', 'iron_g', 'sodium_g', 'potassium_g'
      ];

      priorityNutrients.forEach(nutrientKey => {
        if (data.nutrients_g[nutrientKey] && data.nutrients_g[nutrientKey].total_g > 0) {
          const nutrient = data.nutrients_g[nutrientKey];

          // Convert impact to category
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
            mealType: data.meal_type as any, // Cast to MealType
          });
        }
      });

      // Add a few more important nutrients if space allows
      const additionalNutrients = ['magnesium_g', 'zinc_g', 'vitamin_a_rae_g', 'vitamin_d_g'];
      additionalNutrients.forEach(nutrientKey => {
        if (data.nutrients_g[nutrientKey] && data.nutrients_g[nutrientKey].total_g > 0 && chemicalSubstances.length < 12) {
          const nutrient = data.nutrients_g[nutrientKey];

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
            mealType: data.meal_type as any,
          });
        }
      });

      return {
        foodId: data.food_name, // Use food name as ID for display
        foodEntryId: 0, // Will be set when saving to database
        ingredients,
        chemicalSubstances,
        analyzedAt: new Date().toISOString(),
        // Add additional fields for richer display
        servingInfo: data.serving,
        detailedNutrients: data.nutrients_g,
      } as AnalysisResult & { servingInfo?: any; detailedNutrients?: any };
    });
  }

}
