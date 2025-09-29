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

export interface AsyncJobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
  estimated_time?: string;
  result?: BackendAnalysisData[];
  error?: string;
  created_at?: string;
  updated_at?: string;
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
  recommended_intakes: {[nutrientName: string]: number};
  age_group: string;
  gender: string;
  disclaimer: string;
}

export interface BackendNeutralizationRecommendations {
  success: boolean;
  recommendations: {
    food_recommendations?: Array<{
      substance: string;
      foods: string[];
      reasoning: string;
      timing: string;
    }>;
    activity_recommendations?: Array<{
      substance: string;
      activities: string[];
      duration: string;
      reasoning: string;
    }>;
    drink_recommendations?: Array<{
      substance: string;
      drinks: string[];
      reasoning: string;
      amount: string;
    }>;
    supplement_recommendations?: Array<{
      substance: string;
      supplements: string[];
      dosage: string;
      reasoning: string;
      caution: string;
    }>;
    lifestyle_recommendations?: Array<{
      substance: string;
      advice: string[];
      reasoning: string;
    }>;
  };
  overdosed_substances: string[];
  disclaimer: string;
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

  // Create asynchronous food analysis job
  public async createFoodAnalysisJob(foods: BackendFoodItem[]): Promise<BackendResponse<AsyncJobResponse>> {
    try {
      console.log('Creating asynchronous food analysis job:', foods);

      // Convert foods to backend format (array of food objects)
      const backendFoods = foods.map(food => ({
        food_name: food.name,
        meal_type: food.mealType,
      }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for job creation

      const response = await fetch(`${this.baseUrl}/api/analyze-food-async`, {
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

      const data: AsyncJobResponse = await response.json();
      console.log('Async job created:', data);

      return {
        success: true,
        data,
      };

    } catch (error) {
      console.error('Failed to create async job:', error);

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

  // Check status of asynchronous job
  public async getJobStatus(jobId: string): Promise<BackendResponse<AsyncJobResponse>> {
    try {
      console.log('Checking job status:', jobId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for status check

      const response = await fetch(`${this.baseUrl}/api/job-status/${jobId}`, {
        method: 'GET',
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

      const data: AsyncJobResponse = await response.json();
      console.log('Job status:', data);

      return {
        success: true,
        data,
      };

    } catch (error) {
      console.error('Failed to get job status:', error);

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

  // Create asynchronous recommended intake job
  public async createRecommendedIntakeJob(nutrientsConsumed: Array<{name: string, total_amount: number, unit: string}>, age?: string, gender?: string): Promise<BackendResponse<AsyncJobResponse>> {
    try {
      console.log('Creating asynchronous recommended intake job:', nutrientsConsumed);

      const requestData = {
        nutrients_consumed: nutrientsConsumed,
        age_group: age || '18-29',
        gender: gender || 'general'
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for job creation

      const response = await fetch(`${this.baseUrl}/api/recommended-intake-async`, {
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

      const data: AsyncJobResponse = await response.json();
      console.log('Async recommended intake job created:', data);

      return {
        success: true,
        data,
      };

    } catch (error) {
      console.error('Failed to create async recommended intake job:', error);

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

      // Backend returns the full structure
      const recommendedIntake: BackendRecommendedIntake = {
        recommended_intakes: data.recommended_intakes || {},
        age_group: data.age_group || '18-29',
        gender: data.gender || 'general',
        disclaimer: data.disclaimer || 'These are general recommendations. Individual needs may vary based on health status, activity level, and specific conditions. Consult a healthcare professional for personalized advice.'
      };

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

  // Get neutralization recommendations from backend
  public async getNeutralizationRecommendations(overdosedSubstances: string[]): Promise<BackendResponse<BackendNeutralizationRecommendations>> {
    try {
      console.log('Getting neutralization recommendations from backend');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const requestData = {
        overdosed_substances: overdosedSubstances,
      };

      const response = await fetch(`${this.baseUrl}/api/neutralization-recommendations`, {
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
      console.log('Neutralization recommendations retrieved successfully');

      return {
        success: true,
        data,
      };

    } catch (error) {
      console.error('Failed to get neutralization recommendations:', error);

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
  public convertToAnalysisResults(backendResponse: BackendResponse<BackendAnalysisData[]>, originalFoods?: BackendFoodItem[]): AnalysisResult[] {
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
      // Get portion multiplier for this food item
      const originalFood = originalFoods?.[index];
      const portionMultiplier = originalFood ? this.getPortionMultiplier(originalFood.portion) : 1.0;
      
      console.log(`Applying portion multiplier ${portionMultiplier} for food ${data.food_name} (${originalFood?.portion || '1/1'})`);

      // Convert ingredients to string array and keep detailed info
      const ingredients = data.ingredients.map(ing => ing.name);
      const ingredientDetails = data.ingredients.map(ing => ({
        ...ing,
        portion_percent: ing.portion_percent * portionMultiplier
      }));

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
            amount: nutrient.total_g * portionMultiplier,
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
        // Add additional fields for richer display (with portion applied)
        servingInfo: {
          ...data.serving,
          grams: data.serving.grams * portionMultiplier
        },
        detailedNutrients: data.nutrients_g,
        portionInfo: {
          portion: originalFood?.portion || '1/1',
          multiplier: portionMultiplier
        },
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

  // Get weekly recommended intake from backend
  public async getWeeklyRecommendedIntake(nutrientsConsumed: Array<{name: string, total_amount: number, unit: string}>): Promise<BackendResponse<BackendRecommendedIntake>> {
    try {
      console.log('Getting weekly recommended intake from backend');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const requestData = {
        nutrients_consumed: nutrientsConsumed,
        age_group: '18-29',
        gender: 'general'
      };

      const response = await fetch(`${this.baseUrl}/api/recommended-intake-for-week`, {
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
      console.log('Weekly recommended intake retrieved successfully');

      return {
        success: true,
        data,
      };

    } catch (error) {
      console.error('Failed to get weekly recommended intake:', error);

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

  // Create asynchronous neutralization recommendations job
  public async createNeutralizationRecommendationsJob(overdosedSubstances: string[]): Promise<BackendResponse<AsyncJobResponse>> {
    try {
      console.log('Creating asynchronous neutralization recommendations job');

      const requestData = {
        overdosed_substances: overdosedSubstances
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${this.baseUrl}/api/neutralization-recommendations-async`, {
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

      const data: AsyncJobResponse = await response.json();
      console.log('Async neutralization recommendations job created:', data);

      return {
        success: true,
        data,
      };

    } catch (error) {
      console.error('Failed to create async neutralization recommendations job:', error);

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

}
