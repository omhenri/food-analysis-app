import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../constants/theme';
import { AnalysisServiceManager } from '../services/AnalysisServiceManager';
import { BackendApiService } from '../services/BackendApiService';

export const DebugScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => `${prev}\n[${timestamp}] ${message}`);
  };

  const testBackendConnection = async () => {
    setIsLoading(true);
    setTestResults('');
    addLog('🔄 Starting backend connection test...');

    try {
      const backendService = BackendApiService.getInstance();
      
      // Test 1: Health check
      addLog('📡 Testing health endpoint...');
      const healthCheck = await backendService.testConnection();
      addLog(`Health check result: ${healthCheck ? '✅ Success' : '❌ Failed'}`);

      // Test 2: Analysis service manager configuration
      const analysisManager = AnalysisServiceManager.getInstance();
      addLog('⚙️ Checking service configuration...');
      
      // Test 3: Simple food analysis
      addLog('🍎 Testing food analysis...');
      const testFoods = [
        {
          id: 'test-1',
          name: 'Apple',
          mealType: 'snack' as const,
          portion: '1 medium',
        }
      ];

      const results = await analysisManager.analyzeFoods(testFoods);
      addLog(`Analysis result: ${results.length} items analyzed`);
      addLog(`First result: ${JSON.stringify(results[0], null, 2)}`);

    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
      console.error('Debug test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectBackendCall = async () => {
    setIsLoading(true);
    addLog('\n🔄 Testing direct backend call...');

    try {
      const response = await fetch('http://localhost:8000/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      addLog(`Direct call status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        addLog(`Direct call response: ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        addLog(`Direct call error: ${errorText}`);
      }
    } catch (error) {
      addLog(`❌ Direct call failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToMockService = () => {
    const analysisManager = AnalysisServiceManager.getInstance();
    analysisManager.enableMockService();
    addLog('🔄 Switched to mock service');
    Alert.alert('Service Changed', 'Switched to mock service for testing');
  };

  const switchToBackendService = () => {
    const analysisManager = AnalysisServiceManager.getInstance();
    analysisManager.enableBackendService('http://localhost:8000/api');
    addLog('🔄 Switched to backend service');
    Alert.alert('Service Changed', 'Switched to backend service');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backend Debug Screen</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testBackendConnection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test Backend Connection'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testDirectBackendCall}
          disabled={isLoading}
        >
          <Text style={styles.buttonTextSecondary}>Test Direct Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.warningButton]}
          onPress={switchToMockService}
        >
          <Text style={styles.buttonText}>Use Mock Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.successButton]}
          onPress={switchToBackendService}
        >
          <Text style={styles.buttonText}>Use Backend Service</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logContainer}>
        <Text style={styles.logText}>{testResults || 'No test results yet...'}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xlarge,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    marginTop: 40,
  },
  buttonContainer: {
    marginBottom: Spacing.lg,
  },
  button: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.white,
  },
  warningButton: {
    backgroundColor: Colors.warning,
  },
  successButton: {
    backgroundColor: Colors.success,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: Colors.white,
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.sm,
  },
  logText: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});