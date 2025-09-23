import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { EnhancedComparisonData } from '../models/types';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

interface WeeklyEnhancedComparisonData extends EnhancedComparisonData {
  dailyBreakdown?: {
    dayNumber: number;
    value: number;
    status: 'deficient' | 'optimal' | 'acceptable' | 'excess';
  }[];
  weeklyAverage?: number;
  dailyVariation?: number;
}

interface EnhancedWeeklyComparisonCardProps {
  data: WeeklyEnhancedComparisonData;
  onTap?: (substance: string) => void;
  onLongPress?: (substance: string) => void;
  animated?: boolean;
  showDailyBreakdown?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const maxBarWidth = screenWidth - (Spacing.md * 4); // Account for padding

export const EnhancedWeeklyComparisonCard: React.FC<EnhancedWeeklyComparisonCardProps> = ({
  data,
  onTap,
  onLongPress,
  animated = true,
  showDailyBreakdown = false,
}) => {
  const [showDaily, setShowDaily] = useState(showDailyBreakdown);
  const [animatedValue] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (animated) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: data.visualConfig?.animationDuration || 800,
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(1);
    }
  }, [animated, animatedValue, data.visualConfig?.animationDuration]);

  const handlePress = () => {
    if (onTap) {
      onTap(data.substance);
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(data.substance);
    }
  };

  const toggleDailyBreakdown = () => {
    setShowDaily(!showDaily);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'optimal': return Colors.success;
      case 'acceptable': return Colors.warning;
      case 'deficient': return Colors.error;
      case 'excess': return data.category === 'harmful' ? Colors.error : Colors.warning;
      default: return Colors.textSecondary;
    }
  };

  const renderMainProgressBars = () => {
    return (
      <View style={styles.progressContainer}>
        {/* Main consumption layers */}
        {data.layers.map((layer, index) => (
          <Animated.View
            key={`layer-${index}`}
            style={[
              styles.progressBar,
              {
                width: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, (layer.width / 100) * maxBarWidth],
                }),
                height: layer.height,
                backgroundColor: layer.color,
                borderRadius: layer.borderRadius,
                position: index === 0 ? 'relative' : 'absolute',
                top: index === 0 ? 0 : 0,
                left: 0,
                zIndex: data.layers.length - index,
              },
            ]}
          />
        ))}

        {/* Reference value indicators */}
        {data.referenceValues.map((ref, index) => (
          <View
            key={`ref-${index}`}
            style={[
              styles.referenceIndicator,
              {
                left: (ref.position / 100) * maxBarWidth - 1,
                backgroundColor: ref.color,
              },
            ]}
          />
        ))}

        {/* Reference value lines */}
        {data.referenceValues.map((ref, index) => (
          <View
            key={`ref-line-${index}`}
            style={[
              styles.referenceLine,
              {
                left: (ref.position / 100) * maxBarWidth,
                backgroundColor: ref.color,
                top: -1,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderDailyBreakdownOverlay = () => {
    if (!showDaily || !data.dailyBreakdown) return null;

    const maxDailyValue = Math.max(...data.dailyBreakdown.map(d => d.value));
    
    return (
      <View style={styles.dailyBreakdownContainer}>
        <Text style={styles.dailyBreakdownTitle}>Daily Breakdown</Text>
        <View style={styles.dailyBarsContainer}>
          {data.dailyBreakdown.map((day, index) => (
            <View key={`day-${day.dayNumber}`} style={styles.dailyBarWrapper}>
              <View
                style={[
                  styles.dailyBar,
                  {
                    height: Math.max(4, (day.value / maxDailyValue) * 30),
                    backgroundColor: getStatusColor(day.status),
                  },
                ]}
              />
              <Text style={styles.dayLabel}>D{day.dayNumber}</Text>
            </View>
          ))}
        </View>
        
        {/* Weekly average line */}
        {data.weeklyAverage && (
          <View style={styles.weeklyAverageContainer}>
            <View
              style={[
                styles.weeklyAverageLine,
                {
                  width: (data.weeklyAverage / data.consumed) * maxBarWidth,
                },
              ]}
            />
            <Text style={styles.weeklyAverageLabel}>
              Weekly Avg: {data.weeklyAverage.toFixed(1)}{data.unit}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderReferenceLabels = () => {
    return (
      <View style={styles.referenceLabelsContainer}>
        {data.referenceValues.map((ref, index) => (
          <Text
            key={`ref-label-${index}`}
            style={[
              styles.referenceLabel,
              {
                color: ref.color,
                left: Math.min((ref.position / 100) * maxBarWidth, maxBarWidth - 40),
              },
            ]}
          >
            {ref.label}: {ref.value.toFixed(0)}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderLeftColor: getStatusColor(data.status) },
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.substanceName}>{data.substance}</Text>
        <View style={styles.valueContainer}>
          <Text style={styles.consumedValue}>
            {data.consumed.toFixed(1)}
          </Text>
          <Text style={styles.unitIndicator}>| {data.unit}</Text>
        </View>
      </View>

      {/* Main progress visualization */}
      {renderMainProgressBars()}

      {/* Reference labels */}
      {renderReferenceLabels()}

      {/* Status indicator */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(data.status) }]} />
        <Text style={[styles.statusText, { color: getStatusColor(data.status) }]}>
          {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
        </Text>
        
        {/* Daily breakdown toggle */}
        {data.dailyBreakdown && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={toggleDailyBreakdown}
          >
            <Text style={styles.toggleButtonText}>
              {showDaily ? '▼' : '▶'} Daily
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Daily breakdown overlay */}
      {renderDailyBreakdownOverlay()}

      {/* Weekly insights */}
      {data.dailyVariation !== undefined && (
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsText}>
            Consistency: {data.dailyVariation < 10 ? 'High' : data.dailyVariation < 25 ? 'Medium' : 'Low'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
    borderLeftWidth: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  substanceName: {
    fontSize: 12,
    fontFamily: 'Roboto',
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  consumedValue: {
    fontSize: 22,
    fontFamily: 'Roboto',
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },
  unitIndicator: {
    fontSize: 8,
    fontFamily: 'Roboto',
    fontWeight: '300',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  progressContainer: {
    height: 8,
    marginVertical: Spacing.xs,
    position: 'relative',
  },
  progressBar: {
    borderRadius: 10,
  },
  referenceIndicator: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    top: 3,
    zIndex: 10,
  },
  referenceLine: {
    position: 'absolute',
    width: 1,
    height: 2,
    top: 6,
    zIndex: 9,
  },
  referenceLabelsContainer: {
    height: 16,
    marginTop: Spacing.xs,
    position: 'relative',
  },
  referenceLabel: {
    position: 'absolute',
    fontSize: 8,
    fontFamily: 'Roboto',
    fontWeight: '400',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: FontSizes.small,
    fontWeight: '500',
    flex: 1,
  },
  toggleButton: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  toggleButtonText: {
    fontSize: FontSizes.small,
    color: Colors.primary,
    fontWeight: '500',
  },
  dailyBreakdownContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dailyBreakdownTitle: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  dailyBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 40,
    marginBottom: Spacing.xs,
  },
  dailyBarWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  dailyBar: {
    width: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 8,
    color: Colors.textSecondary,
  },
  weeklyAverageContainer: {
    marginTop: Spacing.xs,
  },
  weeklyAverageLine: {
    height: 1,
    backgroundColor: Colors.primary,
    opacity: 0.7,
  },
  weeklyAverageLabel: {
    fontSize: 8,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  insightsContainer: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  insightsText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});