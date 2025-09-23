import { AnalysisResult, ChemicalSubstance } from '../models/types';

import { API_CONFIG, ENDPOINTS, ERROR_CODES } from '../config/api';

// Request/Response Types for Backend API
export interface FoodAnalysisRequest {
  foods: FoodItem[];
  userId?: string;
  sessionId?: string;
  analysisType?: 'detailed' | 'basic';
}

export interface FoodItem {
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  portion: string;
  quantity?: number;
  unit?: string;
}

export interface BackendAnalysisResponse {
  success: boolean;
  data: {
    analysisId: string;
    foods: FoodAnalysisResult[];
    summary: AnalysisSummary;
    timestamp: string;
  };
  error?: string;
  processingTime?: number;
}

export interface FoodAnalysisResult {
  foodId: string;
  foodName: string;
  mealType: string;
  portion: string;
  ingredients: IngredientAnalysis[];
  chemicalSubstances: ChemicalSubstanceAnalysis[];
  nutritionalInfo: NutritionalInfo;
  confidence: number;
}

export interface IngredientAnalysis {
  name: string;
  percentage: number;
  category: 'primary' | 'secondary' | 'additive' | 'preservative';
  description: string;
  associatedChemicals: string[]; // Names of chemical substances from this ingredient
}

export interface ChemicalSubstanceAnalysis {
  name: string;
  amount: number;
  unit: string;
  category: 'macronutrient' | 'micronutrient' | 'vitamin' | 'mineral' | 'additive' | 'harmful';
  sourceIngredients: string[]; // Which ingredients contribute to this chemical
  healthImpact: 'positive' | 'neutral' | 'negative';
  description: string;
  recommendedDailyIntake?: {
    min: number;
    max: number;
    unit: string;
  };
}

export interface NutritionalInfo {
  calories: number;
  macronutrients: {
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
  };
  micronutrients: {
    vitamins: { [key: string]: number };
    minerals: { [key: string]: number };
  };
}

export interface AnalysisSummary {
  totalCalories: number;
  totalItems: number;
  healthScore: number;
  recommendations: string[];
  warnings: string[];
}

// API Error Types
export class BackendApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

export class BackendApiService {
  private static instance: BackendApiService;
  private baseUrl: string;
  private timeout: number;

  private constructor() {
    this.baseUrl = API_CONFIG.BACKEND.BASE_URL;
    this.timeout = API_CONFIG.BACKEND.TIMEOUT;
  }

  static getInstance(): BackendApiService {
    if (!BackendApiService.instance) {
      BackendApiService.instance = new BackendApiService();
    }
    return BackendApiService.instance;
  }

  /**
   * Configure API settings (useful for testing or different environments)
   */
  configure(baseUrl?: string, timeout?: number) {
    if (baseUrl) this.baseUrl = baseUrl;
    if (timeout) this.timeout = timeout;
  }

  /**
   * Main method to analyze foods using AI backend
   */
  async analyzeFoods(foods: FoodItem[]): Promise<BackendAnalysisResponse> {
    try {
      console.log('Analyzing foods via backend batch processing:', foods.length, 'items');

      // Prepare batch request with all foods
      const batchRequest = {
        foods: foods.map(food => ({
          food_name: food.name,
          meal_type: food.mealType,
          id: food.id || 'unknown'
        }))
      };

      console.log('Sending batch analysis request to backend');

      const response = await this.makeRequest<any>(
        '/analyze-foods', // Use the new batch endpoint
        'POST',
        batchRequest
      );

      console.log('Received batch analysis response from backend');

      // Transform the batch response to the expected format
      const results: any[] = [];

      if (response.results && Array.isArray(response.results)) {
        for (let i = 0; i < response.results.length; i++) {
          const result = response.results[i];
          const originalFood = foods[i];

          results.push({
            foodId: result.food_id || originalFood.id || 'unknown',
            foodName: result.food_name || originalFood.name,
            mealType: result.meal_type || originalFood.mealType,
            portion: originalFood.portion || '1 serving',
            ingredients: (result.ingredients || []).map((ing: any) => ({
              name: ing.name || 'Unknown',
              percentage: 100 / (result.ingredients?.length || 1),
              category: 'primary' as const,
              description: ing.quantity || 'N/A',
              associatedChemicals: []
            })),
            chemicalSubstances: (result.substances || []).map((sub: any) => ({
              name: sub.name || 'Unknown',
              category: sub.category || 'neutral',
              amount: sub.quantity || 0,
              unit: sub.unit || 'N/A',
              sourceIngredients: (sub.source_contributions || []).map((contrib: any) => contrib.ingredient_name).filter(Boolean),
              healthImpact: sub.health_impact || 'neutral',
              description: `Contributes ${sub.quantity || 0}${sub.unit || ''} (${sub.category || 'unknown'})`
            })),
            nutritionalInfo: {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              sugar: 0,
              sodium: 0,
              vitamins: [],
              minerals: []
            },
            confidence: 0.8 // Higher confidence for detailed batch analysis
          });
        }
      }

      console.log('Batch analysis completed successfully:', results.length, 'results');
      return {
        success: true,
        data: {
          analysisId: this.generateSessionId(),
          foods: results,
          summary: {
            totalFoods: results.length,
            totalIngredients: results.reduce((sum, food) => sum + food.ingredients.length, 0),
            totalSubstances: results.reduce((sum, food) => sum + food.chemicalSubstances.length, 0),
            riskLevel: 'unknown' as const,
            recommendations: []
          },
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Batch food analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get analysis history for a user
   */
  async getAnalysisHistory(userId: string, limit: number = 10): Promise<FoodAnalysisResult[]> {
    try {
      const response = await this.makeRequest<{ data: FoodAnalysisResult[] }>(
        `/analyze/history/${userId}?limit=${limit}`,
        'GET'
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get analysis history:', error);
      throw error;
    }
  }

  /**
   * Get recommended daily intake values
   */
  async getRecommendedIntake(age: number, gender: 'male' | 'female'): Promise<{ [key: string]: any }> {
    try {
      const response = await this.makeRequest<{ data: any }>(
        `/nutrition/recommended-intake?age=${age}&gender=${gender}`,
        'GET'
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get recommended intake:', error);
      throw error;
    }
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ status: string }>(
        '/health',
        'GET'
      );
      return response.status === 'ok';
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Generic HTTP request method with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any,
    attempt: number = 1
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Add any authentication headers here if needed
        // 'Authorization': `Bearer ${token}`,
      },
      ...(body && { body: JSON.stringify(body) }),
    };

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BackendApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code,
          errorData
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle network errors and timeouts
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new BackendApiError('Request timeout', 408, 'TIMEOUT');
        }
        
        // Retry logic for network errors
        if (attempt < API_CONFIG.RETRY_ATTEMPTS && this.isRetryableError(error)) {
          console.log(`Request failed, retrying (${attempt}/${API_CONFIG.RETRY_ATTEMPTS})...`);
          await this.delay(API_CONFIG.RETRY_DELAY * attempt);
          return this.makeRequest<T>(endpoint, method, body, attempt + 1);
        }
      }

      throw error;
    }
  }

  /**
   * Check if error is retryable (network issues, temporary server errors)
   */
  private isRetryableError(error: Error): boolean {
    if (error instanceof BackendApiError) {
      // Retry on server errors (5xx) but not client errors (4xx)
      return error.statusCode ? error.statusCode >= 500 : false;
    }
    
    // Retry on network errors
    return error.message.includes('fetch') || 
           error.message.includes('network') ||
           error.message.includes('ECONNREFUSED');
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique session ID for tracking requests
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert backend response to app's internal format
   */
  convertToAnalysisResults(backendResponse: BackendAnalysisResponse): AnalysisResult[] {
    return backendResponse.data.foods.map((food, index) => ({
      foodId: food.foodId || index.toString(),
      ingredients: food.ingredients.map(ing => ing.name),
      chemicalSubstances: food.chemicalSubstances.map(chem => ({
        name: chem.name,
        category: this.mapHealthImpactToCategory(chem.healthImpact),
        amount: chem.amount,
        mealType: food.mealType,
      })),
    }));
  }

  /**
   * Map backend health impact to app's category system
   */
  private mapHealthImpactToCategory(healthImpact: 'positive' | 'neutral' | 'negative'): 'good' | 'neutral' | 'bad' {
    switch (healthImpact) {
      case 'positive': return 'good';
      case 'negative': return 'bad';
      default: return 'neutral';
    }
  }
}