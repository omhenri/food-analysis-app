import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import foodSlice from './slices/foodSlice';
import analysisSlice from './slices/analysisSlice';
import appSlice from './slices/appSlice';
import { foodAnalysisApi } from './api/foodAnalysisApi';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['food', 'analysis', 'app'], // Only persist these slices
  blacklist: [foodAnalysisApi.reducerPath], // Don't persist API cache
};

// Root reducer
const rootReducer = combineReducers({
  food: foodSlice,
  analysis: analysisSlice,
  app: appSlice,
  [foodAnalysisApi.reducerPath]: foodAnalysisApi.reducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(foodAnalysisApi.middleware),
  devTools: __DEV__,
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export { useAppDispatch, useAppSelector } from './hooks';