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
  loadCurrentDayComparison,
  selectCurrentDayComparison,
  selectAnalysisLoading,
  selectAnalysisError,
  clearError,
} from '../store/slices/analysisSlice';
import {
  selectCurrentDay,
  selectDayTrackingInfo,
} from '../store/slices/foodSlice';
import { ComparisonCard } from '../components/ComparisonCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Colors } from '../constants/theme';
import { ComparisonData, ConsumptionStatus } from '../models/types';

export const ConnectedComparisonScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const comparisonData = useAppSelector(selectCurrentDayComparison);
  const loading = useAppSelector(selectAnalysisLoading);
  const error = useAppSelector(selectAnalysisError);
  const currentDay = useAppSelector(selectCurrentDay);
  const dayTrackingInfo = useAppSelector(selectDayTrackingInfo);
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ConsumptionStatus | 'all'>('all');

  // Load comparison data on mount
  useEffect(() => {
    dispatch(loadCurrentDayComparison());
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
      await dispatch(loadCurrentDayComparison()).unwrap();
    } catch (error) {
      console.error('Failed to refresh comparison:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter comparison data based on status
  const filteredData = filterStatus === 'all' 
    ? comparisonData 
    : comparisonData.filter(item => item.status === filterStatus);

  // Get status counts for filter buttons
  const statusCounts = comparisonData.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<ConsumptionStatus, number>);

  // Calculate overall nutrition score
  const calculateNutritionScore = (): number => {
    if (comparisonData.length === 0) return 0;
    
    const optimalCount = comparisonData.filter(item => item.status === 'optimal').length;
    return Math.round((optimalCount / comparisonData.length) * 100);
  };

  const nutritionScore = calculateNutritionScore();

  // Check if we have any comparison data
  const hasComparisonData = comparisonData.length > 0;

  if (loading.loadingComparison && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading comparison data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Comparison</Text>
        {dayTrackingInfo && (
          <Text style={styles.dayInfo}>
            Day {dayTrackingInfo.dayNumber} • Week {dayTrackingInfo.weekNumber}
          </Text>
        )}
        {hasComparisonData && (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Nutrition Score</Text>
            <Text style={[
              styles.scoreValue,
              { color: nutritionScore >= 80 ? Colors.success : nutritionScore >= 60 ? Colors.warning : Colors.error }
            ]}>
              {nutritionScore}%
            </Text>
          </View>
        )}
      </View>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => dispatch(clearError())} 
        />
      )}

      {hasComparisonData && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === 'all' && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'all' && styles.filterButtonTextActive
              ]}>
                All ({comparisonData.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === 'under' && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus('under')}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'under' && styles.filterButtonTextActive
              ]}>
                Under ({statusCounts.under || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === 'optimal' && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus('optimal')}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'optimal' && styles.filterButtonTextActive
              ]}>
                Optimal ({statusCounts.optimal || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === 'over' && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus('over')}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'over' && styles.filterButtonTextActive
              ]}>
                Over ({statusCounts.over || 0})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
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
        {!hasComparisonData ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Comparison Data</Text>
            <Text style={styles.emptyMessage}>
              Analyze your food items first to see nutritional comparisons here.
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.comparisonContainer}>
            {filteredData.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>
                  No items match the selected filter.
                </Text>
              </View>
            ) : (
              filteredData.map((item, index) => (
                <ComparisonCard
                  key={`${item.substance}-${index}`}
                  data={item}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {hasComparisonData && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.weeklyButton}
            onPress={() => {
              // Navigate to weekly report screen
              console.log('Navigate to weekly report screen');
            }}
          >
            <Text style={styles.weeklyButtonText}>Weekly Report</Text>
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
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  scoreLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.white,
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
  comparisonContainer: {
    padding: 16,
  },
  noResultsContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  bottomActions: {
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  weeklyButton: {
    backgroundColor: Colors.info,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  weeklyButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
});