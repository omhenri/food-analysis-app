import { DatabaseService } from './DatabaseService';
import { AnalysisServiceManager } from './AnalysisServiceManager';
import { ErrorHandler } from '../utils/errorHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface InitializationResult {
  isFirstTime: boolean;
  databaseInitialized: boolean;
  servicesReady: boolean;
  error?: Error;
}

export class AppInitializationService {
  private static instance: AppInitializationService;
  private isInitialized = false;

  static getInstance(): AppInitializationService {
    if (!AppInitializationService.instance) {
      AppInitializationService.instance = new AppInitializationService();
    }
    return AppInitializationService.instance;
  }

  async initializeApp(): Promise<InitializationResult> {
    try {
      console.log('Starting app initialization...');

      // Check if this is the first time opening the app
      const isFirstTime = await this.checkFirstTimeUser();
      
      // Initialize database
      const databaseService = DatabaseService.getInstance();
      await databaseService.initializeDatabase();
      
      // Initialize analysis services
      const analysisService = AnalysisServiceManager.getInstance();
      analysisService.enableMockService(); // Use mock for development
      
      // Set up first-time user data if needed
      if (isFirstTime) {
        await this.setupFirstTimeUser();
      }

      // Mark app as initialized
      this.isInitialized = true;
      
      console.log('App initialization completed successfully');
      
      return {
        isFirstTime,
        databaseInitialized: true,
        servicesReady: true,
      };
    } catch (error) {
      console.error('App initialization failed:', error);
      ErrorHandler.handleError(error as Error);
      
      return {
        isFirstTime: false,
        databaseInitialized: false,
        servicesReady: false,
        error: error as Error,
      };
    }
  }

  private async checkFirstTimeUser(): Promise<boolean> {
    try {
      const hasLaunchedBefore = await AsyncStorage.getItem('hasLaunchedBefore');
      return hasLaunchedBefore === null;
    } catch (error) {
      console.warn('Failed to check first-time user status:', error);
      return false;
    }
  }

  private async setupFirstTimeUser(): Promise<void> {
    try {
      // Mark that the app has been launched before
      await AsyncStorage.setItem('hasLaunchedBefore', 'true');
      
      // Set up initial app state
      await AsyncStorage.setItem('appVersion', '1.0.0');
      await AsyncStorage.setItem('lastLaunchDate', new Date().toISOString());
      
      // Initialize first week and day
      const databaseService = DatabaseService.getInstance();
      const currentWeek = await databaseService.getCurrentWeek();
      const currentDay = await databaseService.getCurrentDay();
      
      console.log('First-time user setup completed', {
        weekId: currentWeek.id,
        dayId: currentDay.id,
      });
    } catch (error) {
      console.error('Failed to setup first-time user:', error);
      throw error;
    }
  }

  async performHealthCheck(): Promise<boolean> {
    try {
      // Check database connectivity
      const databaseService = DatabaseService.getInstance();
      await databaseService.getCurrentWeek();
      
      // Check analysis service
      const analysisService = AnalysisServiceManager.getInstance();
      // Perform a simple test analysis
      
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  isAppInitialized(): boolean {
    return this.isInitialized;
  }

  async getAppInfo(): Promise<{
    version: string;
    lastLaunchDate: string;
    totalDays: number;
    totalWeeks: number;
  }> {
    try {
      const version = await AsyncStorage.getItem('appVersion') || '1.0.0';
      const lastLaunchDate = await AsyncStorage.getItem('lastLaunchDate') || new Date().toISOString();
      
      const databaseService = DatabaseService.getInstance();
      const weeks = await databaseService.getAllWeeks();
      const totalWeeks = weeks.length;
      
      // Calculate total days across all weeks
      let totalDays = 0;
      for (const week of weeks) {
        const days = await databaseService.getDaysForWeek(week.id);
        totalDays += days.length;
      }
      
      return {
        version,
        lastLaunchDate,
        totalDays,
        totalWeeks,
      };
    } catch (error) {
      console.error('Failed to get app info:', error);
      return {
        version: '1.0.0',
        lastLaunchDate: new Date().toISOString(),
        totalDays: 0,
        totalWeeks: 0,
      };
    }
  }
}