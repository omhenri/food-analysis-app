import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Day, Week, FoodEntry } from '../models/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { DatabaseService } from '../services/DatabaseService';
import { MultiLineProgressBar, createNutritionComparisonData } from '../components/MultiLineProgressBar';

type RecordsStackParamList = {
  PastRecords: undefined;
  DayDetail: { day: Day };
  WeeklyReport: { weekId: number };
};

type PastRecordsScreenNavigationProp = StackNavigationProp<RecordsStackParamList, 'PastRecords'>;

interface DayWithData extends Day {
  foodCount: number;
  hasAnalysis: boolean;
  nutritionData?: NutritionMetric[];
}

interface NutritionMetric {
  name: string;
  value: number;
  unit: string;
  maleRecommended: number;
  femaleRecommended: number;
  category: 'calories' | 'fat' | 'cholesterol' | 'mineral' | 'vitamin';
}

interface TabItem {
  id: string;
  label: string;
  type: 'previous' | 'day' | 'report' | 'next';
  dayNumber?: number;
}

const { width: screenWidth } = Dimensions.get('window');

// New color palette as per requirements
const RevampedColors = {
  background: '#6FF3E0', // Bright teal background
  cardBackground: '#FFFFFF', // White card background
  selectedTab: '#000000', // Black for selected tab
  inactiveTab: '#6FF3E0', // Teal for inactive tabs
  maleRecommended: '#4A90E2', // Blue for male recommendations
  femaleRecommended: '#E24A90', // Pink for female recommendations
  userActual: '#6FF3E0', // Teal for user actuals
  textPrimary: '#000000', // Black text
  textSecondary: '#666666', // Gray text
  textUnit: '#999999', // Light gray for units
};

export const PastRecordsScreen: React.FC = () => {
  const navigation = useNavigation<PastRecordsScreenNavigationProp>();
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedDayData, setSelectedDayData] = useState<DayWithData | null>(null);
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const databaseService = DatabaseService.getInstance();

  useEffect(() => {
    initializeData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('PastRecordsScreen focused - refreshing data');
      initializeData();
    }, [])
  );

  useEffect(() => {
    if (currentWeek) {
      loadDayData(selectedDay);
    }
  }, [selectedDay, currentWeek]);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize database
      await databaseService.initializeDatabase();

      // Get current week
      const week = await databaseService.getCurrentWeek();
      setCurrentWeek(week);

      // Generate tabs for the current week
      generateTabs(week);

    } catch (err) {
      console.error('Failed to initialize past records:', err);
      setError(`Failed to load records: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTabs = (week: Week) => {
    const newTabs: TabItem[] = [];

    // Previous Week tab
    newTabs.push({
      id: 'previous',
      label: 'Previous Week',
      type: 'previous',
    });

    // Day 1-7 tabs
    for (let i = 1; i <= 7; i++) {
      newTabs.push({
        id: `day${i}`,
        label: `Day${i}`,
        type: 'day',
        dayNumber: i,
      });
    }

    // Week Report tab
    newTabs.push({
      id: 'report',
      label: 'Week Report',
      type: 'report',
    });

    // Next Week tab (only if not on current latest week)
    // For now, always show it - can be conditionally hidden later
    newTabs.push({
      id: 'next',
      label: 'Next Week',
      type: 'next',
    });

    setTabs(newTabs);
  };

  const loadDayData = async (dayNumber: number) => {
    if (!currentWeek) return;

    try {
      // Get the specific day
      const days = await databaseService.getDaysForWeek(currentWeek.id);
      const day = days.find(d => d.dayNumber === dayNumber);

      if (day) {
        // Get food entries and analysis for this day
        const foodEntries = await databaseService.getFoodEntriesForDay(day.id);
        const analysisResults = await databaseService.getAnalysisForDay(day.id);

        // Generate mock nutrition data based on analysis results
        const nutritionData = generateNutritionData(analysisResults);

        const dayWithData: DayWithData = {
          ...day,
          foodCount: foodEntries.length,
          hasAnalysis: analysisResults.length > 0,
          nutritionData,
        };

        setSelectedDayData(dayWithData);
      } else {
        // Create empty day data if day doesn't exist yet
        setSelectedDayData({
          id: 0,
          weekId: currentWeek.id,
          dayNumber,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          foodCount: 0,
          hasAnalysis: false,
          nutritionData: getDefaultNutritionData(),
        });
      }
    } catch (err) {
      console.error('Failed to load day data:', err);
    }
  };

  const generateNutritionData = (analysisResults: any[]): NutritionMetric[] => {
    // Extract nutrition data from analysis results or use defaults
    const baseData = getDefaultNutritionData();
    
    if (analysisResults.length > 0) {
      // Calculate totals from analysis results
      let totalCalories = 0;
      let totalSaturatedFat = 0;
      let totalCholesterol = 0;
      let totalCalcium = 0;

      analysisResults.forEach(result => {
        result.chemicalSubstances?.forEach((substance: any) => {
          switch (substance.name.toLowerCase()) {
            case 'calories':
            case 'energy':
              totalCalories += substance.amount || 0;
              break;
            case 'saturated fat':
              totalSaturatedFat += substance.amount || 0;
              break;
            case 'cholesterol':
              totalCholesterol += substance.amount || 0;
              break;
            case 'calcium':
              totalCalcium += substance.amount || 0;
              break;
          }
        });
      });

      // Update base data with calculated values
      baseData[0].value = totalCalories || 1756; // Default to example value
      baseData[1].value = totalSaturatedFat || 12.5;
      baseData[2].value = totalCholesterol || 185;
      baseData[3].value = totalCalcium || 850;
    }

    return baseData;
  };

  const getDefaultNutritionData = (): NutritionMetric[] => [
    {
      name: 'Calories',
      value: 1756,
      unit: 'cal',
      maleRecommended: 1266,
      femaleRecommended: 1122,
      category: 'calories',
    },
    {
      name: 'Saturated Fat',
      value: 12.5,
      unit: 'g',
      maleRecommended: 20,
      femaleRecommended: 18,
      category: 'fat',
    },
    {
      name: 'Cholesterol',
      value: 185,
      unit: 'mg',
      maleRecommended: 300,
      femaleRecommended: 300,
      category: 'cholesterol',
    },
    {
      name: 'Calcium',
      value: 850,
      unit: 'mg',
      maleRecommended: 1000,
      femaleRecommended: 1000,
      category: 'mineral',
    },
  ];

  const handleTabPress = (tab: TabItem) => {
    switch (tab.type) {
      case 'previous':
        // Navigate to previous week
        console.log('Navigate to previous week');
        break;
      case 'day':
        if (tab.dayNumber) {
          setSelectedDay(tab.dayNumber);
        }
        break;
      case 'report':
        if (currentWeek) {
          navigation.navigate('WeeklyReport', { weekId: currentWeek.id });
        }
        break;
      case 'next':
        // Navigate to next week
        console.log('Navigate to next week');
        break;
    }
  };

  const renderScrollableTabs = () => {
    return (
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {tabs.map((tab) => {
            const isSelected = tab.type === 'day' && tab.dayNumber === selectedDay;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  isSelected && styles.selectedTab,
                ]}
                onPress={() => handleTabPress(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    isSelected && styles.selectedTabText,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderProgressBar = (metric: NutritionMetric) => {
    const progressData = createNutritionComparisonData(
      metric.value,
      metric.maleRecommended,
      metric.femaleRecommended,
      metric.unit
    );

    return (
      <MultiLineProgressBar
        lines={progressData}
        unit={metric.unit}
        showValues={true}
        lineHeight={4}
        spacing={4}
      />
    );
  };

  const renderNutritionCard = (metric: NutritionMetric, index: number) => {
    return (
      <View key={metric.name} style={styles.nutritionCard}>
        <View style={styles.cardContent}>
          <View style={styles.leftSection}>
            <Text style={styles.metricLabel}>{metric.name}</Text>
            {renderProgressBar(metric)}
          </View>
          <View style={styles.rightSection}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricUnit}>{metric.unit}</Text>
          </View>
        </View>
      </View>
    );
  };



  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={RevampedColors.textPrimary} />
          <Text style={styles.loadingText}>Loading nutrition data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={initializeData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Section - Scrollable Tabs */}
      {renderScrollableTabs()}

      {/* Main Data Card Section */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        <View style={styles.dataCardsContainer}>
          {selectedDayData?.nutritionData?.map((metric, index) => 
            renderNutritionCard(metric, index)
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RevampedColors.background,
  },
  // Top Navigation Section
  tabContainer: {
    backgroundColor: RevampedColors.cardBackground,
    paddingTop: 60, // Add extra padding to avoid dynamic island
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabScrollContent: {
    paddingHorizontal: Spacing.md,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedTab: {
    // No background color for selected tab
  },
  tabText: {
    fontSize: FontSizes.small,
    fontWeight: '500',
    color: RevampedColors.inactiveTab, // Theme color for inactive tabs
  },
  selectedTabText: {
    color: RevampedColors.selectedTab, // Dark color for selected tab
    fontWeight: 'bold',
  },
  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: RevampedColors.background,
  },
  dataCardsContainer: {
    padding: Spacing.md,
  },
  // Nutrition Cards
  nutritionCard: {
    backgroundColor: RevampedColors.cardBackground,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    marginRight: Spacing.md,
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  metricLabel: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
    color: RevampedColors.textPrimary,
    marginBottom: Spacing.xs,
  },
  metricValue: {
    fontSize: FontSizes.xxlarge,
    fontWeight: 'bold',
    color: RevampedColors.textPrimary,
  },
  metricUnit: {
    fontSize: FontSizes.small,
    color: RevampedColors.textUnit,
    marginTop: 2,
  },


  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RevampedColors.background,
  },
  loadingText: {
    fontSize: FontSizes.medium,
    color: RevampedColors.textPrimary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RevampedColors.background,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: FontSizes.medium,
    color: RevampedColors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: RevampedColors.cardBackground,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  retryButtonText: {
    fontSize: FontSizes.medium,
    color: RevampedColors.textPrimary,
    fontWeight: '600',
  },
});