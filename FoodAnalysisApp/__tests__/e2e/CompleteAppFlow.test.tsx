import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../../App';
import { store } from '../../src/store';
import { DatabaseService } from '../../src/services/DatabaseService';
import { AnalysisServiceManager } from '../../src/services/AnalysisServiceManager';
import { AppInitializationService } from '../../src/services/AppInitializationService';

// Mock all external dependencies
jest.mock('../../src/services/DatabaseService');
jest.mock('../../src/services/AnalysisServiceManager');
jest.mock('../../src/services/AppInitializationService');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    executeSql: jest.fn(),
  })),
}));

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedAnalysisServiceManager = AnalysisServiceManager as jest.MockedClass<typeof AnalysisServiceManager>;
const MockedAppInitializationService = AppInitializationService as jest.MockedClass<typeof AppInitializationService>;
const MockedAsyncStorage = AsyncStorage as jest.MockedClass<typeof AsyncStorage>;

describe('Complete App Flow E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AsyncStorage
    MockedAsyncStorage.getItem.mockImplementation((key: string) => {
      switch (key) {
        case 'hasLaunchedBefore':
          return Promise.resolve('true'); // Not first time
        case 'appVersion':
          return Promise.resolve('1.0.0');
        case 'lastLaunchDate':
          return Promise.resolve(new Date().toISOString());
        default:
          return Promise.resolve(null);
      }
    });
    MockedAsyncStorage.setItem.mockResolvedValue(undefined);

    // Mock database service
    const mockDatabaseInstance = {
      initializeDatabase: jest.fn().mockResolvedValue(undefined),
      getCurrentWeek: jest.fn().mockResolvedValue({ 
        id: 1, 
        weekNumber: 1, 
        startDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      }),
      getCurrentDay: jest.fn().mockResolvedValue({ 
        id: 1, 
        weekId: 1,
        dayNumber: 1, 
        date: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      }),
      createNewWeek: jest.fn().mockResolvedValue({ 
        id: 1, 
        weekNumber: 1, 
        startDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      }),
      createNewDay: jest.fn().mockResolvedValue({ 
        id: 1, 
        weekId: 1,
        dayNumber: 1, 
        date: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      }),
      saveFoodEntry: jest.fn().mockResolvedValue(1),
      getFoodEntriesForDay: jest.fn().mockResolvedValue([
        {
          id: 1,
          dayId: 1,
          foodName: 'Apple',
          mealType: 'breakfast',
          portion: '1/1',
          createdAt: '2024-01-01T08:00:00Z'
        }
      ]),
      saveAnalysisResult: jest.fn().mockResolvedValue(undefined),
      getAnalysisForDay: jest.fn().mockResolvedValue([
        {
          id: 1,
          foodEntryId: 1,
          ingredients: ['Fructose', 'Fiber', 'Vitamin C'],
          chemicalSubstances: [
            { name: 'Fructose', category: 'neutral', amount: 15, mealType: 'breakfast' },
            { name: 'Fiber', category: 'good', amount: 4, mealType: 'breakfast' },
            { name: 'Vitamin C', category: 'good', amount: 8, mealType: 'breakfast' },
          ],
          analyzedAt: '2024-01-01T08:05:00Z'
        }
      ]),
      getAllWeeks: jest.fn().mockResolvedValue([
        { id: 1, weekNumber: 1, startDate: '2024-01-01', createdAt: '2024-01-01T00:00:00Z' }
      ]),
      getDaysForWeek: jest.fn().mockResolvedValue([
        { id: 1, weekId: 1, dayNumber: 1, date: '2024-01-01', createdAt: '2024-01-01T00:00:00Z' }
      ]),
      getWeeklyData: jest.fn().mockResolvedValue({
        weekId: 1,
        totalEntries: 7,
        totalSubstances: 15,
        averageScore: 75,
      }),
    };
    MockedDatabaseService.getInstance.mockReturnValue(mockDatabaseInstance as any);
    
    // Mock analysis service
    const mockAnalysisInstance = {
      enableMockService: jest.fn(),
      analyzeFoods: jest.fn().mockResolvedValue([
        {
          foodId: '1',
          ingredients: ['Fructose', 'Fiber', 'Vitamin C'],
          chemicalSubstances: [
            { name: 'Fructose', category: 'neutral', amount: 15, mealType: 'breakfast' },
            { name: 'Fiber', category: 'good', amount: 4, mealType: 'breakfast' },
            { name: 'Vitamin C', category: 'good', amount: 8, mealType: 'breakfast' },
          ],
        },
      ]),
      getRecommendedIntake: jest.fn().mockResolvedValue({
        'Fructose': { recommended: 25, unit: 'g' },
        'Fiber': { recommended: 25, unit: 'g' },
        'Vitamin C': { recommended: 90, unit: 'mg' },
      }),
    };
    MockedAnalysisServiceManager.getInstance.mockReturnValue(mockAnalysisInstance as any);
    
    // Mock initialization service
    const mockInitInstance = {
      initializeApp: jest.fn().mockResolvedValue({
        isFirstTime: false,
        databaseInitialized: true,
        servicesReady: true,
      }),
      isAppInitialized: jest.fn().mockReturnValue(true),
      performHealthCheck: jest.fn().mockResolvedValue(true),
      getAppInfo: jest.fn().mockResolvedValue({
        version: '1.0.0',
        lastLaunchDate: new Date().toISOString(),
        totalDays: 1,
        totalWeeks: 1,
      }),
    };
    MockedAppInitializationService.getInstance.mockReturnValue(mockInitInstance as any);
  });

  it('should complete full app initialization and user flow', async () => {
    const { getByTestId, getByText, queryByText, findByText } = render(<App />);

    // Wait for app initialization to complete
    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    }, { timeout: 5000 });

    // Verify app is initialized
    expect(MockedAppInitializationService.getInstance().initializeApp).toHaveBeenCalled();
    expect(MockedDatabaseService.getInstance().initializeDatabase).toHaveBeenCalled();

    // Should be on food input screen by default
    await waitFor(() => {
      expect(getByText("What's your poison?")).toBeTruthy();
    });

    // Test food input flow
    const foodInput = getByTestId('food-name-input');
    fireEvent.changeText(foodInput, 'Apple');

    // Select meal type
    const mealTypeButton = getByTestId('meal-type-button');
    fireEvent.press(mealTypeButton);
    
    await waitFor(() => {
      const breakfastOption = getByText('Breakfast');
      fireEvent.press(breakfastOption);
    });

    // Select portion
    const portionButton = getByTestId('portion-button');
    fireEvent.press(portionButton);
    
    await waitFor(() => {
      const fullPortionOption = getByText('1/1');
      fireEvent.press(fullPortionOption);
    });

    // Analyze food
    const analyzeButton = getByTestId('analyze-button');
    fireEvent.press(analyzeButton);

    // Wait for analysis to complete
    await waitFor(() => {
      expect(getByText('Analysis Results')).toBeTruthy();
    });

    // Verify analysis results
    expect(getByText('Breakfast')).toBeTruthy();
    expect(getByText('Apple')).toBeTruthy();
    expect(getByText('Fructose')).toBeTruthy();
    expect(getByText('Fiber')).toBeTruthy();
    expect(getByText('Vitamin C')).toBeTruthy();

    // Navigate to comparison
    const comparisonButton = getByTestId('comparison-button');
    fireEvent.press(comparisonButton);

    await waitFor(() => {
      expect(getByText('Daily Comparison')).toBeTruthy();
    });

    // Test enhanced comparison features
    const enhancedComparisonButton = getByTestId('enhanced-comparison-button');
    if (enhancedComparisonButton) {
      fireEvent.press(enhancedComparisonButton);

      await waitFor(() => {
        expect(getByText('Enhanced Comparison')).toBeTruthy();
      });

      // Test interactive features
      const proteinCard = getByTestId('enhanced-comparison-card-fiber');
      if (proteinCard) {
        fireEvent.press(proteinCard);

        await waitFor(() => {
          expect(getByText('Fiber Details')).toBeTruthy();
        });
      }
    }

    // Navigate to records tab
    const recordsTab = getByTestId('records-tab');
    fireEvent.press(recordsTab);

    await waitFor(() => {
      expect(getByText('Past Records')).toBeTruthy();
    });

    // Test day detail view
    const dayButton = getByTestId('day-1-button');
    if (dayButton) {
      fireEvent.press(dayButton);

      await waitFor(() => {
        expect(getByText('Day 1 Details')).toBeTruthy();
      });
    }

    // Test weekly report (if available)
    const weeklyReportButton = getByTestId('weekly-report-button');
    if (weeklyReportButton) {
      fireEvent.press(weeklyReportButton);

      await waitFor(() => {
        expect(getByText('Weekly Report')).toBeTruthy();
      });
    }

    // Verify data persistence
    expect(MockedDatabaseService.getInstance().saveFoodEntry).toHaveBeenCalled();
    expect(MockedDatabaseService.getInstance().saveAnalysisResult).toHaveBeenCalled();
  });

  it('should handle first-time user experience', async () => {
    // Mock first-time user
    MockedAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === 'hasLaunchedBefore') {
        return Promise.resolve(null); // First time
      }
      return Promise.resolve(null);
    });

    const mockInitInstance = {
      initializeApp: jest.fn().mockResolvedValue({
        isFirstTime: true,
        databaseInitialized: true,
        servicesReady: true,
      }),
      isAppInitialized: jest.fn().mockReturnValue(true),
    };
    MockedAppInitializationService.getInstance.mockReturnValue(mockInitInstance as any);

    const { getByText, getByTestId } = render(<App />);

    // Should show first-time user experience
    await waitFor(() => {
      expect(getByText('Welcome to Food Analysis')).toBeTruthy();
    });

    // Navigate through onboarding
    const nextButton = getByTestId('next-button');
    fireEvent.press(nextButton);

    await waitFor(() => {
      expect(getByText('Input Your Meals')).toBeTruthy();
    });

    // Skip to end
    const skipButton = getByTestId('skip-button');
    fireEvent.press(skipButton);

    // Should reach main app
    await waitFor(() => {
      expect(getByText("What's your poison?")).toBeTruthy();
    });

    // Verify first-time setup was called
    expect(MockedAsyncStorage.setItem).toHaveBeenCalledWith('hasLaunchedBefore', 'true');
  });

  it('should handle error states gracefully', async () => {
    // Mock service failure
    const mockAnalysisInstance = {
      enableMockService: jest.fn(),
      analyzeFoods: jest.fn().mockRejectedValue(new Error('Network error')),
    };
    MockedAnalysisServiceManager.getInstance.mockReturnValue(mockAnalysisInstance as any);

    const { getByTestId, getByText } = render(<App />);

    // Wait for app to load
    await waitFor(() => {
      expect(getByText("What's your poison?")).toBeTruthy();
    });

    // Try to analyze food
    const foodInput = getByTestId('food-name-input');
    fireEvent.changeText(foodInput, 'Apple');

    const analyzeButton = getByTestId('analyze-button');
    fireEvent.press(analyzeButton);

    // Should show error message
    await waitFor(() => {
      expect(getByText('Analysis failed. Please try again.')).toBeTruthy();
    });

    // Should have retry button
    const retryButton = getByTestId('retry-button');
    expect(retryButton).toBeTruthy();

    // Test retry functionality
    fireEvent.press(retryButton);
    expect(mockAnalysisInstance.analyzeFoods).toHaveBeenCalledTimes(2);
  });

  it('should maintain performance with large datasets', async () => {
    // Mock large dataset
    const largeFoodEntries = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      dayId: 1,
      foodName: `Food ${i + 1}`,
      mealType: 'breakfast',
      portion: '1/1',
      createdAt: new Date().toISOString(),
    }));

    const mockDatabaseInstance = {
      ...MockedDatabaseService.getInstance(),
      getFoodEntriesForDay: jest.fn().mockResolvedValue(largeFoodEntries),
    };
    MockedDatabaseService.getInstance.mockReturnValue(mockDatabaseInstance as any);

    const startTime = performance.now();
    
    const { getByTestId } = render(<App />);

    // Wait for app to load
    await waitFor(() => {
      expect(getByTestId('records-tab')).toBeTruthy();
    });

    // Navigate to records
    const recordsTab = getByTestId('records-tab');
    fireEvent.press(recordsTab);

    await waitFor(() => {
      expect(getByTestId('past-records-list')).toBeTruthy();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within reasonable time (less than 2 seconds)
    expect(renderTime).toBeLessThan(2000);
  });

  it('should handle offline mode correctly', async () => {
    // Mock network failure
    const mockAnalysisInstance = {
      enableMockService: jest.fn(),
      analyzeFoods: jest.fn().mockRejectedValue(new Error('Network unavailable')),
    };
    MockedAnalysisServiceManager.getInstance.mockReturnValue(mockAnalysisInstance as any);

    const { getByTestId, getByText } = render(<App />);

    // Wait for app to load
    await waitFor(() => {
      expect(getByText("What's your poison?")).toBeTruthy();
    });

    // Should show offline indicator
    expect(getByTestId('offline-indicator')).toBeTruthy();

    // Food input should still work
    const foodInput = getByTestId('food-name-input');
    fireEvent.changeText(foodInput, 'Apple');

    // Data should be saved locally
    const analyzeButton = getByTestId('analyze-button');
    fireEvent.press(analyzeButton);

    // Should show offline message but still save data
    await waitFor(() => {
      expect(MockedDatabaseService.getInstance().saveFoodEntry).toHaveBeenCalled();
    });
  });
});