import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import NetInfo from '@react-native-community/netinfo';
import { Week, Day } from '../../models/types';
import { DatabaseService } from '../../services/DatabaseService';

// Async thunks
export const initializeApp = createAsyncThunk(
  'app/initializeApp',
  async (_, { rejectWithValue }) => {
    try {
      // Initialize database
      const databaseService = DatabaseService.getInstance();
      await databaseService.initializeDatabase();
      
      // Get current week and day
      const currentWeek = await databaseService.getCurrentWeek();
      const currentDay = await databaseService.getCurrentDay();
      
      // Check network status
      const networkState = await NetInfo.fetch();
      
      return {
        currentWeek,
        currentDay,
        isOnline: networkState.isConnected ?? false,
        isInitialized: true,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to initialize app');
    }
  }
);

export const checkNetworkStatus = createAsyncThunk(
  'app/checkNetworkStatus',
  async () => {
    const networkState = await NetInfo.fetch();
    return networkState.isConnected ?? false;
  }
);

export const loadAllWeeks = createAsyncThunk(
  'app/loadAllWeeks',
  async (_, { rejectWithValue }) => {
    try {
      const databaseService = DatabaseService.getInstance();
      const weeks = await databaseService.getAllWeeks();
      return weeks;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load weeks');
    }
  }
);

export const loadDaysForWeek = createAsyncThunk(
  'app/loadDaysForWeek',
  async (weekId: number, { rejectWithValue }) => {
    try {
      const databaseService = DatabaseService.getInstance();
      const days = await databaseService.getDaysForWeek(weekId);
      return { weekId, days };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load days for week');
    }
  }
);

// State interface
interface AppState {
  // App initialization
  isInitialized: boolean;
  isInitializing: boolean;
  
  // Network status
  isOnline: boolean;
  
  // Current week and day
  currentWeek: Week | null;
  currentDay: Day | null;
  
  // All weeks and days data
  weeks: Week[];
  daysByWeek: { [weekId: number]: Day[] };
  
  // UI state
  activeTab: 'input' | 'records';
  activeScreen: string;
  
  // Settings
  settings: {
    useMockAI: boolean;
    enableOfflineMode: boolean;
    autoSave: boolean;
    notifications: boolean;
  };
  
  // Loading states
  loading: {
    initializing: boolean;
    loadingWeeks: boolean;
    loadingDays: boolean;
  };
  
  // Error states
  error: string | null;
  
  // App metadata
  version: string;
  lastSyncTime: number | null;
}

// Initial state
const initialState: AppState = {
  isInitialized: false,
  isInitializing: false,
  isOnline: false,
  currentWeek: null,
  currentDay: null,
  weeks: [],
  daysByWeek: {},
  activeTab: 'input',
  activeScreen: 'FoodInput',
  settings: {
    useMockAI: true, // Default to mock for development
    enableOfflineMode: true,
    autoSave: true,
    notifications: false,
  },
  loading: {
    initializing: false,
    loadingWeeks: false,
    loadingDays: false,
  },
  error: null,
  version: '1.0.0',
  lastSyncTime: null,
};

// App slice
const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // Set active tab
    setActiveTab: (state, action: PayloadAction<'input' | 'records'>) => {
      state.activeTab = action.payload;
    },
    
    // Set active screen
    setActiveScreen: (state, action: PayloadAction<string>) => {
      state.activeScreen = action.payload;
    },
    
    // Update settings
    updateSettings: (state, action: PayloadAction<Partial<AppState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    // Set online status
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Set current day (for navigation)
    setCurrentDay: (state, action: PayloadAction<Day>) => {
      state.currentDay = action.payload;
    },
    
    // Update last sync time
    updateLastSyncTime: (state) => {
      state.lastSyncTime = Date.now();
    },
    
    // Reset app state (for logout/reset)
    resetAppState: (state) => {
      return {
        ...initialState,
        settings: state.settings, // Keep settings
      };
    },
  },
  extraReducers: (builder) => {
    // Initialize app
    builder
      .addCase(initializeApp.pending, (state) => {
        state.loading.initializing = true;
        state.isInitializing = true;
        state.error = null;
      })
      .addCase(initializeApp.fulfilled, (state, action) => {
        state.loading.initializing = false;
        state.isInitializing = false;
        state.isInitialized = action.payload.isInitialized;
        state.currentWeek = action.payload.currentWeek;
        state.currentDay = action.payload.currentDay;
        state.isOnline = action.payload.isOnline;
      })
      .addCase(initializeApp.rejected, (state, action) => {
        state.loading.initializing = false;
        state.isInitializing = false;
        state.error = action.payload as string;
      });
    
    // Check network status
    builder
      .addCase(checkNetworkStatus.fulfilled, (state, action) => {
        state.isOnline = action.payload;
      });
    
    // Load all weeks
    builder
      .addCase(loadAllWeeks.pending, (state) => {
        state.loading.loadingWeeks = true;
        state.error = null;
      })
      .addCase(loadAllWeeks.fulfilled, (state, action) => {
        state.loading.loadingWeeks = false;
        state.weeks = action.payload;
      })
      .addCase(loadAllWeeks.rejected, (state, action) => {
        state.loading.loadingWeeks = false;
        state.error = action.payload as string;
      });
    
    // Load days for week
    builder
      .addCase(loadDaysForWeek.pending, (state) => {
        state.loading.loadingDays = true;
        state.error = null;
      })
      .addCase(loadDaysForWeek.fulfilled, (state, action) => {
        state.loading.loadingDays = false;
        const { weekId, days } = action.payload;
        state.daysByWeek[weekId] = days;
      })
      .addCase(loadDaysForWeek.rejected, (state, action) => {
        state.loading.loadingDays = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setActiveTab,
  setActiveScreen,
  updateSettings,
  setOnlineStatus,
  clearError,
  setCurrentDay,
  updateLastSyncTime,
  resetAppState,
} = appSlice.actions;

// Export reducer
export default appSlice.reducer;

// Selectors
export const selectIsInitialized = (state: { app: AppState }) => state.app.isInitialized;
export const selectIsOnline = (state: { app: AppState }) => state.app.isOnline;
export const selectCurrentWeek = (state: { app: AppState }) => state.app.currentWeek;
export const selectCurrentDay = (state: { app: AppState }) => state.app.currentDay;
export const selectActiveTab = (state: { app: AppState }) => state.app.activeTab;
export const selectActiveScreen = (state: { app: AppState }) => state.app.activeScreen;
export const selectSettings = (state: { app: AppState }) => state.app.settings;
export const selectWeeks = (state: { app: AppState }) => state.app.weeks;
export const selectDaysForWeek = (weekId: number) => (state: { app: AppState }) => 
  state.app.daysByWeek[weekId] || [];
export const selectAppLoading = (state: { app: AppState }) => state.app.loading;
export const selectAppError = (state: { app: AppState }) => state.app.error;