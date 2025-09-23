import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadCurrentDayAnalysis,
  selectCurrentDayAnalysis,
  selectAnalysisLoading,
  selectAnalysisError,
  clearError,
} from '../store/slices/analysisSlice';
import {
  selectCurrentDay,
  selectDayTrackingInfo,
} from '../store/slices/foodSlice';
import { MealAnalysisCard } from '../components/MealAnalysisCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Colors } from '../constants/theme';
import { AnalysisResult, MealType } from '../models/types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const ConnectedAnalysisScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const analysisResults = useAppSelector(selectCurrentDayAnalysis);
  const loading = useAppSelector(selectAnalysisLoading);
  const error = useAppSelector(selectAnalysisError);
  const currentDay = useAppSelector(selectCurrentDay);
  const dayTrackingInfo = useAppSelector(selectDayTrackingInfo);
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set());

  // Load analysis data on mount
  useEffect(() => {
    dispatch(loadCurrentDayAnalysis());
  }, [dispatch]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(loadCurrentDayAnalysis()).unwrap();
    } catch (error) {
      console.error('Failed to refresh analysis:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Toggle meal expansion
  const toggleMealExpansion = (mealType: MealType) => {
    const newExpanded = new Set(expandedMeals);
    if (newExpanded.has(mealType)) {
      newExpanded.delete(mealType);
    } else {
      newExpanded.add(mealType);
    }
    setExpandedMeals(newExpanded);
  };

  // Group analysis results by meal type
  const groupedResults = MEAL_TYPES.reduce((acc, mealType) => {
    acc[mealType] = analysisResults.filter(result => 
      result.chemicalSubstances.some(substance => substance.mealType === mealType)
    );
    return acc;
  }, {} as Record<MealType, AnalysisResult[]>);

  // Check if we have any analysis data
  const hasAnalysisData = analysisResults.length > 0;

  if (loading.loadingAnalysis && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading analysis results...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analysis Results</Text>
        {dayTrackingInfo && (
          <Text style={styles.dayInfo}>
            Day {dayTrackingInfo.dayNumber} • Week {dayTrackingInfo.weekNumber}
          </Text>
        )}
      </View>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => dispatch(clearError())} 
        />
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {!hasAnalysisData ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Analysis Data</Text>
            <Text style={styles.emptyMessage}>
              Add some food items and analyze them to see results here.
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mealsContainer}>
            {MEAL_TYPES.map((mealType) => {
              const mealResults = groupedResults[mealType];
              const hasMealData = mealResults.length > 0;
              const isExpanded = expandedMeals.has(mealType);

              if (!hasMealData) return null;

              return (
                <View key={mealType} style={styles.mealSection}>
                  <TouchableOpacity
                    style={styles.mealHeader}
                    onPress={() => toggleMealExpansion(mealType)}
                  >
                    <View style={styles.mealHeaderContent}>
                      <Text style={styles.mealTitle}>
                        {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                      </Text>
                      <Text style={styles.mealCount}>
                        {mealResults.length} item{mealResults.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={styles.expandIcon}>
                      {isExpanded ? '−' : '+'}
                    </Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.mealContent}>
                      {mealResults.map((result, index) => (
                        <MealAnalysisCard
                          key={`${result.foodId}-${index}`}
                          analysisResult={result}
                          mealType={mealType}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {hasAnalysisData && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.compareButton}
            onPress={() => {
              // Navigate to comparison screen
              console.log('Navigate to comparison screen');
            }}
          >
            <Text style={styles.compareButtonText}>View Comparison</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  dayInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  refreshButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
  mealsContainer: {
    padding: 16,
  },
  mealSection: {
    marginBottom: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.lightGray,
  },
  mealHeaderContent: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  mealCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  expandIcon: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'center',
  },
  mealContent: {
    padding: 16,
    paddingTop: 0,
  },
  bottomActions: {
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  compareButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  compareButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
});