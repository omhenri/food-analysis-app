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
  [nutrientName: string]: number;
}

export class BackendApiService {
  private static instance: BackendApiService;
  private baseUrl: string = 'http://localhost:8000'; // Default backend URL
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
  public async getRecommendedIntake(nutrientsConsumed: Array<{name: string, total_amount: number, unit: string}>, age?: string, gender?: string): Promise<BackendResponse<BackendRecommendedIntake>> {
    try {
      console.log('Getting recommended intake from backend');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const requestData = {
        nutrients_consumed: nutrientsConsumed,
        age_group: age || '18-29',
        gender: gender || 'general'
      };

      const response = await fetch(`${this.baseUrl}/api/recommended-intake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
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

      const data = await response.json();
      console.log('Recommended intake retrieved successfully:', data);

      // Backend now returns recommended_intakes as an object directly
      const recommendedIntake: BackendRecommendedIntake = {};
      if (data.recommended_intakes && typeof data.recommended_intakes === 'object') {
        // Convert nutrient names to the expected format (e.g., "vitamin_c" instead of "vitamin-c")
        Object.entries(data.recommended_intakes).forEach(([nutrient, value]) => {
          const nutrientKey = nutrient.replace(/-/g, '_');
          recommendedIntake[nutrientKey] = value as number;
        });
      }

      return {
        success: true,
        data: recommendedIntake,
      };

    } catch (error) {
      console.error('Failed to get recommended intake:', error);

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

  // Convert backend response to app AnalysisResult format
  public convertToAnalysisResults(backendResponse: BackendResponse<BackendAnalysisData[]>): AnalysisResult[] {
    console.log('BackendApiService.convertToAnalysisResults called with:', {
      success: backendResponse.success,
      dataLength: backendResponse.data?.length || 0,
      error: backendResponse.error
    });

    if (!backendResponse.success || !backendResponse.data) {
      console.error('Cannot convert failed backend response to analysis results');
      return [];
    }

    console.log('Backend response data structure:', {
      firstItemKeys: backendResponse.data[0] ? Object.keys(backendResponse.data[0]) : 'no data',
      nutrientsKeys: backendResponse.data[0]?.nutrients_g ? Object.keys(backendResponse.data[0].nutrients_g) : 'no nutrients'
    });

    return backendResponse.data.map((data, index) => {
      // Convert ingredients to string array and keep detailed info
      const ingredients = data.ingredients.map(ing => ing.name);
      const ingredientDetails = data.ingredients;

      // Convert ALL nutrients to ChemicalSubstances
      const chemicalSubstances: ChemicalSubstance[] = [];

      // Extract ALL nutrients from data.nutrients_g
      // Note: Backend uses nutrient names without '_g' suffix
      Object.keys(data.nutrients_g).forEach(nutrientKey => {
        const nutrient = data.nutrients_g[nutrientKey];

        // Only include nutrients with positive amounts
        if (nutrient && nutrient.total_g > 0) {
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

      const result = {
        foodId: data.food_name, // Use food name as ID for display
        foodEntryId: 0, // Will be set when saving to database
        ingredients,
        ingredientDetails,
        chemicalSubstances,
        analyzedAt: new Date().toISOString(),
        // Add additional fields for richer display
        servingInfo: data.serving,
        detailedNutrients: data.nutrients_g,
      } as AnalysisResult & { servingInfo?: any; detailedNutrients?: any };

      console.log(`Converted result ${index}:`, {
        foodId: result.foodId,
        ingredientsCount: result.ingredients.length,
        chemicalSubstancesCount: result.chemicalSubstances.length,
        firstSubstance: result.chemicalSubstances[0]
      });

      return result;
    });
  }

}
