import { FoodItem, AnalysisResult, RecommendedIntake } from '../models/types';
import { AIAnalysisService } from './AIAnalysisService';
import { MockAIService } from './MockAIService';

// Configuration for analysis service
interface AnalysisConfig {
  useMockService: boolean;
  useBackend: boolean;
  apiKey?: string;
  backendUrl?: string;
}

export class AnalysisServiceManager {
  private static instance: AnalysisServiceManager;
  private config: AnalysisConfig;
  private aiService: AIAnalysisService;
  private mockService: MockAIService;

  private constructor() {
    this.config = {
      useMockService: false, // Default to backend integration
      useBackend: true, // Use backend by default
      backendUrl: __DEV__ ? 'http://localhost:8000' : 'https://your-production-backend.com/api',
    };
    this.aiService = AIAnalysisService.getInstance();
    this.mockService = MockAIService.getInstance();
    
    // Configure AI service to use backend
    this.aiService.setUseBackend(this.config.useBackend);
    if (this.config.backendUrl) {
      this.aiService.configureBackend(this.config.backendUrl);
    }
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
    
    if (config.useBackend !== undefined) {
      this.aiService.setUseBackend(config.useBackend);
    }
    
    if (config.backendUrl) {
      this.aiService.configureBackend(config.backendUrl);
    }
  }

  // Enable backend integration
  public enableBackendService(backendUrl?: string): void {
    this.config.useMockService = false;
    this.config.useBackend = true;
    
    if (backendUrl) {
      this.config.backendUrl = backendUrl;
      this.aiService.configureBackend(backendUrl);
    }
    
    this.aiService.setUseBackend(true);
    console.log('Backend service enabled');
  }

  // Enable direct AI service (bypass backend)
  public enableDirectAIService(apiKey: string): void {
    this.config.useMockService = false;
    this.config.useBackend = false;
    this.config.apiKey = apiKey;
    
    this.aiService.setApiKey(apiKey);
    this.aiService.setUseBackend(false);
    console.log('Direct AI service enabled');
  }

  // Get current service instance
  private getCurrentService() {
    return this.config.useMockService ? this.mockService : this.aiService;
  }

  // Analyze foods using the configured service
  public async analyzeFoods(foods: FoodItem[]): Promise<AnalysisResult[]> {
    try {
      const service = this.getCurrentService();
      const serviceType = this.config.useMockService 
        ? 'Mock' 
        : this.config.useBackend 
          ? 'Backend AI' 
          : 'Direct AI';
      
      console.log(`Using ${serviceType} service for analysis`);
      
      const results = await service.analyzeFoods(foods);
      console.log('Analysis completed successfully');
      
      return results;
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Fallback to mock service if AI/Backend fails
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