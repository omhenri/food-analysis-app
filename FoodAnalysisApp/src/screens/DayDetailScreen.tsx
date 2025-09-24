import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Day, AnalysisResult } from '../models/types';
import { MealAnalysisCard } from '../components/MealAnalysisCard';
import { ComparisonCard } from '../components/ComparisonCard';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { MEAL_TYPES } from '../utils/validation';
import { AnalysisServiceManager } from '../services/AnalysisServiceManager';

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
  
  // State for comparison view features
  const [filterStatus, setFilterStatus] = useState<'all' | 'under' | 'optimal' | 'over'>('all');
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [summaryAnimation] = useState(new Animated.Value(1));

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
  
  const analysisServiceManager = AnalysisServiceManager.getInstance();

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

  // Helper functions for comparison view
  const toggleSummary = () => {
    const toValue = isSummaryExpanded ? 0 : 1;
    
    Animated.timing(summaryAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setIsSummaryExpanded(!isSummaryExpanded);
  };

  const getFilteredComparisonData = () => {
    if (filterStatus === 'all') {
      return comparisonData;
    }
    return comparisonData.filter(item => item.status === filterStatus);
  };

  const getStatusCounts = () => {
    const counts = {
      under: 0,
      optimal: 0,
      over: 0,
      total: comparisonData.length,
    };

    comparisonData.forEach(item => {
      counts[item.status]++;
    });

    return counts;
  };

  const getSummaryText = () => {
    const counts = getStatusCounts();
    const { under, optimal, over, total } = counts;

    if (total === 0) {
      return 'No comparison data available';
    }

    return `${optimal} optimal, ${under} below, ${over} above recommended levels`;
  };

  const getOverdosedSubstances = (): string[] => {
    return comparisonData
      .filter(item => item.status === 'over')
      .map(item => item.substance);
  };

  const handleRecommendationPress = async () => {
    const overdosed = getOverdosedSubstances();
    if (overdosed.length === 0) {
      Alert.alert('No Above-recommended Substances', 'You don\'t have any substances above recommended levels.');
      return;
    }

    try {
      setIsLoadingRecommendations(true);

      // Call neutralization recommendations using AnalysisServiceManager
      const data = await analysisServiceManager.getNeutralizationRecommendations(overdosed);

      // Navigate to the neutralization recommendations screen
      navigation.navigate('WeeklyReport', { weekId: day.weekId }); // Placeholder navigation
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your connection and try again.'
      );
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const renderFilterButtons = () => {
    const counts = getStatusCounts();
    const filters = [
      { key: 'all' as const, label: 'All', count: counts.total },
      { key: 'optimal' as const, label: 'Optimal', count: counts.optimal },
      { key: 'under' as const, label: 'Below', count: counts.under },
      { key: 'over' as const, label: 'Above', count: counts.over },
    ];

    return (
      <View style={styles.filterContainer}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              filterStatus === filter.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus(filter.key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === filter.key && styles.filterButtonTextActive,
              ]}
            >
              {filter.label} ({filter.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
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

      {/* Analysis Results Section */}
      {hasAnalysisData() ? (
        <View style={styles.analysisSection}>
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
      <View style={styles.comparisonViewContainer}>
        {/* Summary - Collapsible */}
        {hasComparisonData() && (
          <View style={styles.summaryContainer}>
            <TouchableOpacity 
              style={styles.summaryHeader}
              onPress={toggleSummary}
              activeOpacity={0.7}
            >
              <Text style={styles.summaryTitle}>Nutritional Analysis Summary</Text>
              <Text style={styles.expandIcon}>
                {isSummaryExpanded ? '−' : '+'}
              </Text>
            </TouchableOpacity>
            
            <Animated.View 
              style={[
                styles.summaryContent,
                {
                  maxHeight: summaryAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 300],
                  }),
                  opacity: summaryAnimation,
                }
              ]}
            >
              <Text style={styles.summaryText}>{getSummaryText()}</Text>
              <Text style={styles.summarySubtext}>
                Compared to recommended daily intake for adults aged 18-29
              </Text>
              <Text style={styles.optimalRangeText}>
                💡 Optimal range is 80-120% of recommended daily intake
              </Text>
            </Animated.View>
          </View>
        )}

        {/* Filter Buttons */}
        {hasComparisonData() && renderFilterButtons()}

        {/* Comparison Results */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {hasComparisonData() ? (
            getFilteredComparisonData().map((comparison, index) => (
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

          {getFilteredComparisonData().length === 0 && hasComparisonData() && (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>
                No substances match the selected filter
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Get Recommendations Button */}
        {hasComparisonData() && getOverdosedSubstances().length > 0 && (
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomInfoText}>
              Need help balancing your nutrients?
            </Text>
            <TouchableOpacity
              style={[
                styles.recommendationButton,
                isLoadingRecommendations && styles.recommendationButtonLoading
              ]}
              onPress={handleRecommendationPress}
              activeOpacity={0.7}
              disabled={isLoadingRecommendations}
            >
              {isLoadingRecommendations ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={[styles.recommendationButtonText, styles.buttonLoadingText]}>
                    Loading...
                  </Text>
                </View>
              ) : (
                <Text style={styles.recommendationButtonText}>
                  Get Recommendations
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{currentView === 'comparison' ? 'Comparison' : 'Analysis Results'}</Text>
          </View>
          <View style={styles.headerSpacer} />
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
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 60,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80, // Fixed width to ensure consistent spacing
  },
  backButtonText: {
    fontSize: FontSizes.medium,
    color: Colors.textPrimary,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.xlarge,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: 80, // Same width as backButton to balance the layout
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
  },
  analysisSection: {
  },
  mealSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.xs,
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
  comparisonViewContainer: {
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: Colors.white,
    marginVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.medium,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  summaryTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  expandIcon: {
    fontSize: FontSizes.xlarge,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
  summaryContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
    overflow: 'hidden',
  },
  summaryText: {
    fontSize: FontSizes.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  summarySubtext: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  optimalRangeText: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    fontStyle: 'italic',
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  filterButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.small,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    marginHorizontal: 2,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.white,
  },
  bottomInfo: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomInfoText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  recommendationButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    minHeight: 44,
    minWidth: 220,
  },
  recommendationButtonLoading: {
    opacity: 0.8,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationButtonText: {
    fontSize: FontSizes.medium,
    color: Colors.white,
    fontWeight: '600',
  },
  buttonLoadingText: {
    marginLeft: 8,
  },
});