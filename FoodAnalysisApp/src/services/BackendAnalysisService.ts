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

  // Analyze foods using backend service with async processing
  public async analyzeFoods(foods: FoodItem[]): Promise<AnalysisResult[]> {
    try {
      console.log('Analyzing foods via backend service (async)...');

      // Convert app's FoodItem format to backend format
      const backendFoods = foods.map(food => ({
        name: food.name,
        mealType: food.mealType,
        portion: food.portion,
        quantity: 1, // Default quantity
        unit: 'serving', // Default unit
      }));

      // Create async job
      const jobResponse = await this.backendService.createFoodAnalysisJob(backendFoods);

      if (!jobResponse.success || !jobResponse.data) {
        throw new Error(jobResponse.error || 'Failed to create analysis job');
      }

      const jobId = jobResponse.data.job_id;
      console.log(`Created job ${jobId}, polling for results...`);

      // Poll for results
      const maxAttempts = 150; // 150 attempts * 2 seconds = 300 seconds max wait
      const pollInterval = 2000; // 2 seconds

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise<void>(resolve => setTimeout(resolve, pollInterval));

        const statusResponse = await this.backendService.getJobStatus(jobId);

        if (!statusResponse.success || !statusResponse.data) {
          throw new Error(statusResponse.error || 'Failed to check job status');
        }

        const jobStatus = statusResponse.data;

        if (jobStatus.status === 'completed' && jobStatus.result) {
          // Convert backend response to app format
          const mockBackendResponse = { success: true, data: jobStatus.result };
          const analysisResults = this.backendService.convertToAnalysisResults(mockBackendResponse, backendFoods);
          console.log('Async analysis completed successfully');
          return analysisResults;
        } else if (jobStatus.status === 'failed') {
          throw new Error(jobStatus.error || 'Analysis job failed');
        }

        // Still processing, continue polling
        console.log(`Job ${jobId} status: ${jobStatus.status}, attempt ${attempt + 1}/${maxAttempts}`);
      }

      throw new Error('Analysis timed out after 60 seconds');

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
