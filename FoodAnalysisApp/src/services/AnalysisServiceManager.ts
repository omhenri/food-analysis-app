import { BackendAnalysisService } from './BackendAnalysisService';import { MockAIService } from './MockAIService';
import { FoodItem, AnalysisResult, RecommendedIntake } from '../models/types';

export interface AnalysisConfig {
  useMockService: boolean;
}

export class AnalysisServiceManager {
  private static instance: AnalysisServiceManager;
  private config: AnalysisConfig;
  private aiService: BackendAnalysisService;
  private mockService: MockAIService;

  private constructor() {
    this.config = {
      useMockService: false, // Default to backend service (food-backend)
    };
    this.aiService = BackendAnalysisService.getInstance();
    this.mockService = MockAIService.getInstance();
  }

  public static getInstance(): AnalysisServiceManager {
    if (!AnalysisServiceManager.instance) {
      AnalysisServiceManager.instance = new AnalysisServiceManager();
    }
    return AnalysisServiceManager.instance;
  }

  // Configure backend URL for AI service
  public configureBackend(baseUrl?: string, timeout?: number): void {
    this.aiService.configureBackend(baseUrl, timeout);
  }

  // Enable mock service for development/testing
  public enableMockService(): void {
    this.config.useMockService = true;
  }

  // Enable backend service (food-backend only)
  // Enable backend service (food-backend only)
  public enableBackendService(): void {
    this.config.useMockService = false;
  }
  // Check if currently using mock service
  public isUsingMockService(): boolean {
    return this.config.useMockService;
  }

  // Analyze foods using the configured service
  public async analyzeFoods(foods: FoodItem[]): Promise<AnalysisResult[]> {
    if (this.config.useMockService) {
      return this.mockService.analyzeFoods(foods);
    } else {
      return this.aiService.analyzeFoods(foods);
    }
  }

  // Get recommended daily intake
  public async getRecommendedIntake(age: number = 25, gender?: string): Promise<RecommendedIntake> {
    if (this.config.useMockService) {
      return this.mockService.getRecommendedIntake(age);
    } else {
      return this.aiService.getRecommendedIntake(age);
    }
  }

  // Get current configuration
  // Test connection to the active service
  public async testConnection(): Promise<boolean> {
    if (this.config.useMockService) {
      // Mock service is always available
      return true;
    } else {
      // Test backend service connection
      try {
        return await this.aiService.testConnection();
      } catch (error) {
        return false;
      }
    }
  }  public getConfig(): AnalysisConfig {
    return { ...this.config };
  }
}
