import { DatabaseService } from './DatabaseService';
import { FoodItem, FoodEntry, Day } from '../models/types';
import { validateFoodItems } from '../utils/validation';

export class FoodService {
  private static instance: FoodService;
  private databaseService: DatabaseService;

  private constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  public static getInstance(): FoodService {
    if (!FoodService.instance) {
      FoodService.instance = new FoodService();
    }
    return FoodService.instance;
  }

  // Initialize the service
  public async initialize(): Promise<void> {
    await this.databaseService.initializeDatabase();
  }

  // Save multiple food items for the current day
  public async saveFoodItems(foods: FoodItem[]): Promise<number[]> {
    // Validate food items
    const validation = validateFoodItems(foods);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      // Get current day
      const currentDay = await this.databaseService.getCurrentDay();
      
      // Save each food item
      const entryIds: number[] = [];
      for (const food of foods) {
        const entry: FoodEntry = {
          dayId: currentDay.id,
          foodName: food.name.trim(),
          mealType: food.mealType,
          portion: food.portion,
        };
        
        const entryId = await this.databaseService.saveFoodEntry(entry);
        entryIds.push(entryId);
      }

      return entryIds;
    } catch (error) {
      console.error('Failed to save food items:', error);
      throw new Error(`Failed to save food items: ${error}`);
    }
  }

  // Get food entries for the current day
  public async getCurrentDayFoodEntries(): Promise<FoodEntry[]> {
    try {
      const currentDay = await this.databaseService.getCurrentDay();
      return await this.databaseService.getFoodEntriesForDay(currentDay.id);
    } catch (error) {
      console.error('Failed to get current day food entries:', error);
      throw new Error(`Failed to get current day food entries: ${error}`);
    }
  }

  // Get food entries for a specific day
  public async getFoodEntriesForDay(dayId: number): Promise<FoodEntry[]> {
    try {
      return await this.databaseService.getFoodEntriesForDay(dayId);
    } catch (error) {
      console.error('Failed to get food entries for day:', error);
      throw new Error(`Failed to get food entries for day: ${error}`);
    }
  }

  // Get current day information
  public async getCurrentDay(): Promise<Day> {
    try {
      return await this.databaseService.getCurrentDay();
    } catch (error) {
      console.error('Failed to get current day:', error);
      throw new Error(`Failed to get current day: ${error}`);
    }
  }

  // Get day information by ID
  public async getDayById(dayId: number): Promise<Day | null> {
    try {
      const currentWeek = await this.databaseService.getCurrentWeek();
      const days = await this.databaseService.getDaysForWeek(currentWeek.id);
      return days.find(day => day.id === dayId) || null;
    } catch (error) {
      console.error('Failed to get day by ID:', error);
      throw new Error(`Failed to get day by ID: ${error}`);
    }
  }

  // Convert FoodEntry to FoodItem for UI
  public convertEntryToFoodItem(entry: FoodEntry): FoodItem {
    return {
      id: entry.id?.toString() || '',
      name: entry.foodName,
      mealType: entry.mealType,
      portion: entry.portion,
    };
  }

  // Convert multiple FoodEntries to FoodItems
  public convertEntriesToFoodItems(entries: FoodEntry[]): FoodItem[] {
    return entries.map(entry => this.convertEntryToFoodItem(entry));
  }

  // Check if current day has any food entries
  public async hasCurrentDayEntries(): Promise<boolean> {
    try {
      const entries = await this.getCurrentDayFoodEntries();
      return entries.length > 0;
    } catch (error) {
      console.error('Failed to check current day entries:', error);
      return false;
    }
  }

  // Get day tracking information
  public async getDayTrackingInfo(): Promise<{
    currentDay: Day;
    dayNumber: number;
    weekNumber: number;
    hasEntries: boolean;
  }> {
    try {
      const currentDay = await this.getCurrentDay();
      const currentWeek = await this.databaseService.getCurrentWeek();
      const hasEntries = await this.hasCurrentDayEntries();

      return {
        currentDay,
        dayNumber: currentDay.dayNumber,
        weekNumber: currentWeek.weekNumber,
        hasEntries,
      };
    } catch (error) {
      console.error('Failed to get day tracking info:', error);
      throw new Error(`Failed to get day tracking info: ${error}`);
    }
  }

  // Clear all food entries for current day (for testing/reset purposes)
  public async clearCurrentDayEntries(): Promise<void> {
    try {
      const currentDay = await this.getCurrentDay();
      // This would require a delete method in DatabaseService
      // For now, we'll just log the action
      console.log(`Would clear entries for day ${currentDay.id}`);
    } catch (error) {
      console.error('Failed to clear current day entries:', error);
      throw new Error(`Failed to clear current day entries: ${error}`);
    }
  }
}