import { configureStore } from '@reduxjs/toolkit';
import analysisSlice, {
  analyzeAndSaveFoods,
  loadCurrentDayAnalysis,
  loadCurrentDayComparison,
  clearError,
  clearAllAnalysis,
} from '../../src/store/slices/analysisSlice';
import { AnalysisResult, ComparisonData, FoodItem } from '../../src/models/types';

// Mock the AnalysisDataService
jest.mock('../../src/services/AnalysisDataService', () => ({
  AnalysisDataService: {
    getInstance: jest.fn(() => ({
      analyzeAndSaveFoods: jest.fn(),
      getCurrentDayAnalysis: jest.fn(),
      getCurrentDayComparison: jest.fn(),
      getAnalysisForDay: jest.fn(),
      getComparisonForDay: jest.fn(),
      getWeeklyAnalysis: jest.fn(),
    })),
  },
}));

describe('analysisSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        analysis: analysisSlice,
      },
    });
  });

  const mockFoodItem: FoodItem = {
    id: '1',
    name: 'Apple',
    mealType: 'breakfast',
    portion: '1/1',
  };

  const mockAnalysisResult: AnalysisResult = {
    id: 1,
    foodEntryId: 1,
    foodId: '1',
    ingredients: ['apple', 'water'],
    chemicalSubstances: [
      {
        name: 'Vitamin C',
        category: 'good',
        amount: 10,
        mealType: 'breakfast',
      },
    ],
  };

  const mockComparisonData: ComparisonData = {
    substance: 'Vitamin C',
    consumed: 10,
    recommended: 90,
    percentage: 11.1,
    status: 'under',
  };

  describe('synchronous actions', () => {
    it('should clear error', () => {
      // Set an error first
      const initialState = {
        ...store.getState().analysis,
        error: 'Test error',
      };
      
      const state = analysisSlice(initialState, clearError());
      expect(state.error).toBe(null);
    });

    it('should clear all analysis data', () => {
      // Set some data first
      const initialState = {
        ...store.getState().analysis,
        analysisByDay: { 1: [mockAnalysisResult] },
        comparisonByDay: { 1: [mockComparisonData] },
        currentDayAnalysis: [mockAnalysisResult],
        currentDayComparison: [mockComparisonData],
      };
      
      const state = analysisSlice(initialState, clearAllAnalysis());
      
      expect(state.analysisByDay).toEqual({});
      expect(state.comparisonByDay).toEqual({});
      expect(state.currentDayAnalysis).toEqual([]);
      expect(state.currentDayComparison).toEqual([]);
    });
  });

  describe('async actions', () => {
    it('should handle analyzeAndSaveFoods pending state', () => {
      const action = { type: analyzeAndSaveFoods.pending.type };
      const state = analysisSlice(undefined, action);
      
      expect(state.loading.analyzing).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should handle analyzeAndSaveFoods fulfilled state', () => {
      const results = [mockAnalysisResult];
      
      const action = {
        type: analyzeAndSaveFoods.fulfilled.type,
        payload: results,
      };
      
      const state = analysisSlice(undefined, action);
      
      expect(state.loading.analyzing).toBe(false);
      expect(state.currentDayAnalysis).toEqual(results);
    });

    it('should handle analyzeAndSaveFoods rejected state', () => {
      const errorMessage = 'Failed to analyze foods';
      
      const action = {
        type: analyzeAndSaveFoods.rejected.type,
        payload: errorMessage,
      };
      
      const state = analysisSlice(undefined, action);
      
      expect(state.loading.analyzing).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should handle loadCurrentDayAnalysis fulfilled state', () => {
      const results = [mockAnalysisResult];
      
      const action = {
        type: loadCurrentDayAnalysis.fulfilled.type,
        payload: results,
      };
      
      const state = analysisSlice(undefined, action);
      
      expect(state.loading.loadingAnalysis).toBe(false);
      expect(state.currentDayAnalysis).toEqual(results);
    });

    it('should handle loadCurrentDayComparison fulfilled state', () => {
      const comparison = [mockComparisonData];
      
      const action = {
        type: loadCurrentDayComparison.fulfilled.type,
        payload: comparison,
      };
      
      const state = analysisSlice(undefined, action);
      
      expect(state.loading.loadingComparison).toBe(false);
      expect(state.currentDayComparison).toEqual(comparison);
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().analysis;
      
      expect(state.analysisByDay).toEqual({});
      expect(state.comparisonByDay).toEqual({});
      expect(state.weeklyAnalysis).toEqual({});
      expect(state.currentDayAnalysis).toEqual([]);
      expect(state.currentDayComparison).toEqual([]);
      expect(state.loading).toEqual({
        analyzing: false,
        loadingAnalysis: false,
        loadingComparison: false,
        loadingWeekly: false,
      });
      expect(state.error).toBe(null);
      expect(state.lastUpdated).toEqual({
        analysis: {},
        comparison: {},
        weekly: {},
      });
    });
  });
});