import { useState, useEffect, useCallback } from 'react';
import { FoodItem, FoodEntry, Day } from '../models/types';
import { FoodService } from '../services/FoodService';

interface UseFoodDataReturn {
  // State
  foods: FoodItem[];
  currentDay: Day | null;
  dayNumber: number;
  weekNumber: number;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;

  // Actions
  setFoods: (foods: FoodItem[]) => void;
  saveFoods: () => Promise<boolean>;
  loadCurrentDayFoods: () => Promise<void>;
  refreshDayInfo: () => Promise<void>;
  clearError: () => void;
}

export const useFoodData = (): UseFoodDataReturn => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [currentDay, setCurrentDay] = useState<Day | null>(null);
  const [dayNumber, setDayNumber] = useState<number>(1);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [initialFoods, setInitialFoods] = useState<FoodItem[]>([]);

  const foodService = FoodService.getInstance();

  // Initialize service on mount
  useEffect(() => {
    const initializeService = async () => {
      try {
        setIsLoading(true);
        await foodService.initialize();
        await refreshDayInfo();
        await loadCurrentDayFoods();
      } catch (err) {
        setError(`Failed to initialize: ${err}`);
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();
  }, []);

  // Track changes to foods array
  useEffect(() => {
    const hasChanges = JSON.stringify(foods) !== JSON.stringify(initialFoods);
    setHasUnsavedChanges(hasChanges);
  }, [foods, initialFoods]);

  // Load current day food entries
  const loadCurrentDayFoods = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const entries = await foodService.getCurrentDayFoodEntries();
      const foodItems = foodService.convertEntriesToFoodItems(entries);
      
      setFoods(foodItems);
      setInitialFoods(foodItems);
    } catch (err) {
      setError(`Failed to load foods: ${err}`);
      console.error('Failed to load current day foods:', err);
    } finally {
      setIsLoading(false);
    }
  }, [foodService]);

  // Refresh day information
  const refreshDayInfo = useCallback(async (): Promise<void> => {
    try {
      const dayInfo = await foodService.getDayTrackingInfo();
      setCurrentDay(dayInfo.currentDay);
      setDayNumber(dayInfo.dayNumber);
      setWeekNumber(dayInfo.weekNumber);
    } catch (err) {
      setError(`Failed to refresh day info: ${err}`);
      console.error('Failed to refresh day info:', err);
    }
  }, [foodService]);

  // Save foods to database
  const saveFoods = useCallback(async (): Promise<boolean> => {
    if (foods.length === 0) {
      setError('No foods to save');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      await foodService.saveFoodItems(foods);
      setInitialFoods([...foods]);
      setHasUnsavedChanges(false);
      
      return true;
    } catch (err) {
      setError(`Failed to save foods: ${err}`);
      console.error('Failed to save foods:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [foods, foodService]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update foods and track changes
  const updateFoods = useCallback((newFoods: FoodItem[]) => {
    setFoods(newFoods);
  }, []);

  return {
    // State
    foods,
    currentDay,
    dayNumber,
    weekNumber,
    isLoading,
    error,
    hasUnsavedChanges,

    // Actions
    setFoods: updateFoods,
    saveFoods,
    loadCurrentDayFoods,
    refreshDayInfo,
    clearError,
  };
};