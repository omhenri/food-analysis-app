import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { ComparisonData, ConsumptionStatus } from '../models/types';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

interface ComparisonCardProps {
  comparisonData: ComparisonData;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  comparisonData,
}) => {
  const getStatusColor = (status: ConsumptionStatus): string => {
    switch (status) {
      case 'under':
        return Colors.warning;
      case 'optimal':
        return Colors.success;
      case 'over':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusIcon = (status: ConsumptionStatus): string => {
    switch (status) {
      case 'under':
        return '⬇️';
      case 'optimal':
        return '✅';
      case 'over':
        return '⬆️';
      default:
        return '○';
    }
  };

  const getStatusText = (status: ConsumptionStatus): string => {
    switch (status) {
      case 'under':
        return 'Below recommended';
      case 'optimal':
        return 'Optimal range';
      case 'over':
        return 'Above recommended';
      default:
        return 'No recommendation';
    }
  };

  const formatSubstanceName = (substanceName: string): string => {
    // Special handling for Energy - display as Calories
    if (substanceName.toLowerCase().includes('energy')) {
      return 'Calories';
    }
    return substanceName;
  };

  const formatAmount = (amount: number): string => {
    // Special handling for Energy - display in calories
    if (comparisonData.substance.toLowerCase().includes('energy')) {
      return `${amount.toFixed(0)}cal`;
    }

    if (amount >= 1) {
      return `${amount.toFixed(1)}g`;
    } else if (amount >= 0.001) {
      return `${(amount * 1000).toFixed(1)}mg`;
    } else {
      return `${(amount * 1000000).toFixed(1)}μg`;
    }
  };

  const getProgressBarWidth = (): string => {
    if (comparisonData.recommended === 0) {
      return '0%';
    }
    
    // Calculate actual percentage
    const actualPercentage = (comparisonData.consumed / comparisonData.recommended) * 100;
    
    // Cap at 200% and scale to fit within 100% width of progress bar
    // 0% consumption = 0% width, 100% consumption = 50% width, 200% consumption = 100% width
    const cappedPercentage = Math.min(actualPercentage, 200);
    const scaledWidth = (cappedPercentage / 200) * 100; // Scale 0-200% to 0-100% width
    
    return `${scaledWidth}%`;
  };

  const getProgressBarColor = (): string => {
    if (comparisonData.recommended === 0) {
      return Colors.textSecondary;
    }
    
    const percentage = (comparisonData.consumed / comparisonData.recommended) * 100;
    
    // New color scheme based on percentage ranges
    if (percentage <= 50) {
      return Colors.nutrientExcellent; // Green (≤50%)
    } else if (percentage <= 80) {
      return Colors.nutrientGood; // Pale green (≤80%)
    } else if (percentage <= 110) {
      return Colors.nutrientCaution; // Orange (≤110%)
    } else if (percentage <= 140) {
      return Colors.nutrientWarning; // Burnt orange (≤140%)
    } else {
      return Colors.nutrientDanger; // Red (>140%)
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.substanceName}>{formatSubstanceName(comparisonData.substance)}</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusIcon}>{getStatusIcon(comparisonData.status)}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(comparisonData.status) }]}>
            {getStatusText(comparisonData.status)}
          </Text>
        </View>
      </View>

      {/* Amounts */}
      <View style={styles.amountsContainer}>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Consumed</Text>
          <Text style={styles.amountValue}>{formatAmount(comparisonData.consumed)}</Text>
        </View>
        
        {comparisonData.recommended > 0 && (
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Recommended</Text>
            <Text style={styles.amountValue}>{formatAmount(comparisonData.recommended)}</Text>
          </View>
        )}
        
        {comparisonData.recommended > 0 && (
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Percentage</Text>
            <Text style={[styles.amountValue, { color: getStatusColor(comparisonData.status) }]}>
              {comparisonData.percentage.toFixed(0)}%
            </Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      {comparisonData.recommended > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: getProgressBarWidth() as any, // Type assertion for width string
                  backgroundColor: getProgressBarColor(), // Dynamic color based on percentage
                }
              ]}
            />
            {/* Optimal target line at 50% (representing 100% intake) */}
            <View style={styles.targetLine} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.leftProgressLabel}>0%</Text>
            <Text style={styles.centerProgressLabel}>  100%</Text>
            <Text style={styles.rightProgressLabel}>200%</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  substanceName: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: FontSizes.small,
    fontWeight: '500',
  },
  amountsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  amountItem: {
    alignItems: 'center',
    flex: 1,
  },
  amountLabel: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressContainer: {
    marginTop: Spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.textPrimary,
    opacity: 0.6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    minWidth:30
  },
  leftProgressLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'left',
    minWidth:60
  },
  centerProgressLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    minWidth:60
  },
  rightProgressLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'right',
    minWidth:60
  },
});