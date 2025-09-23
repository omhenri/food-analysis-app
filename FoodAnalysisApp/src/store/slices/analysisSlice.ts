import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AnalysisResult, ComparisonData, FoodItem } from '../../models/types';
import { AnalysisDataService } from '../../services/AnalysisDataService';

// Async thunks
export const analyzeAndSaveFoods = createAsyncThunk(
  'analysis/analyzeAndSaveFoods',
  async (foods: FoodItem[], { rejectWithValue }) => {
    try {
      const analysisService = AnalysisDataService.getInstance();
      const results = await analysisService.analyzeAndSaveFoods(foods);
      return results;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to analyze foods');
    }
  }
);

export const loadCurrentDayAnalysis = createAsyncThunk(
  'analysis/loadCurrentDayAnalysis',
  async (_, { rejectWithValue }) => {
    try {
      const analysisService = AnalysisDataService.getInstance();
      const results = await analysisService.getCurrentDayAnalysis();
      return results;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load current day analysis');
    }
  }
);

export const loadAnalysisForDay = createAsyncThunk(
  'analysis/loadAnalysisForDay',
  async (dayId: number, { rejectWithValue }) => {
    try {
      const analysisService = AnalysisDataService.getInstance();
      const results = await analysisService.getAnalysisForDay(dayId);
      return { dayId, results };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load analysis for day');
    }
  }
);

export const loadCurrentDayComparison = createAsyncThunk(
  'analysis/loadCurrentDayComparison',
  async (_, { rejectWithValue }) => {
    try {
      const analysisService = AnalysisDataService.getInstance();
      const comparison = await analysisService.getCurrentDayComparison();
      return comparison;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load current day comparison');
    }
  }
);

export const loadComparisonForDay = createAsyncThunk(
  'analysis/loadComparisonForDay',
  async (dayId: number, { rejectWithValue }) => {
    try {
      const analysisService = AnalysisDataService.getInstance();
      const comparison = await analysisService.getComparisonForDay(dayId);
      return { dayId, comparison };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load comparison for day');
    }
  }
);

export const loadWeeklyAnalysis = createAsyncThunk(
  'analysis/loadWeeklyAnalysis',
  async (weekId: number, { rejectWithValue }) => {
    try {
      const analysisService = AnalysisDataService.getInstance();
      const weeklyData = await analysisService.getWeeklyAnalysis(weekId);
      return { weekId, ...weeklyData };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load weekly analysis');
    }
  }
);

// State interface
interface AnalysisState {
  // Analysis results by day
  analysisByDay: { [dayId: number]: AnalysisResult[] };
  
  // Comparison data by day
  comparisonByDay: { [dayId: number]: ComparisonData[] };
  
  // Weekly analysis data
  weeklyAnalysis: {
    [weekId: number]: {
      totalConsumption: { [substance: string]: number };
      weeklyComparison: ComparisonData[];
      dailyBreakdown: { dayNumber: number; dayId: number; consumption: { [substance: string]: number } }[];
    };
  };
  
  // Current analysis state
  currentDayAnalysis: AnalysisResult[];
  currentDayComparison: ComparisonData[];
  
  // Loading states
  loading: {
    analyzing: boolean;
    loadingAnalysis: boolean;
    loadingComparison: boolean;
    loadingWeekly: boolean;
  };
  
  // Error states
  error: string | null;
  
  // Cache timestamps for data freshness
  lastUpdated: {
    analysis: { [dayId: number]: number };
    comparison: { [dayId: number]: number };
    weekly: { [weekId: number]: number };
  };
}

// Initial state
const initialState: AnalysisState = {
  analysisByDay: {},
  comparisonByDay: {},
  weeklyAnalysis: {},
  currentDayAnalysis: [],
  currentDayComparison: [],
  loading: {
    analyzing: false,
    loadingAnalysis: false,
    loadingComparison: false,
    loadingWeekly: false,
  },
  error: null,
  lastUpdated: {
    analysis: {},
    comparison: {},
    weekly: {},
  },
};

// Analysis slice
const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Clear analysis data for a specific day
    clearAnalysisForDay: (state, action: PayloadAction<number>) => {
      const dayId = action.payload;
      delete state.analysisByDay[dayId];
      delete state.comparisonByDay[dayId];
      delete state.lastUpdated.analysis[dayId];
      delete state.lastUpdated.comparison[dayId];
    },
    
    // Clear all analysis data
    clearAllAnalysis: (state) => {
      state.analysisByDay = {};
      state.comparisonByDay = {};
      state.weeklyAnalysis = {};
      state.currentDayAnalysis = [];
      state.currentDayComparison = [];
      state.lastUpdated = {
        analysis: {},
        comparison: {},
        weekly: {},
      };
    },
    
    // Set current day analysis (for switching between days)
    setCurrentDayAnalysis: (state, action: PayloadAction<{ dayId: number }>) => {
      const { dayId } = action.payload;
      state.currentDayAnalysis = state.analysisByDay[dayId] || [];
      state.currentDayComparison = state.comparisonByDay[dayId] || [];
    },
  },
  extraReducers: (builder) => {
    // Analyze and save foods
    builder
      .addCase(analyzeAndSaveFoods.pending, (state) => {
        state.loading.analyzing = true;
        state.error = null;
      })
      .addCase(analyzeAndSaveFoods.fulfilled, (state, action) => {
        state.loading.analyzing = false;
        state.currentDayAnalysis = action.payload;
        
        // Update analysis by day if we know the current day
        // This would need to be enhanced to get the current day ID
        const now = Date.now();
        state.lastUpdated.analysis[0] = now; // Placeholder - should use actual day ID
      })
      .addCase(analyzeAndSaveFoods.rejected, (state, action) => {
        state.loading.analyzing = false;
        state.error = action.payload as string;
      });
    
    // Load current day analysis
    builder
      .addCase(loadCurrentDayAnalysis.pending, (state) => {
        state.loading.loadingAnalysis = true;
        state.error = null;
      })
      .addCase(loadCurrentDayAnalysis.fulfilled, (state, action) => {
        state.loading.loadingAnalysis = false;
        state.currentDayAnalysis = action.payload;
      })
      .addCase(loadCurrentDayAnalysis.rejected, (state, action) => {
        state.loading.loadingAnalysis = false;
        state.error = action.payload as string;
      });
    
    // Load analysis for specific day
    builder
      .addCase(loadAnalysisForDay.pending, (state) => {
        state.loading.loadingAnalysis = true;
        state.error = null;
      })
      .addCase(loadAnalysisForDay.fulfilled, (state, action) => {
        state.loading.loadingAnalysis = false;
        const { dayId, results } = action.payload;
        state.analysisByDay[dayId] = results;
        state.lastUpdated.analysis[dayId] = Date.now();
      })
      .addCase(loadAnalysisForDay.rejected, (state, action) => {
        state.loading.loadingAnalysis = false;
        state.error = action.payload as string;
      });
    
    // Load current day comparison
    builder
      .addCase(loadCurrentDayComparison.pending, (state) => {
        state.loading.loadingComparison = true;
        state.error = null;
      })
      .addCase(loadCurrentDayComparison.fulfilled, (state, action) => {
        state.loading.loadingComparison = false;
        state.currentDayComparison = action.payload;
      })
      .addCase(loadCurrentDayComparison.rejected, (state, action) => {
        state.loading.loadingComparison = false;
        state.error = action.payload as string;
      });
    
    // Load comparison for specific day
    builder
      .addCase(loadComparisonForDay.pending, (state) => {
        state.loading.loadingComparison = true;
        state.error = null;
      })
      .addCase(loadComparisonForDay.fulfilled, (state, action) => {
        state.loading.loadingComparison = false;
        const { dayId, comparison } = action.payload;
        state.comparisonByDay[dayId] = comparison;
        state.lastUpdated.comparison[dayId] = Date.now();
      })
      .addCase(loadComparisonForDay.rejected, (state, action) => {
        state.loading.loadingComparison = false;
        state.error = action.payload as string;
      });
    
    // Load weekly analysis
    builder
      .addCase(loadWeeklyAnalysis.pending, (state) => {
        state.loading.loadingWeekly = true;
        state.error = null;
      })
      .addCase(loadWeeklyAnalysis.fulfilled, (state, action) => {
        state.loading.loadingWeekly = false;
        const { weekId, totalConsumption, weeklyComparison, dailyBreakdown } = action.payload;
        state.weeklyAnalysis[weekId] = {
          totalConsumption,
          weeklyComparison,
          dailyBreakdown,
        };
        state.lastUpdated.weekly[weekId] = Date.now();
      })
      .addCase(loadWeeklyAnalysis.rejected, (state, action) => {
        state.loading.loadingWeekly = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  clearError,
  clearAnalysisForDay,
  clearAllAnalysis,
  setCurrentDayAnalysis,
} = analysisSlice.actions;

// Export reducer
export default analysisSlice.reducer;

// Selectors
export const selectCurrentDayAnalysis = (state: { analysis: AnalysisState }) => state.analysis.currentDayAnalysis;
export const selectCurrentDayComparison = (state: { analysis: AnalysisState }) => state.analysis.currentDayComparison;
export const selectAnalysisForDay = (dayId: number) => (state: { analysis: AnalysisState }) => 
  state.analysis.analysisByDay[dayId] || [];
export const selectComparisonForDay = (dayId: number) => (state: { analysis: AnalysisState }) => 
  state.analysis.comparisonByDay[dayId] || [];
export const selectWeeklyAnalysis = (weekId: number) => (state: { analysis: AnalysisState }) => 
  state.analysis.weeklyAnalysis[weekId];
export const selectAnalysisLoading = (state: { analysis: AnalysisState }) => state.analysis.loading;
export const selectAnalysisError = (state: { analysis: AnalysisState }) => state.analysis.error;