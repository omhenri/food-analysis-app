import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet } from 'react-native';

// Screens
import { ConnectedFoodInputScreen } from '../screens/ConnectedFoodInputScreen';
import { ConnectedAnalysisScreen } from '../screens/ConnectedAnalysisScreen';
import { ConnectedComparisonScreen } from '../screens/ConnectedComparisonScreen';
// import { PastRecordsScreen } from '../screens/PastRecordsScreen';
// import { WeeklyReportScreen } from '../screens/WeeklyReportScreen';

// Constants
import { Colors, FontSizes } from '../constants/theme';

// Navigation types
export type RootTabParamList = {
  InputTab: undefined;
  RecordsTab: undefined;
};

export type InputStackParamList = {
  FoodInput: undefined;
  Analysis: { foods: any[] };
  Comparison: { analysisResults: any[] };
};

export type RecordsStackParamList = {
  PastRecords: undefined;
  WeeklyReport: { weekId: number };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const InputStack = createStackNavigator<InputStackParamList>();
const RecordsStack = createStackNavigator<RecordsStackParamList>();

// Custom Tab Bar Component
const CustomTabBar: React.FC<any> = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBar}>
      {/* Left Tab - Input */}
      <View style={styles.tabSection}>
        <View 
          style={[
            styles.tabButton,
            state.index === 0 && styles.tabButtonActive
          ]}
        >
          <Text style={styles.tabIcon}>
            {state.index === 0 ? '🍽️' : '🍽️'}
          </Text>
        </View>
      </View>

      {/* Center Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>FA</Text>
        </View>
      </View>

      {/* Right Tab - Records */}
      <View style={styles.tabSection}>
        <View 
          style={[
            styles.tabButton,
            state.index === 1 && styles.tabButtonActive
          ]}
        >
          <Text style={styles.tabIcon}>
            {state.index === 1 ? '📊' : '📊'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Input Stack Navigator
const InputStackNavigator: React.FC = () => {
  return (
    <InputStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: Colors.background }
      }}
    >
      <InputStack.Screen 
        name="FoodInput" 
        component={ConnectedFoodInputScreen} 
      />
      <InputStack.Screen 
        name="Analysis" 
        component={ConnectedAnalysisScreen}
      />
      <InputStack.Screen 
        name="Comparison" 
        component={ConnectedComparisonScreen}
      />
    </InputStack.Navigator>
  );
};

// Records Stack Navigator (Placeholder)
const RecordsStackNavigator: React.FC = () => {
  const PlaceholderScreen = () => (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderText}>Past Records</Text>
      <Text style={styles.placeholderSubtext}>Coming soon...</Text>
    </View>
  );

  return (
    <RecordsStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: Colors.background }
      }}
    >
      <RecordsStack.Screen 
        name="PastRecords" 
        component={PlaceholderScreen} 
      />
    </RecordsStack.Navigator>
  );
};

// Main App Navigator
export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen 
          name="InputTab" 
          component={InputStackNavigator}
          options={{
            tabBarLabel: 'Input',
          }}
        />
        <Tab.Screen 
          name="RecordsTab" 
          component={RecordsStackNavigator}
          options={{
            tabBarLabel: 'Records',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 75,
    backgroundColor: Colors.white,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
  },
  tabSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabIcon: {
    fontSize: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 63,
    height: 40,
    backgroundColor: Colors.inactive,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: Colors.white,
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  placeholderText: {
    fontSize: FontSizes.xlarge,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: FontSizes.medium,
    color: Colors.white,
    opacity: 0.7,
  },
});