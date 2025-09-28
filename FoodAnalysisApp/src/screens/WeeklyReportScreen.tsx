import React, { useState, useEffect, useCallback } from 'react';
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
import { WeeklyReportService, WeeklyReportData } from '../services/WeeklyReportService';
import { ComparisonCard } from '../components/ComparisonCard';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { DatabaseService } from '../services/DatabaseService';
import { AnalysisServiceManager } from '../services/AnalysisServiceManager';
import { ComparisonData } from '../models/types';
import { RecordsStackParamList } from '../navigation/AppNavigator';

type WeeklyReportScreenRouteProp = RouteProp<RecordsStackParamList, 'WeeklyReport'>;
type WeeklyReportScreenNavigationProp = StackNavigationProp<RecordsStackParamList, 'WeeklyReport'>;

export const WeeklyReportScreen: React.FC = () => {
  const navigation = useNavigation<WeeklyReportScreenNavigationProp>();
  const route = useRoute<WeeklyReportScreenRouteProp>();
  const { weekId } = route.params;
  const [weeklyComparisonData, setWeeklyComparisonData] = useState<ComparisonData[]>([]);
  const [isLoadingComparison, setIsLoadingComparison] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'optimal' | 'under' | 'over'>('all');
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  
  // State for collapsible summary section - initially expanded
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [summaryAnimation] = useState(new Animated.Value(1));

  const databaseService = DatabaseService.getInstance();
  const analysisServiceManager = AnalysisServiceManager.getInstance();

  useEffect(() => {
    loadWeeklyComparisonData();
  }, [weekId]);

  const loadWeeklyComparisonData = useCallback(async () => {
    try {
      setIsLoadingComparison(true);

      // Check if weekly comparison data exists in database
      const storedComparison = await databaseService.getWeeklyComparisonForWeek(weekId);
      if (storedComparison) {
        setWeeklyComparisonData(storedComparison);
        return;
      }

      // If not in database, generate from backend
      await generateWeeklyComparisonData();
    } catch (error) {
      console.error('Failed to load weekly comparison data:', error);
      Alert.alert('Error', 'Failed to load weekly comparison data. Please try again.');
    } finally {
      setIsLoadingComparison(false);
    }
  }, [weekId]);

  const generateWeeklyComparisonData = async () => {
    try {
      setIsLoadingComparison(true);

      // Get all nutrients consumed in this week
      const weeklyNutrients = await getWeeklyNutrientsConsumed(weekId);
      console.log('Weekly nutrients found:', weeklyNutrients);
      console.log('Weekly nutrients length:', weeklyNutrients.length);

      // Filter out nutrients with 0 or invalid amounts
      const validNutrients = weeklyNutrients.filter(nutrient =>
        nutrient.total_amount > 0 && nutrient.name && nutrient.name.trim()
      );
      console.log('Valid weekly nutrients:', validNutrients);

      if (validNutrients.length === 0) {
        console.log('No valid weekly nutrients found, showing alert');
        Alert.alert('No Data', 'No nutrient data available for this week.');
        return;
      }

      console.log('Calling weekly recommended intake API with:', validNutrients);
      // Get weekly recommended intake from AI
      const recommendedIntake = await analysisServiceManager.getWeeklyRecommendedIntake(validNutrients);

      // Generate comparison data
      const comparisonData = generateComparisonFromRecommendedIntake(validNutrients, recommendedIntake);

      // Save to database
      await databaseService.saveWeeklyComparisonResult(weekId, comparisonData);

      setWeeklyComparisonData(comparisonData);
    } catch (error) {
      console.error('Failed to generate weekly comparison data:', error);
      Alert.alert('Error', 'Failed to generate weekly comparison data. Please try again.');
    } finally {
      setIsLoadingComparison(false);
    }
  };

  const getWeeklyNutrientsConsumed = async (weekId: number): Promise<Array<{name: string, total_amount: number, unit: string}>> => {
    console.log('Getting weekly nutrients for weekId:', weekId);
    // Get all days in this week
    const days = await databaseService.getDaysForWeek(weekId);
    console.log('Found days in week:', days.length, days);

    const nutrientTotals: {[key: string]: {total_amount: number, unit: string}} = {};

    for (const day of days) {
      console.log('Processing day:', day.id, 'date:', day.date);
      // Get analysis results for this day
      const analysisResults = await databaseService.getAnalysisForDay(day.id);
      console.log('Analysis results for day', day.id, ':', analysisResults.length, 'results');

      for (const result of analysisResults) {
        console.log('Processing result with', result.chemicalSubstances.length, 'substances');
        for (const substance of result.chemicalSubstances) {
          const key = substance.name.toLowerCase();
          console.log('Adding substance:', key, 'amount:', substance.amount);
          if (!nutrientTotals[key]) {
            nutrientTotals[key] = { total_amount: 0, unit: 'grams' };
          }
          nutrientTotals[key].total_amount += substance.amount;
        }
      }
    }

    const result = Object.entries(nutrientTotals).map(([name, data]) => ({
      name,
      total_amount: data.total_amount,
      unit: data.unit
    }));
    console.log('Final weekly nutrients result:', result);
    return result;
  };

  const generateComparisonFromRecommendedIntake = (
    nutrientsConsumed: Array<{name: string, total_amount: number, unit: string}>,
    recommendedIntake: any
  ): ComparisonData[] => {
    const comparisons: ComparisonData[] = [];

    for (const nutrient of nutrientsConsumed) {
      const recommended = recommendedIntake.recommended_intakes[nutrient.name];
      if (recommended !== undefined) {
        const consumed = nutrient.total_amount;
        const percentage = (consumed / recommended) * 100;

        let status: 'optimal' | 'under' | 'over';
        if (percentage >= 90 && percentage <= 110) {
          status = 'optimal';
        } else if (percentage < 90) {
          status = 'under';
        } else {
          status = 'over';
        }

        comparisons.push({
          substance: nutrient.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          consumed: consumed,
          recommended: recommended,
          percentage: percentage,
          status: status,
          unit: nutrient.unit
        });
      }
    }

    return comparisons;
  };

  const onBackPress = () => {
    navigation.goBack();
  };

  const getSummaryText = (): string => {
    const counts = getStatusCounts();
    const { under, optimal, over, total } = counts;

    if (total === 0) {
      return 'No comparison data available';
    }

    return `${optimal} optimal, ${under} below, ${over} above recommended levels`;
  };

  const getStatusCounts = () => {
    const total = weeklyComparisonData.length;
    const optimal = weeklyComparisonData.filter(item => item.status === 'optimal').length;
    const under = weeklyComparisonData.filter(item => item.status === 'under').length;
    const over = weeklyComparisonData.filter(item => item.status === 'over').length;

    return { total, optimal, under, over };
  };

  const getFilteredData = () => {
    if (filterStatus === 'all') return weeklyComparisonData;
    return weeklyComparisonData.filter(item => item.status === filterStatus);
  };

  const hasComparisonData = (): boolean => {
    return weeklyComparisonData.length > 0;
  };

  const toggleSummary = () => {
    const toValue = isSummaryExpanded ? 0 : 1;
    
    Animated.timing(summaryAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setIsSummaryExpanded(!isSummaryExpanded);
  };

  const getOverdosedSubstances = (): string[] => {
    return weeklyComparisonData
      .filter(item => item.status === 'over')
      .map(item => item.substance);
  };

  const handleRecommendationPress = async () => {
    const overdosed = getOverdosedSubstances();
    if (overdosed.length === 0) {
      Alert.alert('No Over-dosed Substances', 'You don\'t have any substances above recommended levels for this week.');
      return;
    }

    try {
      setIsLoadingRecommendations(true);

      // Call neutralization recommendations using AnalysisServiceManager
      const data = await analysisServiceManager.getNeutralizationRecommendations(overdosed);

      // Navigate to the neutralization recommendations screen
      navigation.navigate('NeutralizationRecommendations', { recommendations: data });
    } catch (error) {
      console.error('Error fetching weekly recommendations:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your connection and try again.'
      );
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  if (isLoadingComparison) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Generating weekly comparison...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButtonHeader} onPress={onBackPress}>
            <Text style={styles.backButtonHeaderText}>←</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Weekly Comparison</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

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
                Compared to recommended weekly intake for adults aged 18-29
              </Text>
              <Text style={styles.optimalRangeText}>
                💡 Optimal range is 90-110% of recommended weekly intake
              </Text>
            </Animated.View>
          </View>
        )}

        {/* Filter Buttons */}
        {hasComparisonData() && renderFilterButtons()}

        {/* Comparison Cards */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {hasComparisonData() ? (
            getFilteredData().map((comparison, index) => (
              <ComparisonCard
                key={`${comparison.substance}-${index}`}
                comparisonData={comparison}
              />
            ))
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>
                No nutritional comparison data available for this week.
              </Text>
              <TouchableOpacity
                style={styles.generateButton}
                onPress={generateWeeklyComparisonData}
                disabled={isLoadingComparison}
              >
                <Text style={styles.generateButtonText}>
                  {isLoadingComparison ? 'Generating...' : 'Generate Comparison'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>

        {/* Get Recommendations Button - Outside ScrollView at bottom */}
        {hasComparisonData() && getOverdosedSubstances().length > 0 && (
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomInfoText}>
              Need help balancing your weekly nutrients?
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
                  Get Weekly Recommendations
                </Text>
              )}
            </TouchableOpacity>
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
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 60,
  },
  backButtonHeader: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  backButtonHeaderText: {
    fontSize: FontSizes.medium,
    color: Colors.black,
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
    minWidth: 80,
  },
  summaryContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    marginVertical: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    fontSize: FontSizes.large,
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
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  summarySubtext: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  optimalRangeText: {
    fontSize: FontSizes.small,
    color: Colors.info,
    fontStyle: 'italic',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
  },
  filterButton: {
    flex: 1,
    backgroundColor: Colors.buttonSecondary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    marginHorizontal: 2,
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.sm,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  noDataText: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  generateButtonText: {
    fontSize: FontSizes.medium,
    color: Colors.white,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
  },
  loadingText: {
    fontSize: FontSizes.large,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  bottomInfo: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
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