import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { AnalysisResult, MealType } from '../models/types';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { MealIcon } from './MealIcon';

interface MealAnalysisCardProps {
  mealType: MealType;
  analysisResults: AnalysisResult[];
  isExpanded: boolean;
  onToggle: () => void;
}

export const MealAnalysisCard: React.FC<MealAnalysisCardProps> = ({
  mealType,
  analysisResults,
  isExpanded,
  onToggle,
}) => {
  const [animation] = useState(new Animated.Value(isExpanded ? 1 : 0));

  React.useEffect(() => {
    Animated.timing(animation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animation]);


  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'good':
        return Colors.success;
      case 'bad':
        return Colors.error;
      case 'neutral':
        return Colors.warning;
      default:
        return Colors.textSecondary;
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'good':
        return '✓';
      case 'bad':
        return '✗';
      case 'neutral':
        return '○';
      default:
        return '○';
    }
  };


  const groupSubstancesByFood = () => {
    return analysisResults.map(result => ({
      foodName: result.foodId, // Using foodId as name for now
      ingredients: result.ingredients,
      substances: result.chemicalSubstances,
      servingInfo: result.servingInfo,
      detailedNutrients: result.detailedNutrients,
    }));
  };

  const contentHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200], // Adjust based on content
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={onToggle}>
        <View style={styles.headerLeft}>
          <MealIcon mealType={mealType} />
          <Text style={styles.mealTitle}>
            {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
          </Text>
        </View>
        <Text style={[styles.expandIcon, { transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }]}>
          ▼
        </Text>
      </TouchableOpacity>

      {/* Expandable Content */}
      <Animated.View style={[styles.content, { height: contentHeight }]}>
        <View style={styles.contentInner}>
          {groupSubstancesByFood().map((foodData, index) => (
            <View key={index} style={styles.foodSection}>
              <Text style={styles.foodName}>{foodData.foodName}</Text>

              {/* Serving Information */}
              {foodData.servingInfo && (
                <View style={styles.servingSection}>
                  <Text style={styles.sectionTitle}>Serving:</Text>
                  <Text style={styles.servingText}>
                    {foodData.servingInfo.description} ({foodData.servingInfo.grams}g)
                  </Text>
                </View>
              )}

              {/* Ingredients */}
              <View style={styles.ingredientsSection}>
                <Text style={styles.sectionTitle}>Ingredients:</Text>
                <Text style={styles.ingredientsList}>
                  {foodData.ingredients.join(', ')}
                </Text>
              </View>

              {/* Chemical Substances */}
              <View style={styles.substancesSection}>
                <Text style={styles.sectionTitle}>Key Nutrients:</Text>
                {foodData.substances.map((substance, substanceIndex) => (
                  <View key={substanceIndex} style={styles.substanceRow}>
                    <View style={styles.substanceInfo}>
                      <Text
                        style={[
                          styles.categoryIcon,
                          { color: getCategoryColor(substance.category) }
                        ]}
                      >
                        {getCategoryIcon(substance.category)}
                      </Text>
                      <Text style={styles.substanceName}>{substance.name}</Text>
                    </View>
                    <Text style={styles.substanceAmount}>
                      {substance.amount.toFixed(1)}g
                    </Text>
                  </View>
                ))}

                {/* Show additional nutrient count if available */}
                {foodData.detailedNutrients && (
                  <Text style={styles.additionalNutrientsText}>
                    + {Object.keys(foodData.detailedNutrients).length - foodData.substances.length} more nutrients analyzed
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.small,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTitle: {
    fontSize: FontSizes.medium,
    color: Colors.inactive,
    fontWeight: '400',
    textTransform: 'capitalize',
  },
  expandIcon: {
    fontSize: 12,
    color: Colors.inactive,
    fontWeight: 'bold',
  },
  content: {
    overflow: 'hidden',
  },
  contentInner: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  foodSection: {
    marginBottom: Spacing.sm,
  },
  foodName: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  servingSection: {
    marginBottom: Spacing.xs,
  },
  servingText: {
    fontSize: FontSizes.small,
    color: Colors.primary,
    fontWeight: '500',
  },
  ingredientsSection: {
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  ingredientsList: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  substancesSection: {
    marginTop: Spacing.xs,
  },
  substanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  substanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: Spacing.xs,
    width: 16,
  },
  substanceName: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    flex: 1,
  },
  substanceAmount: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  additionalNutrientsText: {
    fontSize: FontSizes.xsmall,
    color: Colors.inactive,
    fontStyle: 'italic',
    marginTop: 4,
  },
});