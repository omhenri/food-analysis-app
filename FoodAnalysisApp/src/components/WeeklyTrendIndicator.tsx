import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { WeeklyTrendAnalysis } from '../services/WeeklyReportService';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

interface WeeklyTrendIndicatorProps {
  trendAnalysis: WeeklyTrendAnalysis;
}

export const WeeklyTrendIndicator: React.FC<WeeklyTrendIndicatorProps> = ({
  trendAnalysis,
}) => {
  const renderWeekOverWeekComparison = () => {
    if (!trendAnalysis.weekOverWeekComparison) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No previous week data for comparison</Text>
        </View>
      );
    }

    const { 
      nutritionScoreChange, 
      calorieChange, 
      improvingNutrients, 
      decliningNutrients 
    } = trendAnalysis.weekOverWeekComparison;

    const getTrendIcon = (change: number) => {
      if (change > 5) return '📈';
      if (change < -5) return '📉';
      return '➡️';
    };

    const getTrendColor = (change: number) => {
      if (change > 5) return Colors.success;
      if (change < -5) return Colors.error;
      return Colors.textSecondary;
    };

    return (
      <View style={styles.comparisonContainer}>
        <Text style={styles.sectionTitle}>Week-over-Week Trends</Text>
        
        {/* Nutrition Score Change */}
        <View style={styles.trendItem}>
          <Text style={styles.trendIcon}>{getTrendIcon(nutritionScoreChange)}</Text>
          <View style={styles.trendContent}>
            <Text style={styles.trendLabel}>Nutrition Score</Text>
            <Text style={[styles.trendValue, { color: getTrendColor(nutritionScoreChange) }]}>
              {nutritionScoreChange > 0 ? '+' : ''}{nutritionScoreChange.toFixed(1)} points
            </Text>
          </View>
        </View>

        {/* Calorie Change */}
        <View style={styles.trendItem}>
          <Text style={styles.trendIcon}>{getTrendIcon(calorieChange)}</Text>
          <View style={styles.trendContent}>
            <Text style={styles.trendLabel}>Average Daily Calories</Text>
            <Text style={[styles.trendValue, { color: getTrendColor(calorieChange) }]}>
              {calorieChange > 0 ? '+' : ''}{calorieChange.toFixed(0)} cal/day
            </Text>
          </View>
        </View>

        {/* Improving Nutrients */}
        {improvingNutrients.length > 0 && (
          <View style={styles.nutrientChangeContainer}>
            <Text style={styles.nutrientChangeTitle}>✅ Improving</Text>
            <Text style={styles.nutrientChangeList}>
              {improvingNutrients.slice(0, 3).join(', ')}
              {improvingNutrients.length > 3 && ` +${improvingNutrients.length - 3} more`}
            </Text>
          </View>
        )}

        {/* Declining Nutrients */}
        {decliningNutrients.length > 0 && (
          <View style={styles.nutrientChangeContainer}>
            <Text style={styles.nutrientChangeTitle}>⚠️ Needs Attention</Text>
            <Text style={styles.nutrientChangeList}>
              {decliningNutrients.slice(0, 3).join(', ')}
              {decliningNutrients.length > 3 && ` +${decliningNutrients.length - 3} more`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderConsistencyScore = () => {
    const getConsistencyLevel = (score: number) => {
      if (score >= 85) return { level: 'Excellent', color: Colors.success, icon: '🎯' };
      if (score >= 70) return { level: 'Good', color: Colors.warning, icon: '👍' };
      if (score >= 50) return { level: 'Fair', color: Colors.warning, icon: '⚡' };
      return { level: 'Needs Improvement', color: Colors.error, icon: '📝' };
    };

    const consistency = getConsistencyLevel(trendAnalysis.consistencyScore);

    return (
      <View style={styles.consistencyContainer}>
        <Text style={styles.sectionTitle}>Tracking Consistency</Text>
        <View style={styles.consistencyItem}>
          <Text style={styles.consistencyIcon}>{consistency.icon}</Text>
          <View style={styles.consistencyContent}>
            <Text style={styles.consistencyLabel}>
              {trendAnalysis.consistencyScore.toFixed(0)}% of days tracked
            </Text>
            <Text style={[styles.consistencyLevel, { color: consistency.color }]}>
              {consistency.level}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTopVariations = () => {
    const topVariations = trendAnalysis.dailyVariation
      .sort((a, b) => b.standardDeviation - a.standardDeviation)
      .slice(0, 3);

    if (topVariations.length === 0) return null;

    return (
      <View style={styles.variationContainer}>
        <Text style={styles.sectionTitle}>Daily Variation Insights</Text>
        {topVariations.map((variation, index) => (
          <View key={variation.substance} style={styles.variationItem}>
            <Text style={styles.variationSubstance}>{variation.substance}</Text>
            <Text style={styles.variationValue}>
              ±{variation.standardDeviation.toFixed(1)} daily variation
            </Text>
            <Text style={styles.variationInsight}>
              {variation.standardDeviation < 10 ? 'Very consistent' : 
               variation.standardDeviation < 25 ? 'Moderately consistent' : 'Highly variable'}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderWeekOverWeekComparison()}
      {renderConsistencyScore()}
      {renderTopVariations()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  comparisonContainer: {
    marginBottom: Spacing.md,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  trendIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  trendContent: {
    flex: 1,
  },
  trendLabel: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  trendValue: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  nutrientChangeContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.small,
    padding: Spacing.xs,
    marginTop: Spacing.xs,
  },
  nutrientChangeTitle: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  nutrientChangeList: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  consistencyContainer: {
    marginBottom: Spacing.md,
  },
  consistencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consistencyIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  consistencyContent: {
    flex: 1,
  },
  consistencyLabel: {
    fontSize: FontSizes.medium,
    color: Colors.textPrimary,
  },
  consistencyLevel: {
    fontSize: FontSizes.small,
    fontWeight: '600',
  },
  variationContainer: {
    marginBottom: Spacing.sm,
  },
  variationItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.small,
    padding: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  variationSubstance: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  variationValue: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  variationInsight: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  noDataContainer: {
    padding: Spacing.sm,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});