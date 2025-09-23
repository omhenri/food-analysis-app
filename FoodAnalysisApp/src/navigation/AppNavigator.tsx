import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { FoodInputTabIcon, HistoricalTabIcon, LogoIcon } from '../components/TabIcon';

// Screens
import { ConnectedFoodInputScreen } from '../screens/ConnectedFoodInputScreen';
import { ConnectedAnalysisScreen } from '../screens/ConnectedAnalysisScreen';
import { ConnectedComparisonScreen } from '../screens/ConnectedComparisonScreen';
import { PastRecordsScreen } from '../screens/PastRecordsScreen';
import { DayDetailScreen } from '../screens/DayDetailScreen';
import { WeeklyReportScreen } from '../screens/WeeklyReportScreen';
import { DebugScreen } from '../screens/DebugScreen';

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
  DayDetail: { day: any };
  WeeklyReport: { weekId: number };
  Debug: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const InputStack = createStackNavigator<InputStackParamList>();
const RecordsStack = createStackNavigator<RecordsStackParamList>();

// Custom Tab Bar Component
const CustomTabBar: React.FC<any> = ({ state, descriptors, navigation }) => {
  const handleTabPress = (index: number) => {
    const route = state.routes[index];
    const isFocused = state.index === index;

    if (!isFocused) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={styles.tabBar}>
      {/* Left Tab - Input */}
      <TouchableOpacity
        style={styles.tabSection}
        onPress={() => handleTabPress(0)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.tabButton,
            state.index === 0 && styles.tabButtonActive
          ]}
        >
          <FoodInputTabIcon
            color={state.index === 0 ? Colors.white : Colors.inactive}
          />
        </View>
      </TouchableOpacity>

      {/* Center Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <LogoIcon color={Colors.white} />
        </View>
      </View>

      {/* Right Tab - Records */}
      <TouchableOpacity
        style={styles.tabSection}
        onPress={() => handleTabPress(1)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.tabButton,
            state.index === 1 && styles.tabButtonActive
          ]}
        >
          <HistoricalTabIcon
            color={state.index === 1 ? Colors.white : Colors.inactive}
          />
        </View>
      </TouchableOpacity>
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

// Records Stack Navigator
const RecordsStackNavigator: React.FC = () => {
  return (
    <RecordsStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: Colors.background }
      }}
    >
      <RecordsStack.Screen
        name="PastRecords"
        component={PastRecordsScreen}
      />
      <RecordsStack.Screen
        name="DayDetail"
        component={DayDetailScreen}
      />
      <RecordsStack.Screen
        name="WeeklyReport"
        component={WeeklyReportScreen}
      />
      <RecordsStack.Screen
        name="Debug"
        component={DebugScreen}
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
    paddingVertical: 10,
  },
  tabButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
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