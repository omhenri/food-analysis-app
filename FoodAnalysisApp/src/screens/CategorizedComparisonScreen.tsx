import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../constants/theme';
import { EnhancedComparisonCard } from '../components/ComparisonCard';
import { WeeklyNutritionScoreWidget } from '../components/WeeklyNutritionScoreWidget';
import { EnhancedAnalysisDataService } from '../services/EnhancedAnalysisDataService';
import { PerformanceMonitoringService } from '../services/PerformanceMonitoringService';
import { ErrorHandler } from '../utils/errorHandler';
import { InputStackParamList } from '../navigation/AppNavigator';

interface CategorizedComparisonScreenProps {
  route: RouteProp<InputStackParamList, 'CategorizedComparison'>;
}

interface CategorizedData {
  macronutrients: any[];
  micronutrients: any[];
  harmfulSubstances: any[];
  calories: any[];
}

interface NutritionScore {
  overall: number;
  breakdown: {
    macronutrients: number;
    micronutrients: number;
    harmfulSubstances: number;
  };
  recommendations: string[];
}

export const CategorizedComparisonScreen: React.FC<CategorizedComparisonScreenProps> = ({
  route,
}) => {
  const { analysisResults } = route.params;
  const [categorizedData, setCategorizedData] = useState<CategorizedData | null>(null);
  const [nutritionScore, setNutritionScore] = useState<NutritionScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['macronutrients']));

  const performanceMonitor = PerformanceMonitoringService.getInstance();

  useEffect(() => {
    loadCategorizedData();
  }, [analysisResults]);

  const loadCategorizedData = async () => {
    try {
      setLoading(true);
      setError(null);

      const enhancedService = EnhancedAnalysisDataService.getInstance();
      
      // Load categorized comparison data
      const categorized = await performanceMonitor.measureAsyncOperation(
        'Categorize Substances',
        'database',
        () => enhancedService.categorizeSubstances(analysisResults)
      );

      // Calculate nutrition score
      const score = await performanceMonitor.measureAsyncOperation(
        'Calculate Nutrition Score',
        'database',
        () => enhancedService.calculateNutritionScore(analysisResults)
      );

      setCategorizedData(categorized);
      setNutritionScore(score);
    } catch (err) {
      console.error('Failed to load categorized data:', err);
      const errorMessage = 'Failed to load comparison data. Please try again.';
      setError(errorMessage);
      ErrorHandler.handleError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    performanceMonitor.measureUserInteraction('Toggle Category', () => {
      const newExpanded = new Set(expandedCategories);
      if (newExpanded.has(category)) {
        newExpanded.delete(category);
      } else {
        newExpanded.add(category);
      }
      setExpandedCategories(newExpanded);
    });
  };

  const renderCategorySection = (
    title: string,
    categoryKey: keyof CategorizedData,
    icon: string,
    color: string
  ) => {
    if (!categorizedData) return null;

    const items = categorizedData[categoryKey];
    const isExpanded = expandedCategories.has(categoryKey);
    const itemCount = items.length;

    return (
      <View style={styles.categorySection} key={categoryKey}>
        <TouchableOpacity
          style={[styles.categoryHeader, { borderLeftColor: color }]}
          onPress={() => toggleCategory(categoryKey)}
          testID={`category-section-${categoryKey}`}
          accessibilityRole="button"
          accessibilityLabel={`${title} section with ${itemCount} items. ${isExpanded ? 'Expanded' : 'Collapsed'}`}
          accessibilityHint="Tap to expand or collapse this category"
        >
          <View style={styles.categoryTitleContainer}>
            <Text style={styles.categoryIcon}>{icon}</Text>
            <Text style={styles.categoryTitle}>{title}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: color }]}>
              <Text style={styles.categoryBadgeText}>{itemCount}</Text>
            </View>
          </View>
          <Text style={[styles.expandIcon, { transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }]}>
            ▶
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.categoryContent}>
            {items.length > 0 ? (
              items.map((item, index) => (
                <EnhancedComparisonCard
                  key={`${categoryKey}-${index}`}
                  data={item}
                  animated={true}
                />
              ))
            ) : (
              <View style={styles.emptyCategory}>
                <Text style={styles.emptyCategoryText}>
                  No {title.toLowerCase()} detected in your meals
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderRetryButton = () => (
    <TouchableOpacity
      style={styles.retryButton}
      onPress={loadCategorizedData}
      testID="retry-button"
      accessibilityRole="button"
      accessibilityLabel="Retry loading comparison data"
    >
      <Text style={styles.retryButtonText}>Retry</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} testID="loading-spinner" />
        <Text style={styles.loadingText}>Analyzing nutritional data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        {renderRetryButton()}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Categorized Comparison</Text>
        <Text style={styles.subtitle}>
          Detailed breakdown of your nutritional intake by category
        </Text>
      </View>

      {/* Nutrition Score Widget */}
      {nutritionScore && (
        <WeeklyNutritionScoreWidget
          score={nutritionScore}
          testID="nutrition-score-widget"
        />
      )}

      {/* Category Sections */}
      <View style={styles.categoriesContainer}>
        {renderCategorySection(
          'Macronutrients',
          'macronutrients',
          '🥖',
          Colors.primary
        )}
        
        {renderCategorySection(
          'Micronutrients',
          'micronutrients',
          '🥬',
          Colors.success
        )}
        
        {renderCategorySection(
          'Harmful Substances',
          'harmfulSubstances',
          '⚠️',
          Colors.error
        )}
        
        {renderCategorySection(
          'Calories',
          'calories',
          '🔥',
          Colors.warning
        )}
      </View>

      {/* Recommendations */}
      {nutritionScore && nutritionScore.recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.recommendationsTitle}>Recommendations</Text>
          {nutritionScore.recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.recommendationBullet}>•</Text>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer spacing */}
      <View style={styles.footer} />
    </ScrollView>
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
    marginTop: Spacing.md,
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.xlarge,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  categoriesContainer: {
    padding: Spacing.md,
  },
  categorySection: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderLeftWidth: 4,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  categoryTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  categoryBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  categoryBadgeText: {
    color: Colors.white,
    fontSize: FontSizes.small,
    fontWeight: 'bold',
  },
  expandIcon: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  categoryContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  emptyCategory: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyCategoryText: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  recommendationsSection: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationsTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  recommendationBullet: {
    fontSize: FontSizes.medium,
    color: Colors.primary,
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  recommendationText: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    height: Spacing.xl,
  },
});