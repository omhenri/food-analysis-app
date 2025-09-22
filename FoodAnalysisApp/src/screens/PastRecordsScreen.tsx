import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Day, Week, AnalysisResult } from '../models/types';
import { DaySelector } from '../components/DaySelector';
import { MealAnalysisCard } from '../components/MealAnalysisCard';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { DatabaseService } from '../services/DatabaseService';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { MEAL_TYPES } from '../utils/validation';

interface PastRecordsScreenProps {
  onWeeklyReportPress?: (weekId: number) => void;
}

export const PastRecordsScreen: React.FC<PastRecordsScreenProps> = ({
  onWeeklyReportPress,
}) => {
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set(['breakfast']));

  const {
    analysisResults,
    loadAnalysisForDay,
    error: analysisError,
  } = useAnalysisData();

  const databaseService = DatabaseService.getInstance();

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedDay) {
      loadDayAnalysis(selectedDay.id);
    }
  }, [selectedDay]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('PastRecordsScreen focused - refreshing data');
      initializeData();
    }, [])
  );

  const initializeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize database
      await databaseService.initializeDatabase();

      // Get current week and days
      const week = await databaseService.getCurrentWeek();
      const weekDays = await databaseService.getDaysForWeek(week.id);

      setCurrentWeek(week);
      setDays(weekDays);

      // Select the most recent day with data, or current day
      if (weekDays.length > 0) {
        const currentDay = weekDays.find(day => {
          const today = new Date().toISOString().split('T')[0];
          return day.date === today;
        }) || weekDays[weekDays.length - 1];

        setSelectedDay(currentDay);
        // Force reload analysis for the selected day
        await loadDayAnalysis(currentDay.id);
      }
    } catch (err) {
      console.error('Failed to initialize past records:', err);
      setError(`Failed to load records: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDayAnalysis = async (dayId: number) => {
    try {
      console.log('Loading analysis for day ID:', dayId);
      await loadAnalysisForDay(dayId);
      console.log('Analysis loaded successfully for day:', dayId);
    } catch (err) {
      console.error('Failed to load day analysis:', err);
      // Don't show error for missing analysis data
    }
  };

  const handleDaySelect = (day: Day) => {
    setSelectedDay(day);
  };

  const handleWeeklyReportPress = () => {
    if (currentWeek && onWeeklyReportPress) {
      onWeeklyReportPress(currentWeek.id);
    } else {
      Alert.alert(
        'Weekly Report',
        'Weekly report feature will be available when you complete 7 days of food tracking.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleMealExpansion = (mealType: string) => {
    const newExpanded = new Set(expandedMeals);
    if (newExpanded.has(mealType)) {
      newExpanded.delete(mealType);
    } else {
      newExpanded.add(mealType);
    }
    setExpandedMeals(newExpanded);
  };

  const getAnalysisForMealType = (mealType: string): AnalysisResult[] => {
    return analysisResults.filter(result => {
      // Check if any chemical substances match the meal type
      return result.chemicalSubstances.some(substance => 
        substance.mealType === mealType
      );
    });
  };

  const hasMealTypeData = (mealType: string): boolean => {
    return getAnalysisForMealType(mealType).length > 0;
  };

  const getSelectedDayInfo = (): string => {
    if (!selectedDay) return '';
    
    const date = new Date(selectedDay.date);
    const isToday = selectedDay.date === new Date().toISOString().split('T')[0];
    
    if (isToday) {
      return `Today • Day ${selectedDay.dayNumber}`;
    }
    
    return `${date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric' 
    })} • Day ${selectedDay.dayNumber}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Past Records</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => {
              console.log('Manual refresh triggered');
              initializeData();
            }}
          >
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Day Selector */}
        <DaySelector
          currentWeek={currentWeek}
          days={days}
          selectedDayId={selectedDay?.id || null}
          onDaySelect={handleDaySelect}
          onWeeklyReportPress={handleWeeklyReportPress}
          showWeeklyReport={days.length >= 7}
        />

        {/* Selected Day Info */}
        {selectedDay && (
          <View style={styles.dayInfoContainer}>
            <Text style={styles.dayInfoText}>{getSelectedDayInfo()}</Text>
          </View>
        )}

        {/* Analysis Results */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedDay && analysisResults.length > 0 ? (
            MEAL_TYPES.map(mealType => {
              if (!hasMealTypeData(mealType)) {
                return null;
              }

              return (
                <MealAnalysisCard
                  key={mealType}
                  mealType={mealType}
                  analysisResults={getAnalysisForMealType(mealType)}
                  isExpanded={expandedMeals.has(mealType)}
                  onToggle={() => toggleMealExpansion(mealType)}
                />
              );
            })
          ) : selectedDay ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No food records for this day</Text>
              <Text style={styles.noDataSubtext}>
                Food entries and analysis will appear here once you start tracking
              </Text>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No days recorded yet</Text>
              <Text style={styles.noDataSubtext}>
                Start tracking your food to see your history here
              </Text>
            </View>
          )}

          {analysisError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Failed to load analysis data for this day
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: FontSizes.xxlarge,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
    textTransform: 'capitalize',
    flex: 1,
  },
  refreshButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.medium,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  refreshButtonText: {
    fontSize: 20,
    color: Colors.white,
  },
  dayInfoContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayInfoText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSizes.large,
    color: Colors.white,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: FontSizes.medium,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  noDataText: {
    fontSize: FontSizes.large,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  noDataSubtext: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
});