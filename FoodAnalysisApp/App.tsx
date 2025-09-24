import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors } from './src/constants/theme';
import { AnalysisServiceManager } from './src/services/AnalysisServiceManager';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize services
    const initializeApp = async () => {
      try {
        // Configure analysis service
        const analysisService = AnalysisServiceManager.getInstance();

        // Configure backend URL
        let backendUrl = 'http://localhost:8000'; // Default for Android emulator/web

        // For iOS simulator, localhost doesn't work, use your machine's IP
        const isIOSSimulator = __DEV__ && Platform.OS === 'ios';
        if (isIOSSimulator) {
          // Replace with your computer's IP address (run: ipconfig getifaddr en0 on Mac)
          const computerIP = '192.168.20.10'; // Update this with your IP
          backendUrl = `http://${computerIP}:8000`;
        }

        // Configure backend for analysis service with extended timeout (10 minutes for OpenRouter responses)
        const extendedTimeout = 10 * 60 * 1000; // 10 minutes in milliseconds
        analysisService.configureBackend(backendUrl, extendedTimeout);

        // Default to backend service (food-backend only)
        // For development, you can enable mock service instead:
        // analysisService.enableMockService();
        console.log(`Analysis service configured with backend: ${backendUrl}, timeout: ${extendedTimeout/1000}s`);
        
        // Initialize database
        const { DatabaseService } = await import('./src/services/DatabaseService');
        const databaseService = DatabaseService.getInstance();
        await databaseService.initializeDatabase();

        console.log('App initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primary}
      />
      <AppNavigator />
    </>
  );
}

export default App;
