import { FoodItem, AnalysisResult, RecommendedIntake } from '../models/types';
import { AIAnalysisService } from './AIAnalysisService';
import { MockAIService } from './MockAIService';

// Configuration for analysis service
interface AnalysisConfig {
  useMockService: boolean;
  apiKey?: string;
}

export class AnalysisServiceManager {
  private static instance: AnalysisServiceManager;
  private config: AnalysisConfig;
  private aiService: AIAnalysisService;
  private mockService: MockAIService;

  private constructor() {
    this.config = {
      useMockService: true, // Default to mock for development
    };
    this.aiService = AIAnalysisService.getInstance();
    this.mockService = MockAIService.getInstance();
  }

  public static getInstance(): AnalysisServiceManager {
    if (!AnalysisServiceManager.instance) {
      AnalysisServiceManager.instance = new AnalysisServiceManager();
    }
    return AnalysisServiceManager.instance;
  }

  // Configure the service
  public configure(config: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.apiKey && !config.useMockService) {
      this.aiService.setApiKey(config.apiKey);
    }
  }

  // Get current service instance
  private getCurrentService() {
    return this.config.useMockService ? this.mockService : this.aiService;
  }

  // Analyze foods using the configured service
  public async analyzeFoods(foods: FoodItem[]): Promise<AnalysisResult[]> {
    try {
      const service = this.getCurrentService();
      console.log(`Using ${this.config.useMockService ? 'Mock' : 'AI'} service for analysis`);
      
      const results = await service.analyzeFoods(foods);
      console.log('Analysis completed successfully');
      
      return results;
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Fallback to mock service if AI fails
      if (!this.config.useMockService) {
        console.log('Falling back to mock service');
        try {
          return await this.mockService.analyzeFoods(foods);
        } catch (mockError) {
          console.error('Mock service also failed:', mockError);
          throw new Error('Both AI and mock services failed');
        }
      }
      
      throw error;
    }
  }

  // Get recommended intake using the configured service
  public async getRecommendedIntake(age: number = 25): Promise<RecommendedIntake> {
    try {
      const service = this.getCurrentService();
      return await service.getRecommendedIntake(age);
    } catch (error) {
      console.error('Failed to get recommended intake:', error);
      
      // Fallback to mock service if AI fails
      if (!this.config.useMockService) {
        console.log('Falling back to mock service for recommended intake');
        try {
          return await this.mockService.getRecommendedIntake(age);
        } catch (mockError) {
          console.error('Mock service also failed for recommended intake:', mockError);
          throw new Error('Failed to get recommended intake from both services');
        }
      }
      
      throw error;
    }
  }

  // Test connection to the configured service
  public async testConnection(): Promise<boolean> {
    try {
      const service = this.getCurrentService();
      return await service.testConnection();
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Switch to AI service
  public enableAIService(apiKey: string): void {
    this.configure({
      useMockService: false,
      apiKey,
    });
  }

  // Switch to mock service
  public enableMockService(): void {
    this.configure({
      useMockService: true,
    });
  }

  // Get current configuration
  public getConfig(): AnalysisConfig {
    return { ...this.config };
  }

  // Check if using mock service
  public isUsingMockService(): boolean {
    return this.config.useMockService;
  }
}