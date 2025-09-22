import { FoodItem, MealType, PortionSize } from '../models/types';

// Validation constants
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const PORTION_SIZES: PortionSize[] = ['1/1', '1/2', '1/3', '1/4', '1/8'];

// Food item validation
export const validateFoodItem = (food: Partial<FoodItem>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate food name
  if (!food.name || food.name.trim().length === 0) {
    errors.push('Food name is required');
  } else if (food.name.trim().length < 2) {
    errors.push('Food name must be at least 2 characters long');
  } else if (food.name.trim().length > 100) {
    errors.push('Food name must be less than 100 characters');
  }

  // Validate meal type
  if (!food.mealType) {
    errors.push('Meal type is required');
  } else if (!MEAL_TYPES.includes(food.mealType)) {
    errors.push('Invalid meal type');
  }

  // Validate portion size
  if (!food.portion) {
    errors.push('Portion size is required');
  } else if (!PORTION_SIZES.includes(food.portion)) {
    errors.push('Invalid portion size');
  }

  // Validate ID if provided
  if (food.id && food.id.trim().length === 0) {
    errors.push('Food ID cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validate multiple food items
export const validateFoodItems = (foods: FoodItem[]): { isValid: boolean; errors: string[] } => {
  const allErrors: string[] = [];

  if (foods.length === 0) {
    allErrors.push('At least one food item is required');
    return { isValid: false, errors: allErrors };
  }

  foods.forEach((food, index) => {
    const validation = validateFoodItem(food);
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        allErrors.push(`Food item ${index + 1}: ${error}`);
      });
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
};

// Validate day number
export const validateDayNumber = (dayNumber: number): boolean => {
  return Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= 7;
};

// Validate week number
export const validateWeekNumber = (weekNumber: number): boolean => {
  return Number.isInteger(weekNumber) && weekNumber > 0;
};

// Validate date string (YYYY-MM-DD format)
export const validateDateString = (dateString: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

// Sanitize food name input
export const sanitizeFoodName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
};

// Generate unique ID for food items
export const generateFoodId = (): string => {
  return `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};