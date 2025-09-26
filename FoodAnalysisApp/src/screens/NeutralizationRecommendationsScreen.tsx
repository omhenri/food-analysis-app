import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { BackendNeutralizationRecommendations } from '../services/BackendApiService';
import { InputStackParamList } from '../navigation/AppNavigator';

type NeutralizationRecommendationsScreenRouteProp = RouteProp<InputStackParamList, 'NeutralizationRecommendations'>;
type NeutralizationRecommendationsScreenNavigationProp = StackNavigationProp<InputStackParamList, 'NeutralizationRecommendations'>;

export const NeutralizationRecommendationsScreen: React.FC = () => {
  const navigation = useNavigation<NeutralizationRecommendationsScreenNavigationProp>();
  const route = useRoute<NeutralizationRecommendationsScreenRouteProp>();

  const { recommendations } = route.params;

  const handleBackPress = () => {
    navigation.goBack();
  };

  const renderRecommendationSection = (title: string, items: any[], icon: string) => {
    if (!items || items.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {items.map((item, index) => (
          <View key={index} style={styles.recommendationItem}>
            <Text style={styles.substanceName}>{item.substance}</Text>
            {item.foods && (
              <View style={styles.recommendationDetails}>
                <Text style={styles.detailLabel}>Foods:</Text>
                {item.foods.map((food: string, foodIndex: number) => (
                  <Text key={foodIndex} style={styles.detailText}>• {food}</Text>
                ))}
              </View>
            )}
            {item.activities && (
              <View style={styles.recommendationDetails}>
                <Text style={styles.detailLabel}>Activities:</Text>
                {item.activities.map((activity: string, activityIndex: number) => (
                  <Text key={activityIndex} style={styles.detailText}>• {activity}</Text>
                ))}
                {item.duration && (
                  <Text style={styles.durationText}>Duration: {item.duration}</Text>
                )}
              </View>
            )}
            {item.drinks && (
              <View style={styles.recommendationDetails}>
                <Text style={styles.detailLabel}>Drinks:</Text>
                {item.drinks.map((drink: string, drinkIndex: number) => (
                  <Text key={drinkIndex} style={styles.detailText}>• {drink}</Text>
                ))}
                {item.amount && (
                  <Text style={styles.amountText}>Amount: {item.amount}</Text>
                )}
              </View>
            )}
            {item.supplements && (
              <View style={styles.recommendationDetails}>
                <Text style={styles.detailLabel}>Supplements:</Text>
                {item.supplements.map((supplement: string, supplementIndex: number) => (
                  <Text key={supplementIndex} style={styles.detailText}>• {supplement}</Text>
                ))}
                {item.dosage && (
                  <Text style={styles.dosageText}>Dosage: {item.dosage}</Text>
                )}
                {item.caution && (
                  <Text style={styles.cautionText}>⚠️ {item.caution}</Text>
                )}
              </View>
            )}
            {item.advice && (
              <View style={styles.recommendationDetails}>
                <Text style={styles.detailLabel}>Advice:</Text>
                {item.advice.map((advice: string, adviceIndex: number) => (
                  <Text key={adviceIndex} style={styles.detailText}>• {advice}</Text>
                ))}
              </View>
            )}
            {item.reasoning && (
              <Text style={styles.reasoningText}>{item.reasoning}</Text>
            )}
            {item.timing && (
              <Text style={styles.timingText}>⏰ {item.timing}</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Neutralization Guide</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Personalized Recommendations</Text>
          <Text style={styles.summaryText}>
            Based on your nutrient analysis, here are targeted recommendations to help neutralize excess substances in your diet.
          </Text>
          <Text style={styles.overdosedText}>
            Over-dosed substances: {recommendations.overdosed_substances.join(', ')}
          </Text>
        </View>

        {/* Recommendations */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderRecommendationSection('🥗 Food Recommendations', recommendations.recommendations.food_recommendations || [], '🥗')}
          {renderRecommendationSection('🏃 Activity Recommendations', recommendations.recommendations.activity_recommendations || [], '🏃')}
          {renderRecommendationSection('🥤 Drink Recommendations', recommendations.recommendations.drink_recommendations || [], '🥤')}
          {renderRecommendationSection('💊 Supplement Recommendations', recommendations.recommendations.supplement_recommendations || [], '💊')}
          {renderRecommendationSection('💡 Lifestyle Advice', recommendations.recommendations.lifestyle_recommendations || [], '💡')}

          {((!recommendations.recommendations.food_recommendations || recommendations.recommendations.food_recommendations.length === 0) &&
            (!recommendations.recommendations.activity_recommendations || recommendations.recommendations.activity_recommendations.length === 0) &&
            (!recommendations.recommendations.drink_recommendations || recommendations.recommendations.drink_recommendations.length === 0) &&
            (!recommendations.recommendations.supplement_recommendations || recommendations.recommendations.supplement_recommendations.length === 0) &&
            (!recommendations.recommendations.lifestyle_recommendations || recommendations.recommendations.lifestyle_recommendations.length === 0)) && (
            <View style={styles.noRecommendations}>
              <Text style={styles.noRecommendationsText}>
                No specific recommendations available at this time.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>⚠️ Important Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            {recommendations.disclaimer}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    position: 'relative',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backButton: {
    position: 'absolute',
    left: Spacing.md,
    top: Spacing.md,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: FontSizes.medium,
    color: Colors.black,
    fontWeight: '500',
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xlarge,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  summary: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    margin: Spacing.md,
    borderRadius: BorderRadius.medium,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  summaryText: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  overdosedText: {
    fontSize: FontSizes.small,
    color: Colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionIcon: {
    fontSize: FontSizes.large,
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  recommendationItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.small,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  substanceName: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  recommendationDetails: {
    marginBottom: Spacing.xs,
  },
  detailLabel: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  detailText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    lineHeight: 18,
  },
  durationText: {
    fontSize: FontSizes.small,
    color: Colors.info,
    fontStyle: 'italic',
    marginLeft: Spacing.sm,
    marginTop: 2,
  },
  amountText: {
    fontSize: FontSizes.small,
    color: Colors.info,
    fontStyle: 'italic',
    marginLeft: Spacing.sm,
    marginTop: 2,
  },
  dosageText: {
    fontSize: FontSizes.small,
    color: Colors.warning,
    fontStyle: 'italic',
    marginLeft: Spacing.sm,
    marginTop: 2,
  },
  cautionText: {
    fontSize: FontSizes.small,
    color: Colors.error,
    fontStyle: 'italic',
    marginLeft: Spacing.sm,
    marginTop: 2,
  },
  reasoningText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  timingText: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  noRecommendations: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  noRecommendationsText: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  disclaimer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    margin: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disclaimerTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  disclaimerText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
