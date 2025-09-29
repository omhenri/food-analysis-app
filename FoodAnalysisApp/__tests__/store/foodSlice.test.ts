import { configureStore } from '@reduxjs/toolkit';
import foodSlice, {
  addFoodItem,
  removeFoodItem,
  updateFoodItem,
  clearCurrentFoods,
  setCurrentFoods,
  saveFoodItems,
  loadCurrentDayFoodEntries,
} from '../../src/store/slices/foodSlice';
import { FoodItem } from '../../src/models/types';

// Mock the FoodService
jest.mock('../../src/services/FoodService', () => ({
  FoodService: {
    getInstance: jest.fn(() => ({
      saveFoodItems: jest.fn(),
      getCurrentDayFoodEntries: jest.fn(),
      convertEntriesToFoodItems: jest.fn(),
      getCurrentDay: jest.fn(),
      getDayTrackingInfo: jest.fn(),
    })),
  },
}));

describe('foodSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        food: foodSlice,
      },
    });
  });

  const mockFoodItem: FoodItem = {
    id: '1',
    name: 'Apple',
    mealType: 'breakfast',
    portion: '1/1',
  };

  describe('synchronous actions', () => {
    it('should add a food item', () => {
      store.dispatch(addFoodItem(mockFoodItem));
      
      const state = store.getState().food;
      expect(state.currentFoods).toHaveLength(1);
      expect(state.currentFoods[0]).toEqual(mockFoodItem);
      expect(state.isDirty).toBe(true);
    });

    it('should remove a food item', () => {
      // Add two items first
      store.dispatch(addFoodItem(mockFoodItem));
      store.dispatch(addFoodItem({ ...mockFoodItem, id: '2', name: 'Banana' }));
      
      // Remove the first item
      store.dispatch(removeFoodItem(0));
      
      const state = store.getState().food;
      expect(state.currentFoods).toHaveLength(1);
      expect(state.currentFoods[0].name).toBe('Banana');
      expect(state.isDirty).toBe(true);
    });

    it('should update a food item', () => {
      store.dispatch(addFoodItem(mockFoodItem));
      
      const updatedFood: FoodItem = {
        ...mockFoodItem,
        name: 'Green Apple',
        mealType: 'lunch',
      };
      
      store.dispatch(updateFoodItem({ index: 0, food: updatedFood }));
      
      const state = store.getState().food;
      expect(state.currentFoods[0]).toEqual(updatedFood);
      expect(state.isDirty).toBe(true);
    });

    it('should not update food item with invalid index', () => {
      store.dispatch(addFoodItem(mockFoodItem));
      
      const updatedFood: FoodItem = {
        ...mockFoodItem,
        name: 'Green Apple',
      };
      
      store.dispatch(updateFoodItem({ index: 5, food: updatedFood }));
      
      const state = store.getState().food;
      expect(state.currentFoods[0]).toEqual(mockFoodItem); // Should remain unchanged
    });

    it('should clear current foods', () => {
      store.dispatch(addFoodItem(mockFoodItem));
      store.dispatch(clearCurrentFoods());
      
      const state = store.getState().food;
      expect(state.currentFoods).toHaveLength(0);
      expect(state.isDirty).toBe(false);
    });

    it('should set current foods', () => {
      const foods: FoodItem[] = [
        mockFoodItem,
        { ...mockFoodItem, id: '2', name: 'Banana' },
      ];
      
      store.dispatch(setCurrentFoods(foods));
      
      const state = store.getState().food;
      expect(state.currentFoods).toEqual(foods);
      expect(state.isDirty).toBe(false);
    });
  });

  describe('async actions', () => {
    it('should handle saveFoodItems pending state', () => {
      const action = { type: saveFoodItems.pending.type };
      const state = foodSlice(undefined, action);
      
      expect(state.loading.saving).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should handle saveFoodItems fulfilled state', () => {
      const foods = [mockFoodItem];
      const entryIds = [1];
      
      const action = {
        type: saveFoodItems.fulfilled.type,
        payload: { foods, entryIds },
      };
      
      const state = foodSlice(undefined, action);
      
      expect(state.loading.saving).toBe(false);
      expect(state.isDirty).toBe(false);
    });

    it('should handle saveFoodItems rejected state', () => {
      const errorMessage = 'Failed to save foods';
      
      const action = {
        type: saveFoodItems.rejected.type,
        payload: errorMessage,
      };
      
      const state = foodSlice(undefined, action);
      
      expect(state.loading.saving).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should handle loadCurrentDayFoodEntries fulfilled state', () => {
      const foods = [mockFoodItem];
      
      const action = {
        type: loadCurrentDayFoodEntries.fulfilled.type,
        payload: foods,
      };
      
      const state = foodSlice(undefined, action);
      
      expect(state.loading.loading).toBe(false);
      expect(state.currentFoods).toEqual(foods);
      expect(state.isDirty).toBe(false);
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().food;
      
      expect(state.currentFoods).toEqual([]);
      expect(state.foodEntriesByDay).toEqual({});
      expect(state.currentDay).toBe(null);
      expect(state.dayTrackingInfo).toBe(null);
      expect(state.loading).toEqual({
        saving: false,
        loading: false,
        loadingDay: false,
      });
      expect(state.error).toBe(null);
      expect(state.isDirty).toBe(false);
    });
  });
});