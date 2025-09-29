import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { store } from '../../src/store';
import { AppNavigator } from '../../src/navigation/AppNavigator';
import { DatabaseService } from '../../src/services/DatabaseService';
import { AnalysisServiceManager } from '../../src/services/AnalysisServiceManager';
import { AppInitializationService } from '../../src/services/AppInitializationService';

// Mock services
jest.mock('../../src/services/DatabaseService');
jest.mock('../../src/services/AnalysisServiceManager');
jest.mock('../../src/services/AppInitializationService');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedAnalysisServiceManager = AnalysisServiceManager as jest.MockedClass<typeof AnalysisServiceManager>;
const MockedAppInitializationService = AppInitializationService as jest.MockedClass<typeof AppInitializationService>;

const renderAppWithProviders = () => {
  return render(
    <Provider store={store}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </Provider>
  );
};

describe('Complete User Journey Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database service
    const mockDatabaseInstance = {
      initializeDatabase: jest.fn().mockResolvedValue(undefined),
      getCurrentWeek: jest.fn().mockResolvedValue({ id: 1, weekNumber: 1 }),
      getCurrentDay: jest.fn().mockResolvedValue({ id: 1, dayNumber: 1 }),
      saveFoodEntry: jest.fn().mockResolvedValue(1),
      getFoodEntriesForDay: jest.fn().mockResolvedValue([]),
      saveAnalysisResult: jest.fn().mockResolvedValue(undefined),
      getAnalysisForDay: jest.fn().mockResolvedValue([]),
    };
    MockedDatabaseService.getInstance.mockReturnValue(mockDatabaseInstance as any);
    
    // Mock analysis service
    const mockAnalysisInstance = {
      enableMockService: jest.fn(),
      analyzeFoods: jest.fn().mockResolvedValue([
        {
          foodId: '1',
          ingredients: ['ingredient1', 'ingredient2'],
          chemicalSubstances: [
            { name: 'Protein', category: 'good', amount: 25, mealType: 'breakfast' },
            { name: 'Sugar', category: 'bad', amount: 15, mealType: 'breakfast' },
          ],
        },
      ]),
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
    };
    MockedAppInitializationService.getInstance.mockReturnValue(mockInitInstance as any);
  });

  it('should complete full user journey: input -> analysis -> comparison', async () => {
    const { getByTestId, getByText, queryByText } = renderAppWithProviders();

    // Wait for app to initialize
    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    });

    // Step 1: Input food
    await act(async () => {
      // Should be on food input screen by default
      expect(getByText("What's your poison?")).toBeTruthy();
    });

    // Add food entry
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

    // Step 2: Navigate to analysis
    const analyzeButton = getByTestId('analyze-button');
    fireEvent.press(analyzeButton);

    await waitFor(() => {
      expect(getByText('Analysis Results')).toBeTruthy();
    });

    // Verify analysis results are displayed
    await waitFor(() => {
      expect(getByText('Breakfast')).toBeTruthy();
      expect(getByText('Apple')).toBeTruthy();
    });

    // Step 3: Navigate to comparison
    const comparisonButton = getByTestId('comparison-button');
    fireEvent.press(comparisonButton);

    await waitFor(() => {
      expect(getByText('Daily Comparison')).toBeTruthy();
    });

    // Verify comparison data is displayed
    await waitFor(() => {
      expect(getByText('Protein')).toBeTruthy();
      expect(getByText('Sugar')).toBeTruthy();
    });
  });

  it('should handle enhanced comparison visualization', async () => {
    const { getByTestId, getByText } = renderAppWithProviders();

    // Navigate to enhanced comparison
    await act(async () => {
      // Simulate navigation to enhanced comparison screen
      const enhancedComparisonButton = getByTestId('enhanced-comparison-button');
      fireEvent.press(enhancedComparisonButton);
    });

    await waitFor(() => {
      expect(getByText('Enhanced Comparison')).toBeTruthy();
    });

    // Test layered progress bars
    const progressBar = getByTestId('layered-progress-bar');
    expect(progressBar).toBeTruthy();

    // Test interactive features
    const substanceCard = getByTestId('substance-card-protein');
    fireEvent.press(substanceCard);

    await waitFor(() => {
      expect(getByText('Protein Details')).toBeTruthy();
    });

    // Test long press for tooltip
    fireEvent(substanceCard, 'onLongPress');

    await waitFor(() => {
      expect(getByText('Protein is essential for muscle building')).toBeTruthy();
    });
  });

  it('should handle weekly report generation', async () => {
    const { getByTestId, getByText } = renderAppWithProviders();

    // Navigate to records tab
    const recordsTab = getByTestId('records-tab');
    fireEvent.press(recordsTab);

    await waitFor(() => {
      expect(getByText('Past Records')).toBeTruthy();
    });

    // Navigate to weekly report
    const weeklyReportButton = getByTestId('weekly-report-button');
    fireEvent.press(weeklyReportButton);

    await waitFor(() => {
      expect(getByText('Weekly Report')).toBeTruthy();
    });

    // Verify weekly data visualization
    expect(getByTestId('weekly-nutrition-score')).toBeTruthy();
    expect(getByTestId('weekly-trend-indicator')).toBeTruthy();
  });

  it('should handle error states gracefully', async () => {
    // Mock service failure
    const mockAnalysisInstance = {
      enableMockService: jest.fn(),
      analyzeFoods: jest.fn().mockRejectedValue(new Error('Analysis failed')),
    };
    MockedAnalysisServiceManager.getInstance.mockReturnValue(mockAnalysisInstance as any);

    const { getByTestId, getByText } = renderAppWithProviders();

    // Try to analyze food
    const analyzeButton = getByTestId('analyze-button');
    fireEvent.press(analyzeButton);

    await waitFor(() => {
      expect(getByText('Analysis failed. Please try again.')).toBeTruthy();
    });

    // Verify retry button is available
    const retryButton = getByTestId('retry-button');
    expect(retryButton).toBeTruthy();
  });

  it('should persist data across app sessions', async () => {
    const { getByTestId, getByText } = renderAppWithProviders();

    // Add food entry
    const foodInput = getByTestId('food-name-input');
    fireEvent.changeText(foodInput, 'Banana');

    const analyzeButton = getByTestId('analyze-button');
    fireEvent.press(analyzeButton);

    await waitFor(() => {
      expect(MockedDatabaseService.getInstance().saveFoodEntry).toHaveBeenCalled();
    });

    // Navigate to past records
    const recordsTab = getByTestId('records-tab');
    fireEvent.press(recordsTab);

    await waitFor(() => {
      expect(getByText('Past Records')).toBeTruthy();
    });

    // Verify data is retrieved from database
    expect(MockedDatabaseService.getInstance().getFoodEntriesForDay).toHaveBeenCalled();
  });
});