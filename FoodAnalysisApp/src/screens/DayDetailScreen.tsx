import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Day, AnalysisResult } from '../models/types';
import { MealAnalysisCard } from '../components/MealAnalysisCard';
import { ComparisonCard } from '../components/ComparisonCard';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { MEAL_TYPES } from '../utils/validation';

type RecordsStackParamList = {
  PastRecords: undefined;
  DayDetail: { day: Day };
  WeeklyReport: { weekId: number };
};

type DayDetailScreenRouteProp = RouteProp<RecordsStackParamList, 'DayDetail'>;
type DayDetailScreenNavigationProp = StackNavigationProp<RecordsStackParamList, 'DayDetail'>;

export const DayDetailScreen: React.FC = () => {
  const navigation = useNavigation<DayDetailScreenNavigationProp>();
  const route = useRoute<DayDetailScreenRouteProp>();
  const { day } = route.params;

  const [currentView, setCurrentView] = useState<'analysis' | 'comparison'>('analysis');
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set(['breakfast']));

  const {
    analysisResults,
    comparisonData,
    isLoadingComparison,
    loadAnalysisForDay,
    loadComparisonForDay,
    error,
    hasAnalysisData,
    hasComparisonData,
  } = useAnalysisData();

  const [foodEntries, setFoodEntries] = useState<any[]>([]);
  const [isLoadingFoodEntries, setIsLoadingFoodEntries] = useState(false);

  useEffect(() => {
    loadDayData();
  }, [day]);

  const loadDayData = async () => {
    try {
      setIsLoadingFoodEntries(true);
      
      // Load food entries
      const { DatabaseService } = await import('../services/DatabaseService');
      const databaseService = DatabaseService.getInstance();
      const entries = await databaseService.getFoodEntriesForDay(day.id);
      setFoodEntries(entries);
      
      // Load analysis data
      await loadAnalysisForDay(day.id);
      if (currentView === 'comparison') {
        await loadComparisonForDay(day.id);
      }
    } catch (err) {
      console.error('Failed to load day data:', err);
    } finally {
      setIsLoadingFoodEntries(false);
    }
  };

  const handleViewChange = async (view: 'analysis' | 'comparison') => {
    setCurrentView(view);
    if (view === 'comparison' && !hasComparisonData()) {
      await loadComparisonForDay(day.id);
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
      return result.chemicalSubstances.some(substance => 
        substance.mealType === mealType
      );
    });
  };

  const hasMealTypeData = (mealType: string): boolean => {
    return getAnalysisForMealType(mealType).length > 0;
  };

  const getDayInfo = (): string => {
    const date = new Date(day.date);
    const isToday = day.date === new Date().toISOString().split('T')[0];
    
    if (isToday) {
      return `Today • Day ${day.dayNumber}`;
    }
    
    return `${date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric' 
    })} • Day ${day.dayNumber}`;
  };

  const renderFoodEntriesSection = () => {
    if (isLoadingFoodEntries) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading food entries...</Text>
        </View>
      );
    }

    if (foodEntries.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No food entries for this day</Text>
          <Text style={styles.noDataSubtext}>
            Food entries will appear here once you start tracking
          </Text>
        </View>
      );
    }

    const entriesByMealType = MEAL_TYPES.reduce((acc, mealType) => {
      acc[mealType] = foodEntries.filter(entry => entry.mealType === mealType);
      return acc;
    }, {} as Record<string, any[]>);

    return (
      <View style={styles.foodEntriesSection}>
        <Text style={styles.sectionTitle}>Food Entries</Text>
        {MEAL_TYPES.map(mealType => {
          const entries = entriesByMealType[mealType];
          if (entries.length === 0) return null;

          return (
            <View key={mealType} style={styles.mealSection}>
              <Text style={styles.mealTitle}>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</Text>
              {entries.map((entry, index) => (
                <View key={`${entry.id}-${index}`} style={styles.foodEntryItem}>
                  <Text style={styles.foodEntryName}>{entry.foodName}</Text>
                  <Text style={styles.foodEntryPortion}>Portion: {entry.portion}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  const renderAnalysisView = () => (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Food Entries Section */}
      {renderFoodEntriesSection()}

      {/* Analysis Results Section */}
      {hasAnalysisData() ? (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Analysis Results</Text>
          {MEAL_TYPES.map(mealType => {
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
          })}
        </View>
      ) : foodEntries.length > 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No analysis data available</Text>
          <Text style={styles.noDataSubtext}>
            Food analysis will appear here once foods are analyzed
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );

  const renderComparisonView = () => {
    if (isLoadingComparison) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading comparison...</Text>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {hasComparisonData() ? (
          comparisonData.map((comparison, index) => (
            <ComparisonCard
              key={`${comparison.substance}-${index}`}
              comparisonData={comparison}
            />
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No comparison data available</Text>
            <Text style={styles.noDataSubtext}>
              Comparison data requires analyzed foods
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Day Details</Text>
        </View>

        {/* Day Info */}
        <View style={styles.dayInfoContainer}>
          <Text style={styles.dayInfoText}>{getDayInfo()}</Text>
        </View>

        {/* View Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              currentView === 'analysis' && styles.toggleButtonActive,
            ]}
            onPress={() => handleViewChange('analysis')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                currentView === 'analysis' && styles.toggleButtonTextActive,
              ]}
            >
              Analysis
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toggleButton,
              currentView === 'comparison' && styles.toggleButtonActive,
            ]}
            onPress={() => handleViewChange('comparison')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                currentView === 'comparison' && styles.toggleButtonTextActive,
              ]}
            >
              Comparison
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {currentView === 'analysis' ? renderAnalysisView() : renderComparisonView()}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  backButton: {
    marginRight: Spacing.sm,
  },
  backButtonText: {
    fontSize: FontSizes.medium,
    color: Colors.white,
  },
  title: {
    fontSize: FontSizes.xlarge,
    fontWeight: '600',
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: Colors.buttonSecondary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleButtonText: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  toggleButtonTextActive: {
    color: Colors.white,
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
    backgroundColor: Colors.white,
  },
  loadingText: {
    fontSize: FontSizes.medium,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
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
  errorContainer: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    fontSize: FontSizes.small,
    color: Colors.white,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  foodEntriesSection: {
    marginBottom: Spacing.lg,
  },
  analysisSection: {
    marginTop: Spacing.md,
  },
  mealSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mealTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.sm,
    textTransform: 'capitalize',
  },
  foodEntryItem: {
    backgroundColor: Colors.buttonSecondary,
    borderRadius: BorderRadius.small,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  foodEntryName: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  foodEntryPortion: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
});