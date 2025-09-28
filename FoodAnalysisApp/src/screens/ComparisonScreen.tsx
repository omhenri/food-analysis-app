import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ComparisonData, AnalysisResult } from '../models/types';
import { ComparisonCard } from '../components/ComparisonCard';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { BackendNeutralizationRecommendations } from '../services/BackendApiService';
import { AnalysisServiceManager } from '../services/AnalysisServiceManager';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { InputStackParamList } from '../navigation/AppNavigator';

type ComparisonScreenNavigationProp = StackNavigationProp<InputStackParamList, 'Comparison'>;

interface ComparisonScreenProps {
  analysisResults?: AnalysisResult[];
  onBackPress: () => void;
}

export const ComparisonScreen: React.FC<ComparisonScreenProps> = ({
  analysisResults,
  onBackPress,
}) => {
  const {
    comparisonData,
    isLoadingComparison,
    error,
    loadCurrentDayComparison,
    clearError,
    hasComparisonData,
  } = useAnalysisData();

  const navigation = useNavigation<ComparisonScreenNavigationProp>();
  const analysisServiceManager = AnalysisServiceManager.getInstance();

  const [filterStatus, setFilterStatus] = useState<'all' | 'under' | 'optimal' | 'over'>('all');
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);

  useEffect(() => {
    loadComparison();
  }, [analysisResults]);

  const loadComparison = async () => {
    try {
      await loadCurrentDayComparison();
    } catch (err) {
      console.error('Failed to load comparison:', err);
      Alert.alert(
        'Comparison Error',
        'Failed to load comparison data. Please try again.',
        [
          { text: 'Retry', onPress: loadComparison },
          { text: 'Go Back', onPress: onBackPress },
        ]
      );
    }
  };

  const getFilteredComparisonData = (): ComparisonData[] => {
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
      Alert.alert('No Over-dosed Substances', 'You don\'t have any substances above recommended levels.');
      return;
    }

    try {
      setIsLoadingRecommendations(true);

      // Call neutralization recommendations using AnalysisServiceManager
      const data = await analysisServiceManager.getNeutralizationRecommendations(overdosed);

      // Navigate to the neutralization recommendations screen within the same stack
      navigation.navigate('NeutralizationRecommendations', { recommendations: data });
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

  if (isLoadingComparison) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Calculating comparison...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadComparison}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButtonHeader} onPress={onBackPress}>
            <Text style={styles.backButtonHeaderText}>←</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Daily Comparison</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Nutritional Analysis Summary</Text>
          <Text style={styles.summaryText}>{getSummaryText()}</Text>
          <Text style={styles.summarySubtext}>
            Compared to recommended daily intake for adults aged 18-29
          </Text>
          <Text style={styles.optimalRangeText}>
            💡 Optimal range is 80-120% of recommended daily intake
          </Text>
        </View>

        {/* Filter Buttons */}
        {hasComparisonData() && renderFilterButtons()}

        {/* Comparison Results */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {getFilteredComparisonData().map((comparison, index) => (
            <ComparisonCard
              key={`${comparison.substance}-${index}`}
              comparisonData={comparison}
            />
          ))}

          {getFilteredComparisonData().length === 0 && hasComparisonData() && (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>
                No substances match the selected filter
              </Text>
            </View>
          )}

          {!hasComparisonData() && (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>
                No comparison data available
              </Text>
              <Text style={styles.noDataSubtext}>
                Please analyze some foods first
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Info */}
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
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  summaryText: {
    fontSize: FontSizes.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  summarySubtext: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  optimalRangeText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
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
    minHeight: 44, // Fixed minimum height to prevent shrinking
    minWidth: 220
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
    marginLeft: 8, // Add spacing when used with spinner
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSizes.large,
    color: Colors.textPrimary,
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
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  retryButtonText: {
    fontSize: FontSizes.medium,
    color: Colors.white,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: Colors.buttonSecondary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  backButtonText: {
    fontSize: FontSizes.medium,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  noDataText: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  noDataSubtext: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});