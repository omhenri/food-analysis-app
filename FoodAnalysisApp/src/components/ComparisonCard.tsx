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

  const formatAmount = (amount: number): string => {
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
    
    const percentage = Math.min((comparisonData.consumed / comparisonData.recommended) * 100, 200);
    return `${percentage}%`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.substanceName}>{comparisonData.substance}</Text>
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
                  width: getProgressBarWidth(),
                  backgroundColor: getStatusColor(comparisonData.status),
                }
              ]} 
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>0%</Text>
            <Text style={styles.progressLabel}>100%</Text>
            <Text style={styles.progressLabel}>200%</Text>
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
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
});