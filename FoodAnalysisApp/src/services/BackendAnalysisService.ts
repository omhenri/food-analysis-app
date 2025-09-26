import { FoodItem, AnalysisResult, ChemicalSubstance, RecommendedIntake } from '../models/types';
import { BackendApiService } from './BackendApiService';

export class BackendAnalysisService {
  private static instance: BackendAnalysisService;
  private backendService: BackendApiService;

  private constructor() {
    this.backendService = BackendApiService.getInstance();
  }

  public static getInstance(): BackendAnalysisService {
    if (!BackendAnalysisService.instance) {
      BackendAnalysisService.instance = new BackendAnalysisService();
    }
    return BackendAnalysisService.instance;
  }

  // Configure backend URL
  public configureBackend(baseUrl?: string, timeout?: number): void {
    this.backendService.configure(baseUrl, timeout);
  }

  // Analyze foods using backend service only
  public async analyzeFoods(foods: FoodItem[]): Promise<AnalysisResult[]> {
    try {
      console.log('Analyzing foods via backend service...');

      // Convert app's FoodItem format to backend format
      const backendFoods = foods.map(food => ({
        name: food.name,
        mealType: food.mealType,
        portion: food.portion,
        quantity: 1, // Default quantity
        unit: 'serving', // Default unit
      }));

      // Make request to backend
      const backendResponse = await this.backendService.analyzeFoods(backendFoods);

      if (!backendResponse.success) {
        throw new Error(backendResponse.error || 'Backend analysis failed');
      }

      // Convert backend response to app format
      const analysisResults = this.backendService.convertToAnalysisResults(backendResponse);
      console.log('Analysis results:', analysisResults);
      console.log('Backend analysis completed successfully');
      return analysisResults;
    } catch (error) {
      console.error('Backend analysis failed:', error);
      throw new Error(`Analysis failed: ${error}`);
    }
  }

  // Get recommended daily intake from backend
  public async getRecommendedIntake(nutrientsConsumed?: Array<{name: string, total_amount: number, unit: string}>, age?: string, gender?: string): Promise<RecommendedIntake> {
    try {
      console.log('Getting recommended intake from backend');

      const backendResponse = await this.backendService.getRecommendedIntake(nutrientsConsumed || [], age, gender);

      if (backendResponse.success && backendResponse.data) {
        console.log('Recommended intake retrieved successfully');
        return backendResponse.data.recommended_intakes;
      } else {
        throw new Error(backendResponse.error || 'Failed to get recommended intake');
      }
    } catch (error) {
      console.error('Backend recommended intake failed:', error);
      throw new Error(`Failed to get recommended intake: ${error}`);
    }
  }

  // Test backend connection
  public async testConnection(): Promise<boolean> {
    try {
      return await this.backendService.testConnection();
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }
}
