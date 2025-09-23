import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors } from './src/constants/theme';
import { AnalysisServiceManager } from './src/services/AnalysisServiceManager';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize services
    const initializeApp = async () => {
      try {
        // Configure analysis service (using backend for development)
        const analysisService = AnalysisServiceManager.getInstance();
        analysisService.enableBackendService('http://localhost:8000/api');
        
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
