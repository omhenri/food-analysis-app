import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { WeeklyNutritionScore } from '../services/WeeklyReportService';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

interface WeeklyNutritionScoreWidgetProps {
  nutritionScore?: WeeklyNutritionScore;
  score?: {
    overall: number;
    breakdown: {
      macronutrients: number;
      micronutrients: number;
      harmfulSubstances: number;
    };
    recommendations: string[];
  };
  testID?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export const WeeklyNutritionScoreWidget: React.FC<WeeklyNutritionScoreWidgetProps> = ({
  nutritionScore,
  score,
  testID,
}) => {
  // Use either the weekly nutrition score or the generic score
  const displayScore = score || nutritionScore;
  const getScoreColor = (score: number): string => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
  };

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable'): string => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
    }
  };

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable'): string => {
    switch (trend) {
      case 'improving': return Colors.success;
      case 'declining': return Colors.error;
      case 'stable': return Colors.textSecondary;
    }
  };

  const renderCircularProgress = () => {
    const radius = 40;
    const strokeWidth = 6;
    const overallScore = displayScore?.overall || 0;

    return (
      <View style={styles.circularProgressContainer}>
        <View style={styles.circularProgress}>
          {/* Background circle */}
          <View
            style={[
              styles.progressCircle,
              {
                width: radius * 2,
                height: radius * 2,
                borderRadius: radius,
                borderWidth: strokeWidth,
                borderColor: Colors.border,
              },
            ]}
          />
          
          {/* Score text */}
          <View style={styles.scoreTextContainer}>
            <Text style={[styles.scoreText, { color: getScoreColor(overallScore) }]}>
              {overallScore}
            </Text>
            <Text style={styles.scoreLabel}>Overall Score</Text>
          </View>
        </View>
        
        {/* Trend indicator - only show for weekly nutrition score */}
        {nutritionScore?.trend && (
          <View style={styles.trendContainer}>
            <Text style={styles.trendIcon}>{getTrendIcon(nutritionScore.trend)}</Text>
            <Text style={[styles.trendText, { color: getTrendColor(nutritionScore.trend) }]}>
              {nutritionScore.trend.charAt(0).toUpperCase() + nutritionScore.trend.slice(1)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderDailyScores = () => {
    if (!nutritionScore?.daily) return null;
    
    const maxScore = Math.max(...nutritionScore.daily.map(d => d.score));
    const barWidth = (screenWidth - Spacing.md * 4) / 7;

    return (
      <View style={styles.dailyScoresContainer}>
        <Text style={styles.sectionTitle}>Daily Nutrition Scores</Text>
        <View style={styles.dailyBarsContainer}>
          {nutritionScore.daily.map((day, index) => (
            <View key={day.dayNumber} style={[styles.dailyBarWrapper, { width: barWidth }]}>
              <View
                style={[
                  styles.dailyBar,
                  {
                    height: Math.max(4, (day.score / 100) * 40),
                    backgroundColor: getScoreColor(day.score),
                  },
                ]}
              />
              <Text style={styles.dayLabel}>D{day.dayNumber}</Text>
              <Text style={styles.dayScore}>{day.score}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderBreakdown = () => {
    const breakdown = displayScore?.breakdown || nutritionScore?.breakdown;
    if (!breakdown) return null;

    const categories = [
      { key: 'macronutrients', label: 'Macronutrients', score: breakdown.macronutrients, icon: '🍞' },
      { key: 'micronutrients', label: 'Micronutrients', score: breakdown.micronutrients, icon: '🥬' },
      { key: 'harmfulSubstances', label: 'Harmful Substances', score: breakdown.harmfulSubstances, icon: '⚠️' },
    ];

    return (
      <View style={styles.breakdownContainer}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        {categories.map((category) => (
          <View key={category.key} style={styles.breakdownItem}>
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <View style={styles.categoryContent}>
              <Text style={styles.categoryLabel}>{category.label}</Text>
              <View style={styles.categoryProgressContainer}>
                <View style={styles.categoryProgressBackground}>
                  <View
                    style={[
                      styles.categoryProgress,
                      {
                        width: `${category.score}%`,
                        backgroundColor: getScoreColor(category.score),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.categoryScore, { color: getScoreColor(category.score) }]}>
                  {category.score}%
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderWeeklyGoals = () => {
    if (!nutritionScore?.weeklyGoals) return null;
    
    const { achieved, missed, partiallyAchieved } = nutritionScore.weeklyGoals;
    
    if (achieved.length === 0 && missed.length === 0 && partiallyAchieved.length === 0) {
      return null;
    }

    return (
      <View style={styles.goalsContainer}>
        <Text style={styles.sectionTitle}>Weekly Goals</Text>
        
        {achieved.length > 0 && (
          <View style={styles.goalCategory}>
            <Text style={styles.goalCategoryTitle}>✅ Achieved ({achieved.length})</Text>
            <Text style={styles.goalList}>
              {achieved.slice(0, 3).join(', ')}
              {achieved.length > 3 && ` +${achieved.length - 3} more`}
            </Text>
          </View>
        )}

        {partiallyAchieved.length > 0 && (
          <View style={styles.goalCategory}>
            <Text style={styles.goalCategoryTitle}>🔶 Partially Achieved ({partiallyAchieved.length})</Text>
            <Text style={styles.goalList}>
              {partiallyAchieved.slice(0, 3).join(', ')}
              {partiallyAchieved.length > 3 && ` +${partiallyAchieved.length - 3} more`}
            </Text>
          </View>
        )}

        {missed.length > 0 && (
          <View style={styles.goalCategory}>
            <Text style={styles.goalCategoryTitle}>❌ Missed ({missed.length})</Text>
            <Text style={styles.goalList}>
              {missed.slice(0, 3).join(', ')}
              {missed.length > 3 && ` +${missed.length - 3} more`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!displayScore) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      {renderCircularProgress()}
      {renderDailyScores()}
      {renderBreakdown()}
      {renderWeeklyGoals()}
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
  circularProgressContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  circularProgress: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: {
    position: 'absolute',
  },
  progressCircleActive: {
    // This would need a proper circular progress implementation
    // For now, using a simplified version
  },
  scoreTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  trendIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  trendText: {
    fontSize: FontSizes.small,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  dailyScoresContainer: {
    marginBottom: Spacing.md,
  },
  dailyBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 60,
  },
  dailyBarWrapper: {
    alignItems: 'center',
  },
  dailyBar: {
    width: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 8,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  dayScore: {
    fontSize: 8,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  breakdownContainer: {
    marginBottom: Spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  categoryContent: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  categoryProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryProgressBackground: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  categoryProgress: {
    height: 6,
    borderRadius: 3,
  },
  categoryScore: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  goalsContainer: {
    marginBottom: Spacing.sm,
  },
  goalCategory: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.small,
    padding: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  goalCategoryTitle: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  goalList: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
});