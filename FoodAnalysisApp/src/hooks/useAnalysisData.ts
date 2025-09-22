import { useState, useCallback } from 'react';
import { AnalysisResult, FoodItem, ComparisonData } from '../models/types';
import { AnalysisDataService } from '../services/AnalysisDataService';

interface UseAnalysisDataReturn {
  // State
  analysisResults: AnalysisResult[];
  comparisonData: ComparisonData[];
  isAnalyzing: boolean;
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

export const useAnalysisData = (): UseAnalysisDataReturn => {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isLoadingComparison, setIsLoadingComparison] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const analysisDataService = AnalysisDataService.getInstance();

  // Analyze foods and save to database
  const analyzeAndSaveFoods = useCallback(async (foods: FoodItem[]): Promise<boolean> => {
    if (foods.length === 0) {
      setError('No foods to analyze');
      return false;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      console.log('Starting analysis and save for foods:', foods.map(f => f.name));
      const results = await analysisDataService.analyzeAndSaveFoods(foods);
      
      setAnalysisResults(results);
      console.log('Analysis and save completed successfully');
      
      return true;
    } catch (err) {
      const errorMessage = `Failed to analyze foods: ${err}`;
      setError(errorMessage);
      console.error(errorMessage);
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  }, [analysisDataService]);

  // Load analysis results for current day
  const loadCurrentDayAnalysis = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      const results = await analysisDataService.getCurrentDayAnalysis();
      setAnalysisResults(results);
      
      console.log(`Loaded ${results.length} analysis results for current day`);
    } catch (err) {
      const errorMessage = `Failed to load current day analysis: ${err}`;
      setError(errorMessage);
      console.error(errorMessage);
    }
  }, [analysisDataService]);

  // Load comparison data for current day
  const loadCurrentDayComparison = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingComparison(true);
      setError(null);
      
      const comparison = await analysisDataService.getCurrentDayComparison();
      setComparisonData(comparison);
      
      console.log(`Loaded comparison data with ${comparison.length} substances`);
    } catch (err) {
      const errorMessage = `Failed to load current day comparison: ${err}`;
      setError(errorMessage);
      console.error(errorMessage);
    } finally {
      setIsLoadingComparison(false);
    }
  }, [analysisDataService]);

  // Load analysis results for specific day
  const loadAnalysisForDay = useCallback(async (dayId: number): Promise<void> => {
    try {
      setError(null);
      
      const results = await analysisDataService.getAnalysisForDay(dayId);
      setAnalysisResults(results);
      
      console.log(`Loaded ${results.length} analysis results for day ${dayId}`);
    } catch (err) {
      const errorMessage = `Failed to load analysis for day ${dayId}: ${err}`;
      setError(errorMessage);
      console.error(errorMessage);
    }
  }, [analysisDataService]);

  // Load comparison data for specific day
  const loadComparisonForDay = useCallback(async (dayId: number): Promise<void> => {
    try {
      setIsLoadingComparison(true);
      setError(null);
      
      const comparison = await analysisDataService.getComparisonForDay(dayId);
      setComparisonData(comparison);
      
      console.log(`Loaded comparison data for day ${dayId} with ${comparison.length} substances`);
    } catch (err) {
      const errorMessage = `Failed to load comparison for day ${dayId}: ${err}`;
      setError(errorMessage);
      console.error(errorMessage);
    } finally {
      setIsLoadingComparison(false);
    }
  }, [analysisDataService]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if we have analysis data
  const hasAnalysisData = useCallback((): boolean => {
    return analysisResults.length > 0;
  }, [analysisResults]);

  // Check if we have comparison data
  const hasComparisonData = useCallback((): boolean => {
    return comparisonData.length > 0;
  }, [comparisonData]);

  return {
    // State
    analysisResults,
    comparisonData,
    isAnalyzing,
    isLoadingComparison,
    error,

    // Actions
    analyzeAndSaveFoods,
    loadCurrentDayAnalysis,
    loadCurrentDayComparison,
    loadAnalysisForDay,
    loadComparisonForDay,
    clearError,
    hasAnalysisData,
    hasComparisonData,
  };
};