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
import { WeeklyReportService, WeeklyReportData } from '../services/WeeklyReportService';
import { ComparisonCard } from '../components/ComparisonCard';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

interface WeeklyReportScreenProps {
  weekId: number;
  onBackPress: () => void;
}

export const WeeklyReportScreen: React.FC<WeeklyReportScreenProps> = ({
  weekId,
  onBackPress,
}) => {
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'summary' | 'comparison' | 'daily'>('summary');

  const weeklyReportService = WeeklyReportService.getInstance();

  useEffect(() => {
    loadWeeklyReport();
  }, [weekId]);

  const loadWeeklyReport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await weeklyReportService.generateWeeklyReport(weekId);
      setReportData(data);
    } catch (err) {
      console.error('Failed to load weekly report:', err);
      setError(`Failed to load weekly report: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getWeekDateRange = (): string => {
    if (!reportData) return '';
    
    const startDate = new Date(reportData.week.startDate);
    const endDate = reportData.week.endDate 
      ? new Date(reportData.week.endDate)
      : new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);

    return `${startDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${endDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })}`;
  };

  const renderSummaryView = () => {
    if (!reportData) return null;

    const { summary } = reportData;

    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Cards */}
        <View style={styles.overviewContainer}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewNumber}>{summary.daysWithData}</Text>
            <Text style={styles.overviewLabel}>Days Tracked</Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={styles.overviewNumber}>{summary.averageCaloriesPerDay}</Text>
            <Text style={styles.overviewLabel}>Avg Calories/Day</Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={[styles.overviewNumber, { color: getScoreColor(summary.nutritionScore) }]}>
              {summary.nutritionScore}%
            </Text>
            <Text style={styles.overviewLabel}>Nutrition Score</Text>
          </View>
        </View>

        {/* Top Nutrients */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Top Nutrients This Week</Text>
          {summary.topNutrients.map((nutrient, index) => (
            <View key={nutrient.name} style={styles.nutrientRow}>
              <Text style={styles.nutrientName}>
                {index + 1}. {nutrient.name}
              </Text>
              <Text style={styles.nutrientAmount}>
                {formatAmount(nutrient.amount)} ({nutrient.percentage.toFixed(0)}%)
              </Text>
            </View>
          ))}
        </View>

        {/* Recommendations */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {summary.recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.recommendationText}>• {recommendation}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderComparisonView = () => {
    if (!reportData) return null;

    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Weekly Intake vs Recommended</Text>
        {reportData.weeklyComparison.map((comparison, index) => (
          <ComparisonCard
            key={`${comparison.substance}-${index}`}
            comparisonData={comparison}
          />
        ))}
      </ScrollView>
    );
  };

  const renderDailyView = () => {
    if (!reportData) return null;

    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Daily Breakdown</Text>
        {reportData.dailyBreakdown.map((dayData, index) => (
          <View key={dayData.day.id} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>
                Day {dayData.day.dayNumber}
              </Text>
              <Text style={styles.dayDate}>
                {new Date(dayData.day.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
            
            <View style={styles.dayStats}>
              <Text style={styles.dayStatText}>
                {dayData.totalCalories} calories • {dayData.mealCount} meals
              </Text>
            </View>

            {dayData.mealCount === 0 && (
              <Text style={styles.noDataText}>No meals recorded</Text>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 1) {
      return `${amount.toFixed(1)}g`;
    } else if (amount >= 0.001) {
      return `${(amount * 1000).toFixed(1)}mg`;
    } else {
      return `${(amount * 1000000).toFixed(1)}μg`;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Generating weekly report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadWeeklyReport}>
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
            <Text style={styles.backButtonHeaderText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Weekly Report</Text>
            <Text style={styles.subtitle}>
              Week {reportData?.week.weekNumber} • {getWeekDateRange()}
            </Text>
          </View>
        </View>

        {/* View Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              currentView === 'summary' && styles.toggleButtonActive,
            ]}
            onPress={() => setCurrentView('summary')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                currentView === 'summary' && styles.toggleButtonTextActive,
              ]}
            >
              Summary
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toggleButton,
              currentView === 'comparison' && styles.toggleButtonActive,
            ]}
            onPress={() => setCurrentView('comparison')}
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

          <TouchableOpacity
            style={[
              styles.toggleButton,
              currentView === 'daily' && styles.toggleButtonActive,
            ]}
            onPress={() => setCurrentView('daily')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                currentView === 'daily' && styles.toggleButtonTextActive,
              ]}
            >
              Daily
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {currentView === 'summary' && renderSummaryView()}
        {currentView === 'comparison' && renderComparisonView()}
        {currentView === 'daily' && renderDailyView()}
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
  backButtonHeader: {
    marginRight: Spacing.sm,
  },
  backButtonHeaderText: {
    fontSize: FontSizes.medium,
    color: Colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.xlarge,
    fontWeight: '600',
    color: Colors.white,
  },
  subtitle: {
    fontSize: FontSizes.small,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 2,
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
    paddingHorizontal: Spacing.xs,
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
  overviewContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.medium,
    padding: Spacing.sm,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  overviewNumber: {
    fontSize: FontSizes.xlarge,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  overviewLabel: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  nutrientName: {
    fontSize: FontSizes.medium,
    color: Colors.textPrimary,
    flex: 1,
  },
  nutrientAmount: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  recommendationItem: {
    marginBottom: Spacing.xs,
  },
  recommendationText: {
    fontSize: FontSizes.medium,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  dayCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.medium,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dayTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dayDate: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  dayStats: {
    marginBottom: Spacing.xs,
  },
  dayStatText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  noDataText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    fontStyle: 'italic',
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
});