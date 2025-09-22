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
import { Day, AnalysisResult } from '../models/types';
import { MealAnalysisCard } from '../components/MealAnalysisCard';
import { ComparisonCard } from '../components/ComparisonCard';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { MEAL_TYPES } from '../utils/validation';

interface DayDetailScreenProps {
  day: Day;
  onBackPress: () => void;
  onComparisonPress?: () => void;
}

export const DayDetailScreen: React.FC<DayDetailScreenProps> = ({
  day,
  onBackPress,
  onComparisonPress,
}) => {
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

  useEffect(() => {
    loadDayData();
  }, [day]);

  const loadDayData = async () => {
    try {
      await loadAnalysisForDay(day.id);
      if (currentView === 'comparison') {
        await loadComparisonForDay(day.id);
      }
    } catch (err) {
      console.error('Failed to load day data:', err);
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

  const renderAnalysisView = () => (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {hasAnalysisData() ? (
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
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No analysis data for this day</Text>
          <Text style={styles.noDataSubtext}>
            Food analysis will appear here once foods are analyzed
          </Text>
        </View>
      )}
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
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
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
});