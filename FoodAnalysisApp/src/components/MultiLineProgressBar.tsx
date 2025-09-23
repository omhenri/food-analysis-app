import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Colors, FontSizes, Spacing } from '../constants/theme';

interface ProgressLineData {
  label: string;
  value: number;
  color: string;
  icon?: string;
}

interface MultiLineProgressBarProps {
  lines: ProgressLineData[];
  maxValue?: number;
  unit?: string;
  showValues?: boolean;
  lineHeight?: number;
  spacing?: number;
}

// Consistent color palette for nutrition comparisons
export const NutritionColors = {
  maleRecommended: '#4A90E2', // Blue for male recommendations
  femaleRecommended: '#E24A90', // Pink for female recommendations
  userActual: '#6FF3E0', // Teal for user actuals
  background: '#F0F0F0', // Light gray background
};

export const MultiLineProgressBar: React.FC<MultiLineProgressBarProps> = ({
  lines,
  maxValue,
  unit = '',
  showValues = true,
  lineHeight = 4,
  spacing = 4,
}) => {
  // Calculate max value if not provided
  const calculatedMaxValue = maxValue || Math.max(...lines.map(line => line.value));

  const renderProgressLine = (line: ProgressLineData, index: number) => {
    const percentage = calculatedMaxValue > 0 ? (line.value / calculatedMaxValue) * 100 : 0;

    return (
      <View key={index} style={[styles.progressLineContainer, { marginBottom: spacing }]}>
        <View style={styles.progressLineBackground}>
          <View
            style={[
              styles.progressLine,
              {
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: line.color,
                height: lineHeight,
                borderRadius: lineHeight / 2,
              },
            ]}
          />
        </View>
        {showValues && (
          <Text style={[styles.lineLabel, { color: line.color }]}>
            {line.icon && `${line.icon}`}{line.value}{unit && unit}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {lines.map((line, index) => renderProgressLine(line, index))}
    </View>
  );
};

// Helper function to create standard nutrition comparison data
export const createNutritionComparisonData = (
  userValue: number,
  maleRecommended: number,
  femaleRecommended: number,
  unit: string = ''
): ProgressLineData[] => [
  {
    label: 'Male Recommended',
    value: maleRecommended,
    color: NutritionColors.maleRecommended,
    icon: '♂',
  },
  {
    label: 'User Actual',
    value: userValue,
    color: NutritionColors.userActual,
    icon: '',
  },
  {
    label: 'Female Recommended',
    value: femaleRecommended,
    color: NutritionColors.femaleRecommended,
    icon: '♀',
  },
];

// Helper function for weekly comparison (with different data structure)
export const createWeeklyComparisonData = (
  currentWeek: number,
  previousWeek: number,
  target: number,
  unit: string = ''
): ProgressLineData[] => [
  {
    label: 'Target',
    value: target,
    color: NutritionColors.maleRecommended,
    icon: '🎯',
  },
  {
    label: 'Current Week',
    value: currentWeek,
    color: NutritionColors.userActual,
    icon: '',
  },
  {
    label: 'Previous Week',
    value: previousWeek,
    color: NutritionColors.femaleRecommended,
    icon: '📊',
  },
];

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.xs,
  },
  progressLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressLineBackground: {
    flex: 1,
    height: 4,
    backgroundColor: NutritionColors.background,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  progressLine: {
    borderRadius: 2,
  },
  lineLabel: {
    fontSize: FontSizes.small,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'right',
  },
});