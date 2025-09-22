import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { AnalysisResult, MealType, FoodItem } from '../models/types';
import { MealAnalysisCard } from '../components/MealAnalysisCard';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { AnalysisServiceManager } from '../services/AnalysisServiceManager';
import { MEAL_TYPES } from '../utils/validation';

interface AnalysisScreenProps {
  foods: FoodItem[];
  onComparisonPress: (analysisResults: AnalysisResult[]) => void;
  onBackPress: () => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({
  foods,
  onComparisonPress,
  onBackPress,
}) => {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set(['breakfast']));

  const analysisService = AnalysisServiceManager.getInstance();

  useEffect(() => {
    performAnalysis();
  }, [foods]);

  const performAnalysis = async () => {
    if (foods.length === 0) {
      setError('No foods to analyze');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Starting food analysis for:', foods.map(f => f.name));
      const results = await analysisService.analyzeFoods(foods);
      
      setAnalysisResults(results);
      console.log('Analysis completed successfully');
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(`Analysis failed: ${err}`);
      
      Alert.alert(
        'Analysis Error',
        'Failed to analyze foods. Please try again.',
        [
          { text: 'Retry', onPress: performAnalysis },
          { text: 'Go Back', onPress: onBackPress },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMealExpansion = (mealType: MealType) => {
    const newExpanded = new Set(expandedMeals);
    if (newExpanded.has(mealType)) {
      newExpanded.delete(mealType);
    } else {
      newExpanded.add(mealType);
    }
    setExpandedMeals(newExpanded);
  };

  const getAnalysisForMealType = (mealType: MealType): AnalysisResult[] => {
    return analysisResults.filter(result => {
      // Find the original food item to get its meal type
      const originalFood = foods.find(food => food.id === result.foodId);
      return originalFood?.mealType === mealType;
    });
  };

  const hasMealTypeData = (mealType: MealType): boolean => {
    return getAnalysisForMealType(mealType).length > 0;
  };

  const handleComparisonPress = () => {
    if (analysisResults.length === 0) {
      Alert.alert('No Data', 'No analysis results available for comparison.');
      return;
    }
    onComparisonPress(analysisResults);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Analyzing your foods...</Text>
          <Text style={styles.loadingSubtext}>
            {analysisService.isUsingMockService() ? 'Using mock data' : 'Using AI analysis'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={performAnalysis}>
            <Text style={styles.retryButtonText}>Retry Analysis</Text>
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
          <Text style={styles.title}>Analysis Results</Text>
        </View>

        {/* Analysis Results */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

          {analysisResults.length === 0 && (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No analysis results available</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.comparisonButton}
            onPress={handleComparisonPress}
            disabled={analysisResults.length === 0}
          >
            <Text style={styles.comparisonButtonText}>Comparison</Text>
          </TouchableOpacity>
        </View>
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
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButtonHeader: {
    marginRight: Spacing.sm,
  },
  backButtonHeaderText: {
    fontSize: FontSizes.medium,
    color: Colors.primary,
  },
  title: {
    fontSize: FontSizes.xlarge,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.md,
  },
  bottomSection: {
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  comparisonButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  comparisonButtonText: {
    fontSize: FontSizes.small,
    color: Colors.inactive,
    fontWeight: '400',
    textTransform: 'capitalize',
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
  loadingSubtext: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
  },
});