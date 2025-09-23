import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { EnhancedComparisonCard } from '../components/ComparisonCard';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { createSampleEnhancedComparisonData } from '../utils/enhancedComparisonUtils';
import { EnhancedComparisonData } from '../models/types';

interface EnhancedComparisonDemoScreenProps {
  onBackPress: () => void;
}

export const EnhancedComparisonDemoScreen: React.FC<EnhancedComparisonDemoScreenProps> = ({
  onBackPress,
}) => {
  const [sampleData] = useState<EnhancedComparisonData[]>(createSampleEnhancedComparisonData());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleSubstanceTap = (substance: string) => {
    // The enhanced comparison card now handles tap interactions internally
    // with the detailed modal, so we don't need to do anything here
    console.log(`Tapped on ${substance}`);
  };

  const handleSubstanceLongPress = (substance: string) => {
    // The enhanced comparison card now handles long press interactions internally
    // with the tooltip, so we don't need to do anything here
    console.log(`Long pressed on ${substance}`);
  };

  const getFilteredData = (): EnhancedComparisonData[] => {
    if (selectedCategory === 'all') {
      return sampleData;
    }
    return sampleData.filter(item => item.category === selectedCategory);
  };

  const getCategoryCounts = () => {
    const counts = {
      all: sampleData.length,
      calorie: sampleData.filter(item => item.category === 'calorie').length,
      macronutrient: sampleData.filter(item => item.category === 'macronutrient').length,
      micronutrient: sampleData.filter(item => item.category === 'micronutrient').length,
      harmful: sampleData.filter(item => item.category === 'harmful').length,
    };
    return counts;
  };

  const renderCategoryFilters = () => {
    const counts = getCategoryCounts();
    const categories = [
      { key: 'all', label: 'All', count: counts.all },
      { key: 'calorie', label: 'Calories', count: counts.calorie },
      { key: 'macronutrient', label: 'Macronutrients', count: counts.macronutrient },
      { key: 'micronutrient', label: 'Micronutrients', count: counts.micronutrient },
      { key: 'harmful', label: 'Harmful', count: counts.harmful },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryButton,
              selectedCategory === category.key && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category.key)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === category.key && styles.categoryButtonTextActive,
              ]}
            >
              {category.label} ({category.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const getStatusSummary = () => {
    const filteredData = getFilteredData();
    const statusCounts = {
      deficient: filteredData.filter(item => item.status === 'deficient').length,
      optimal: filteredData.filter(item => item.status === 'optimal').length,
      acceptable: filteredData.filter(item => item.status === 'acceptable').length,
      excess: filteredData.filter(item => item.status === 'excess').length,
    };

    return statusCounts;
  };

  const renderStatusSummary = () => {
    const statusCounts = getStatusSummary();
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    if (total === 0) return null;

    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Enhanced Visualization Demo</Text>
        <Text style={styles.summaryText}>
          {statusCounts.optimal} optimal, {statusCounts.deficient} deficient, {statusCounts.excess} excess
        </Text>
        <Text style={styles.summarySubtext}>
          Tap cards for details, long press for educational content
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Enhanced Comparison</Text>
        </View>

        {/* Status Summary */}
        {renderStatusSummary()}

        {/* Category Filters */}
        {renderCategoryFilters()}

        {/* Enhanced Comparison Cards */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {getFilteredData().map((data, index) => (
            <EnhancedComparisonCard
              key={`${data.substance}-${index}`}
              data={data}
              onTap={handleSubstanceTap}
              onLongPress={handleSubstanceLongPress}
              animated={true}
            />
          ))}

          {getFilteredData().length === 0 && (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>
                No substances in this category
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            💡 This demo shows layered progress bars with multiple reference values
          </Text>
          <Text style={styles.instructionsSubtext}>
            • Main bars (4px) show consumption levels
          </Text>
          <Text style={styles.instructionsSubtext}>
            • Reference lines (2px) show recommended/limit values
          </Text>
          <Text style={styles.instructionsSubtext}>
            • Circular indicators mark reference points
          </Text>
        </View>
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
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: Spacing.sm,
  },
  backButtonText: {
    fontSize: FontSizes.medium,
    color: Colors.primary,
  },
  title: {
    fontSize: FontSizes.xlarge,
    fontWeight: '600',
    color: Colors.textPrimary,
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
  categoryContainer: {
    marginBottom: Spacing.sm,
  },
  categoryContent: {
    paddingHorizontal: Spacing.xs,
  },
  categoryButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.small,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: Spacing.xs,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
  },
  categoryButtonText: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
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
  instructionsContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  instructionsText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  instructionsSubtext: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    textAlign: 'left',
    marginBottom: 2,
  },
});