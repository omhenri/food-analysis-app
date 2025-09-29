import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FoodItem, FoodEntry, Day } from '../../models/types';
import { FoodService } from '../../services/FoodService';

// Async thunks
export const saveFoodItems = createAsyncThunk(
  'food/saveFoodItems',
  async (foods: FoodItem[], { rejectWithValue }) => {
    try {
      const foodService = FoodService.getInstance();
      const entryIds = await foodService.saveFoodItems(foods);
      return { foods, entryIds };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save food items');
    }
  }
);

export const loadCurrentDayFoodEntries = createAsyncThunk(
  'food/loadCurrentDayFoodEntries',
  async (_, { rejectWithValue }) => {
    try {
      const foodService = FoodService.getInstance();
      const entries = await foodService.getCurrentDayFoodEntries();
      const foods = foodService.convertEntriesToFoodItems(entries);
      return foods;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load food entries');
    }
  }
);

export const loadFoodEntriesForDay = createAsyncThunk(
  'food/loadFoodEntriesForDay',
  async (dayId: number, { rejectWithValue }) => {
    try {
      const foodService = FoodService.getInstance();
      const entries = await foodService.getFoodEntriesForDay(dayId);
      const foods = foodService.convertEntriesToFoodItems(entries);
      return { dayId, foods };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load food entries for day');
    }
  }
);

export const loadCurrentDay = createAsyncThunk(
  'food/loadCurrentDay',
  async (_, { rejectWithValue }) => {
    try {
      const foodService = FoodService.getInstance();
      const currentDay = await foodService.getCurrentDay();
      const trackingInfo = await foodService.getDayTrackingInfo();
      return { currentDay, trackingInfo };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load current day');
    }
  }
);

// State interface
interface FoodState {
  // Current food items being edited
  currentFoods: FoodItem[];
  
  // Saved food entries by day
  foodEntriesByDay: { [dayId: number]: FoodItem[] };
  
  // Current day information
  currentDay: Day | null;
  dayTrackingInfo: {
    dayNumber: number;
    weekNumber: number;
    hasEntries: boolean;
  } | null;
  
  // Loading states
  loading: {
    saving: boolean;
    loading: boolean;
    loadingDay: boolean;
  };
  
  // Error states
  error: string | null;
  
  // UI state
  isDirty: boolean; // Has unsaved changes
}

// Initial state
const initialState: FoodState = {
  currentFoods: [],
  foodEntriesByDay: {},
  currentDay: null,
  dayTrackingInfo: null,
  loading: {
    saving: false,
    loading: false,
    loadingDay: false,
  },
  error: null,
  isDirty: false,
};

// Food slice
const foodSlice = createSlice({
  name: 'food',
  initialState,
  reducers: {
    // Add a new food item to current foods
    addFoodItem: (state, action: PayloadAction<FoodItem>) => {
      state.currentFoods.push(action.payload);
      state.isDirty = true;
    },
    
    // Remove a food item from current foods
    removeFoodItem: (state, action: PayloadAction<number>) => {
      state.currentFoods.splice(action.payload, 1);
      state.isDirty = true;
    },
    
    // Update a food item in current foods
    updateFoodItem: (state, action: PayloadAction<{ index: number; food: FoodItem }>) => {
      const { index, food } = action.payload;
      if (index >= 0 && index < state.currentFoods.length) {
        state.currentFoods[index] = food;
        state.isDirty = true;
      }
    },
    
    // Clear current foods
    clearCurrentFoods: (state) => {
      state.currentFoods = [];
      state.isDirty = false;
    },
    
    // Set current foods (for editing existing entries)
    setCurrentFoods: (state, action: PayloadAction<FoodItem[]>) => {
      state.currentFoods = action.payload;
      state.isDirty = false;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Reset dirty state
    resetDirtyState: (state) => {
      state.isDirty = false;
    },
  },
  extraReducers: (builder) => {
    // Save food items
    builder
      .addCase(saveFoodItems.pending, (state) => {
        state.loading.saving = true;
        state.error = null;
      })
      .addCase(saveFoodItems.fulfilled, (state, action) => {
        state.loading.saving = false;
        state.isDirty = false;
        
        // Update food entries for current day
        if (state.currentDay) {
          state.foodEntriesByDay[state.currentDay.id] = action.payload.foods;
        }
      })
      .addCase(saveFoodItems.rejected, (state, action) => {
        state.loading.saving = false;
        state.error = action.payload as string;
      });
    
    // Load current day food entries
    builder
      .addCase(loadCurrentDayFoodEntries.pending, (state) => {
        state.loading.loading = true;
        state.error = null;
      })
      .addCase(loadCurrentDayFoodEntries.fulfilled, (state, action) => {
        state.loading.loading = false;
        state.currentFoods = action.payload;
        state.isDirty = false;
        
        // Update food entries for current day
        if (state.currentDay) {
          state.foodEntriesByDay[state.currentDay.id] = action.payload;
        }
      })
      .addCase(loadCurrentDayFoodEntries.rejected, (state, action) => {
        state.loading.loading = false;
        state.error = action.payload as string;
      });
    
    // Load food entries for specific day
    builder
      .addCase(loadFoodEntriesForDay.pending, (state) => {
        state.loading.loading = true;
        state.error = null;
      })
      .addCase(loadFoodEntriesForDay.fulfilled, (state, action) => {
        state.loading.loading = false;
        const { dayId, foods } = action.payload;
        state.foodEntriesByDay[dayId] = foods;
      })
      .addCase(loadFoodEntriesForDay.rejected, (state, action) => {
        state.loading.loading = false;
        state.error = action.payload as string;
      });
    
    // Load current day
    builder
      .addCase(loadCurrentDay.pending, (state) => {
        state.loading.loadingDay = true;
        state.error = null;
      })
      .addCase(loadCurrentDay.fulfilled, (state, action) => {
        state.loading.loadingDay = false;
        state.currentDay = action.payload.currentDay;
        state.dayTrackingInfo = action.payload.trackingInfo;
      })
      .addCase(loadCurrentDay.rejected, (state, action) => {
        state.loading.loadingDay = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  addFoodItem,
  removeFoodItem,
  updateFoodItem,
  clearCurrentFoods,
  setCurrentFoods,
  clearError,
  resetDirtyState,
} = foodSlice.actions;

// Export reducer
export default foodSlice.reducer;

// Selectors
export const selectCurrentFoods = (state: { food: FoodState }) => state.food.currentFoods;
export const selectFoodEntriesForDay = (dayId: number) => (state: { food: FoodState }) => 
  state.food.foodEntriesByDay[dayId] || [];
export const selectCurrentDay = (state: { food: FoodState }) => state.food.currentDay;
export const selectDayTrackingInfo = (state: { food: FoodState }) => state.food.dayTrackingInfo;
export const selectFoodLoading = (state: { food: FoodState }) => state.food.loading;
export const selectFoodError = (state: { food: FoodState }) => state.food.error;
export const selectIsDirty = (state: { food: FoodState }) => state.food.isDirty;