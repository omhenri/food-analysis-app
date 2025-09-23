import { useCallback } from 'react';
import { useAnalysisState } from './useReduxState';
import { FoodItem } from '../models/types';

interface UseAnalysisDataReduxReturn {
  // State from Redux
  analysisResults: any[];
  comparisonData: any[];
  isAnalyzing: boolean;
  isLoadingAnalysis: boolean;
  isLoadingComparison: boolean;
  error: string | null;

  // Actions
  analyzeAndSaveFoods: (foods: FoodItem[]) => Promise<boolean>;
  loadCurrentDayAnalysis: () => Promise<void>;
  loadCurrentDayComparison: () => Promise<void>;
  loadAnalysisForDay: (dayId: number) => Promise<void>;
  loadComparisonForDay: (dayId: number) => Promise<void>;
  clearError: () => void;
  hasAnalysisData: () => boolean;
  hasComparisonData: () => boolean;
}

/**
 * Redux-integrated version of useAnalysisData hook
 * This hook provides the same interface as the original useAnalysisData
 * but uses Redux for state management instead of local state
 */
export const useAnalysisDataRedux = (): UseAnalysisDataReduxReturn => {
  const {
    currentDayAnalysis,
    currentDayComparison,
    loading,
    error,
    analyzeAndSave,
    loadCurrentAnalysis,
    loadCurrentComparison,
    loadAnalysisForDay,
    loadComparisonForDay,
    clearError: clearReduxError,
  } = useAnalysisState();

  // Analyze foods and save to database
  const analyzeAndSaveFoods = useCallback(async (foods: FoodItem[]): Promise<boolean> => {
    if (foods.length === 0) {
      return false;
    }

    try {
      console.log('Starting analysis and save for foods:', foods.map(f => f.name));
      await analyzeAndSave(foods).unwrap();
      console.log('Analysis and save completed successfully');
      return true;
    } catch (err) {
      console.error('Failed to analyze foods:', err);
      return false;
    }
  }, [analyzeAndSave]);

  // Load analysis results for current day
  const loadCurrentDayAnalysisWrapper = useCallback(async (): Promise<void> => {
    try {
      await loadCurrentAnalysis().unwrap();
      console.log(`Loaded ${currentDayAnalysis.length} analysis results for current day`);
    } catch (err) {
      console.error('Failed to load current day analysis:', err);
    }
  }, [loadCurrentAnalysis, currentDayAnalysis.length]);

  // Load comparison data for current day
  const loadCurrentDayComparisonWrapper = useCallback(async (): Promise<void> => {
    try {
      await loadCurrentComparison().unwrap();
      console.log(`Loaded comparison data with ${currentDayComparison.length} substances`);
    } catch (err) {
      console.error('Failed to load current day comparison:', err);
    }
  }, [loadCurrentComparison, currentDayComparison.length]);

  // Load analysis results for specific day
  const loadAnalysisForDayWrapper = useCallback(async (dayId: number): Promise<void> => {
    try {
      console.log(`Loading analysis for day ${dayId}...`);
      await loadAnalysisForDay(dayId).unwrap();
      console.log(`Loaded analysis results for day ${dayId}`);
    } catch (err) {
      console.error(`Failed to load analysis for day ${dayId}:`, err);
    }
  }, [loadAnalysisForDay]);

  // Load comparison data for specific day
  const loadComparisonForDayWrapper = useCallback(async (dayId: number): Promise<void> => {
    try {
      await loadComparisonForDay(dayId).unwrap();
      console.log(`Loaded comparison data for day ${dayId}`);
    } catch (err) {
      console.error(`Failed to load comparison for day ${dayId}:`, err);
    }
  }, [loadComparisonForDay]);

  // Check if we have analysis data
  const hasAnalysisData = useCallback((): boolean => {
    return currentDayAnalysis.length > 0;
  }, [currentDayAnalysis]);

  // Check if we have comparison data
  const hasComparisonData = useCallback((): boolean => {
    return currentDayComparison.length > 0;
  }, [currentDayComparison]);

  return {
    // State from Redux
    analysisResults: currentDayAnalysis,
    comparisonData: currentDayComparison,
    isAnalyzing: loading.analyzing,
    isLoadingAnalysis: loading.loadingAnalysis,
    isLoadingComparison: loading.loadingComparison,
    error,

    // Actions
    analyzeAndSaveFoods,
    loadCurrentDayAnalysis: loadCurrentDayAnalysisWrapper,
    loadCurrentDayComparison: loadCurrentDayComparisonWrapper,
    loadAnalysisForDay: loadAnalysisForDayWrapper,
    loadComparisonForDay: loadComparisonForDayWrapper,
    clearError: clearReduxError,
    hasAnalysisData,
    hasComparisonData,
  };
};