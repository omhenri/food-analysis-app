import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { EnhancedComparisonData } from '../models/types';
import { EducationalContentService } from '../services/EducationalContentService';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

interface NutrientTooltipProps {
  visible: boolean;
  data: EnhancedComparisonData | null;
  position: { x: number; y: number };
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TOOLTIP_WIDTH = 280;
const TOOLTIP_MAX_HEIGHT = 200;

export const NutrientTooltip: React.FC<NutrientTooltipProps> = ({
  visible,
  data,
  position,
  onClose,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  if (!visible || !data) return null;

  const educationalContent = EducationalContentService.getEducationalContent(data.substance);

  // Calculate tooltip position to keep it on screen
  const calculatePosition = () => {
    let x = position.x - TOOLTIP_WIDTH / 2;
    let y = position.y - TOOLTIP_MAX_HEIGHT - 20; // Position above the touch point

    // Adjust horizontal position to stay on screen
    if (x < 10) {
      x = 10;
    } else if (x + TOOLTIP_WIDTH > screenWidth - 10) {
      x = screenWidth - TOOLTIP_WIDTH - 10;
    }

    // Adjust vertical position to stay on screen
    if (y < 50) {
      y = position.y + 20; // Position below the touch point
    }

    return { x, y };
  };

  const tooltipPosition = calculatePosition();

  const formatValue = (value: number, unit: string): string => {
    if (unit === 'cal') {
      return `${value.toFixed(0)} ${unit}`;
    } else if (unit === 'g') {
      return value >= 1 ? `${value.toFixed(1)} g` : `${(value * 1000).toFixed(0)} mg`;
    } else if (unit === 'mg') {
      return `${value.toFixed(1)} mg`;
    } else if (unit === 'μg') {
      return `${value.toFixed(1)} μg`;
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'deficient':
        return Colors.error;
      case 'optimal':
        return Colors.success;
      case 'acceptable':
        return Colors.warning;
      case 'excess':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const getQuickTip = (): string => {
    if (data.status === 'deficient' && educationalContent?.recommendedSources) {
      const sources = educationalContent.recommendedSources.slice(0, 3);
      return `Try: ${sources.join(', ')}`;
    } else if (data.status === 'excess' && educationalContent?.reductionTips) {
      return educationalContent.reductionTips[0] || 'Consider reducing intake';
    } else if (educationalContent?.optimalRange) {
      return `Optimal: ${educationalContent.optimalRange}`;
    }
    return 'Tap for more details';
  };

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.tooltip,
            {
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Arrow pointing to the touch point */}
          <View
            style={[
              styles.arrow,
              {
                left: position.x - tooltipPosition.x - 6,
                top: tooltipPosition.y < position.y ? -6 : styles.tooltip.maxHeight,
                transform: tooltipPosition.y < position.y 
                  ? [{ rotate: '180deg' }] 
                  : [{ rotate: '0deg' }],
              },
            ]}
          />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{data.substance}</Text>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(data.status) }]} />
          </View>

          {/* Current value */}
          <View style={styles.valueContainer}>
            <Text style={styles.valueLabel}>Current intake:</Text>
            <Text style={styles.value}>{formatValue(data.consumed, data.unit)}</Text>
          </View>

          {/* Quick reference values */}
          {data.referenceValues.length > 0 && (
            <View style={styles.referencesContainer}>
              {data.referenceValues.slice(0, 2).map((ref, index) => (
                <View key={index} style={styles.referenceItem}>
                  <View style={[styles.referenceDot, { backgroundColor: ref.color }]} />
                  <Text style={styles.referenceText}>
                    {ref.label}: {formatValue(ref.value, data.unit)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick tip */}
          <View style={styles.tipContainer}>
            <Text style={styles.tipText}>{getQuickTip()}</Text>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>Tap for detailed breakdown</Text>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    maxHeight: TOOLTIP_MAX_HEIGHT,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  arrow: {
    position: 'absolute',
    width: 12,
    height: 6,
    backgroundColor: Colors.white,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: Colors.border,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.small,
    paddingHorizontal: Spacing.sm,
  },
  valueLabel: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  referencesContainer: {
    marginBottom: Spacing.sm,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  referenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  referenceText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  tipContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.small,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  tipText: {
    fontSize: FontSizes.small,
    color: '#0369A1',
    fontStyle: 'italic',
  },
  footer: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});