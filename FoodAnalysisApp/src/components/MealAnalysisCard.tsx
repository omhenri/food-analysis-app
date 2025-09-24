import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { AnalysisResult, MealType } from '../models/types';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { PortionIcon } from './PortionIcon';
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
  console.log('MealAnalysisCard render:', {
    mealType,
    analysisResultsCount: analysisResults.length,
    firstResult: analysisResults[0] ? {
      foodId: analysisResults[0].foodId,
      chemicalSubstancesCount: analysisResults[0].chemicalSubstances?.length || 0,
      ingredientsCount: analysisResults[0].ingredients?.length || 0
    } : 'no results'
  });

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


  const formatNutrientName = (nutrientName: string): string => {
    // Special handling for Energy - display as Calories
    if (nutrientName.toLowerCase().includes('energy')) {
      return 'Calories';
    }
    return nutrientName;
  };

  const formatNutrientAmount = (amount: number, nutrientName: string): string => {
    // Special handling for Energy - display in calories
    if (nutrientName.toLowerCase().includes('energy')) {
      return `${amount.toFixed(0)}cal`;
    }

    // Convert very small amounts to mg or µg for better readability
    if (amount < 0.001) {
      return `${(amount * 1000000).toFixed(0)}µg`;
    } else if (amount < 0.1) {
      return `${(amount * 1000).toFixed(0)}mg`;
    } else {
      return `${amount.toFixed(1)}g`;
    }
  };

  const groupSubstancesByFood = () => {
    return analysisResults.map(result => ({
      foodName: result.foodId, // Using foodId as name for now
      ingredients: result.ingredients,
      ingredientDetails: result.ingredientDetails, // Add detailed ingredient info
      substances: result.chemicalSubstances,
      servingInfo: result.servingInfo,
      detailedNutrients: result.detailedNutrients,
    }));
  };

  // Use both opacity and height animations for proper collapsible behavior
  const contentOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const contentHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500], // Set a reasonable max height for scrollable content
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
      <Animated.View 
        style={[
          styles.content, 
          { 
            opacity: contentOpacity,
            maxHeight: contentHeight,
          }
        ]}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {groupSubstancesByFood().map((foodData, index) => (
            <View key={index} style={styles.foodSection}>
              <Text style={styles.foodName}>{foodData.foodName}</Text>

              {/* Serving Information */}
              {foodData.servingInfo && (
                <View style={styles.servingSection}>
                  <Text style={styles.sectionTitle}>Serving:</Text>
                  <View style={styles.servingRow}>
                    <Text style={styles.servingText}>
                      {foodData.servingInfo.description} ({foodData.servingInfo.grams}g)
                    </Text>
                    {(analysisResults[index] as any)?.portionInfo && (
                      <View style={styles.portionWithText}>
                        <PortionIcon
                          portion={(analysisResults[index] as any).portionInfo.portion}
                          selected={true}
                          size={16}
                        />
                        <Text style={styles.portionText}>
                          {(analysisResults[index] as any).portionInfo.portion}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Ingredients */}
              <View style={styles.ingredientsSection}>
                <Text style={styles.sectionTitle}>Ingredients:</Text>
                {foodData.ingredientDetails ? (
                  <View>
                    {foodData.ingredientDetails.map((ingredient, idx) => (
                      <Text key={idx} style={styles.ingredientItem}>
                        • {ingredient.name} ({ingredient.portion_percent.toFixed(1)}%)
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.ingredientsList}>
                    {foodData.ingredients.join(', ')}
                  </Text>
                )}
              </View>

              {/* Chemical Substances */}
              <View style={styles.substancesSection}>
                <Text style={styles.sectionTitle}>Nutrients:</Text>
                {foodData.substances && foodData.substances.length > 0 ? (
                  foodData.substances.map((substance, substanceIndex) => (
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
                        <Text style={styles.substanceName}>{formatNutrientName(substance.name)}</Text>
                      </View>
                      <Text style={styles.substanceAmount}>
                        {formatNutrientAmount(substance.amount, substance.name)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noNutrientsText}>No nutrient data available</Text>
                )}

                {/* Show total nutrient count */}
                {foodData.detailedNutrients && (
                  <Text style={styles.additionalNutrientsText}>
                    Total: {Object.keys(foodData.detailedNutrients).length} nutrients analyzed
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
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
  scrollView: {
    
  },
  contentInner: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs, // Add some bottom padding for better scrolling experience
  },
  foodSection: {
  },
  foodName: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  servingSection: {
    marginBottom: Spacing.xs,
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  servingText: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  portionWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  portionText: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginLeft: 4,
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
  ingredientItem: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginBottom: 2,
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
    fontSize: FontSizes.small,
    color: Colors.inactive,
    fontStyle: 'italic',
    marginTop: 4,
  },
  noNutrientsText: {
    fontSize: FontSizes.small,
    color: Colors.inactive,
    fontStyle: 'italic',
    marginTop: 4,
  },
});