import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors } from './src/constants/theme';
import { AppInitializationService, InitializationResult } from './src/services/AppInitializationService';
import { PerformanceMonitoringService } from './src/services/PerformanceMonitoringService';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineIndicator } from './src/components/OfflineIndicator';
import { LoadingSpinner } from './src/components/LoadingSpinner';
import { FirstTimeUserExperience } from './src/components/FirstTimeUserExperience';
import { ErrorHandler } from './src/utils/errorHandler';
import { PerformanceOptimizer } from './src/utils/performanceOptimization';
import { store, persistor } from './src/store';
import { initializeApp } from './src/store/slices/appSlice';

function AppContent(): React.JSX.Element {
  const [initializationResult, setInitializationResult] = useState<InitializationResult | null>(null);
  const [showFirstTimeExperience, setShowFirstTimeExperience] = useState(false);

  useEffect(() => {
    // Initialize app services with performance monitoring
    const initializeAppServices = async () => {
      const performanceMonitor = PerformanceMonitoringService.getInstance();
      
      try {
        // Start performance monitoring in development
        if (__DEV__) {
          performanceMonitor.startMonitoring();
          performanceMonitor.enableReactDevToolsProfiler();
          performanceMonitor.scheduleCleanup();
        }

        const result = await performanceMonitor.measureAsyncOperation(
          'App Initialization',
          'user_interaction',
          async () => {
            const initService = AppInitializationService.getInstance();
            return await initService.initializeApp();
          }
        );
        
        setInitializationResult(result);
        
        // Show first-time user experience if needed
        if (result.isFirstTime && result.servicesReady) {
          setShowFirstTimeExperience(true);
        }
        
        // Initialize Redux state
        store.dispatch(initializeApp());

        console.log('App initialized successfully', result);
        
        // Log performance report in development
        if (__DEV__) {
          setTimeout(() => {
            performanceMonitor.logPerformanceReport();
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        ErrorHandler.handleError(error as Error);
        
        // Set a fallback initialization result
        setInitializationResult({
          isFirstTime: false,
          databaseInitialized: false,
          servicesReady: false,
          error: error as Error,
        });
      }
    };

    initializeAppServices();

    // Cleanup on unmount
    return () => {
      PerformanceOptimizer.cleanup();
    };
  }, []);

  const handleFirstTimeExperienceComplete = () => {
    setShowFirstTimeExperience(false);
  };

  // Show loading spinner while initializing
  if (!initializationResult) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primary }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.primary}
        />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.primary}
        />
        <OfflineIndicator />
        <AppNavigator />
        
        {/* First-time user experience */}
        <FirstTimeUserExperience
          visible={showFirstTimeExperience}
          onComplete={handleFirstTimeExperienceComplete}
        />
      </View>
    </ErrorBoundary>
  );
}

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <PersistGate 
        loading={<LoadingSpinner />} 
        persistor={persistor}
      >
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

export default App;
