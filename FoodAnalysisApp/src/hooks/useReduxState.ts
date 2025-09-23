import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  // Food slice
  addFoodItem,
  removeFoodItem,
  updateFoodItem,
  clearCurrentFoods,
  saveFoodItems,
  loadCurrentDayFoodEntries,
  loadFoodEntriesForDay,
  loadCurrentDay,
  selectCurrentFoods,
  selectFoodEntriesForDay,
  selectCurrentDay,
  selectDayTrackingInfo,
  selectFoodLoading,
  selectFoodError,
  selectIsDirty,
  clearError as clearFoodError,
} from '../store/slices/foodSlice';
import {
  // Analysis slice
  analyzeAndSaveFoods,
  loadCurrentDayAnalysis,
  loadAnalysisForDay,
  loadCurrentDayComparison,
  loadComparisonForDay,
  loadWeeklyAnalysis,
  selectCurrentDayAnalysis,
  selectCurrentDayComparison,
  selectAnalysisForDay,
  selectComparisonForDay,
  selectWeeklyAnalysis,
  selectAnalysisLoading,
  selectAnalysisError,
  clearError as clearAnalysisError,
} from '../store/slices/analysisSlice';
import {
  // App slice
  initializeApp,
  setActiveTab,
  setActiveScreen,
  updateSettings,
  setOnlineStatus,
  loadAllWeeks,
  loadDaysForWeek,
  selectIsInitialized,
  selectIsOnline,
  selectCurrentWeek,
  selectActiveTab,
  selectActiveScreen,
  selectSettings,
  selectWeeks,
  selectDaysForWeek,
  selectAppLoading,
  selectAppError,
  clearError as clearAppError,
} from '../store/slices/appSlice';
import { FoodItem } from '../models/types';

// Custom hook for food-related Redux state
export const useFoodState = () => {
  const dispatch = useAppDispatch();
  
  // Selectors
  const currentFoods = useAppSelector(selectCurrentFoods);
  const currentDay = useAppSelector(selectCurrentDay);
  const dayTrackingInfo = useAppSelector(selectDayTrackingInfo);
  const loading = useAppSelector(selectFoodLoading);
  const error = useAppSelector(selectFoodError);
  const isDirty = useAppSelector(selectIsDirty);
  
  // Actions
  const actions = {
    addFood: useCallback((food: FoodItem) => dispatch(addFoodItem(food)), [dispatch]),
    removeFood: useCallback((index: number) => dispatch(removeFoodItem(index)), [dispatch]),
    updateFood: useCallback((index: number, food: FoodItem) => 
      dispatch(updateFoodItem({ index, food })), [dispatch]),
    clearFoods: useCallback(() => dispatch(clearCurrentFoods()), [dispatch]),
    saveFoods: useCallback((foods: FoodItem[]) => dispatch(saveFoodItems(foods)), [dispatch]),
    loadCurrentDayFoods: useCallback(() => dispatch(loadCurrentDayFoodEntries()), [dispatch]),
    loadFoodsForDay: useCallback((dayId: number) => dispatch(loadFoodEntriesForDay(dayId)), [dispatch]),
    loadCurrentDay: useCallback(() => dispatch(loadCurrentDay()), [dispatch]),
    clearError: useCallback(() => dispatch(clearFoodError()), [dispatch]),
  };
  
  // Selectors with parameters
  const getFoodEntriesForDay = useCallback((dayId: number) => 
    useAppSelector(selectFoodEntriesForDay(dayId)), []);
  
  return {
    // State
    currentFoods,
    currentDay,
    dayTrackingInfo,
    loading,
    error,
    isDirty,
    // Actions
    ...actions,
    // Parameterized selectors
    getFoodEntriesForDay,
  };
};

// Custom hook for analysis-related Redux state
export const useAnalysisState = () => {
  const dispatch = useAppDispatch();
  
  // Selectors
  const currentDayAnalysis = useAppSelector(selectCurrentDayAnalysis);
  const currentDayComparison = useAppSelector(selectCurrentDayComparison);
  const loading = useAppSelector(selectAnalysisLoading);
  const error = useAppSelector(selectAnalysisError);
  
  // Actions
  const actions = {
    analyzeAndSave: useCallback((foods: FoodItem[]) => dispatch(analyzeAndSaveFoods(foods)), [dispatch]),
    loadCurrentAnalysis: useCallback(() => dispatch(loadCurrentDayAnalysis()), [dispatch]),
    loadAnalysisForDay: useCallback((dayId: number) => dispatch(loadAnalysisForDay(dayId)), [dispatch]),
    loadCurrentComparison: useCallback(() => dispatch(loadCurrentDayComparison()), [dispatch]),
    loadComparisonForDay: useCallback((dayId: number) => dispatch(loadComparisonForDay(dayId)), [dispatch]),
    loadWeeklyAnalysis: useCallback((weekId: number) => dispatch(loadWeeklyAnalysis(weekId)), [dispatch]),
    clearError: useCallback(() => dispatch(clearAnalysisError()), [dispatch]),
  };
  
  // Selectors with parameters
  const getAnalysisForDay = useCallback((dayId: number) => 
    useAppSelector(selectAnalysisForDay(dayId)), []);
  const getComparisonForDay = useCallback((dayId: number) => 
    useAppSelector(selectComparisonForDay(dayId)), []);
  const getWeeklyAnalysis = useCallback((weekId: number) => 
    useAppSelector(selectWeeklyAnalysis(weekId)), []);
  
  return {
    // State
    currentDayAnalysis,
    currentDayComparison,
    loading,
    error,
    // Actions
    ...actions,
    // Parameterized selectors
    getAnalysisForDay,
    getComparisonForDay,
    getWeeklyAnalysis,
  };
};

// Custom hook for app-related Redux state
export const useAppState = () => {
  const dispatch = useAppDispatch();
  
  // Selectors
  const isInitialized = useAppSelector(selectIsInitialized);
  const isOnline = useAppSelector(selectIsOnline);
  const currentWeek = useAppSelector(selectCurrentWeek);
  const activeTab = useAppSelector(selectActiveTab);
  const activeScreen = useAppSelector(selectActiveScreen);
  const settings = useAppSelector(selectSettings);
  const weeks = useAppSelector(selectWeeks);
  const loading = useAppSelector(selectAppLoading);
  const error = useAppSelector(selectAppError);
  
  // Actions
  const actions = {
    initialize: useCallback(() => dispatch(initializeApp()), [dispatch]),
    setTab: useCallback((tab: 'input' | 'records') => dispatch(setActiveTab(tab)), [dispatch]),
    setScreen: useCallback((screen: string) => dispatch(setActiveScreen(screen)), [dispatch]),
    updateSettings: useCallback((settings: any) => dispatch(updateSettings(settings)), [dispatch]),
    setOnline: useCallback((online: boolean) => dispatch(setOnlineStatus(online)), [dispatch]),
    loadWeeks: useCallback(() => dispatch(loadAllWeeks()), [dispatch]),
    loadDaysForWeek: useCallback((weekId: number) => dispatch(loadDaysForWeek(weekId)), [dispatch]),
    clearError: useCallback(() => dispatch(clearAppError()), [dispatch]),
  };
  
  // Selectors with parameters
  const getDaysForWeek = useCallback((weekId: number) => 
    useAppSelector(selectDaysForWeek(weekId)), []);
  
  return {
    // State
    isInitialized,
    isOnline,
    currentWeek,
    activeTab,
    activeScreen,
    settings,
    weeks,
    loading,
    error,
    // Actions
    ...actions,
    // Parameterized selectors
    getDaysForWeek,
  };
};

// Combined hook for all Redux state (use sparingly to avoid unnecessary re-renders)
export const useReduxState = () => {
  const foodState = useFoodState();
  const analysisState = useAnalysisState();
  const appState = useAppState();
  
  return {
    food: foodState,
    analysis: analysisState,
    app: appState,
  };
};