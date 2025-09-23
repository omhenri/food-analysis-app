import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  GestureResponderEvent,
  AccessibilityInfo,
} from 'react-native';
import { 
  ComparisonData, 
  ConsumptionStatus, 
  EnhancedComparisonData,
  ConsumptionLayer,
  ReferenceValue 
} from '../models/types';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { hapticFeedback } from '../utils/platform';
import { NutrientDetailModal } from './NutrientDetailModal';
import { NutrientTooltip } from './NutrientTooltip';
import { 
  accessibility, 
  colorContrast, 
  accessibilityTestHelpers 
} from '../utils/accessibility';
import { 
  performance, 
  visualizationPerformance 
} from '../utils/performance';

interface ComparisonCardProps {
  comparisonData: ComparisonData;
}

interface EnhancedComparisonCardProps {
  data: EnhancedComparisonData;
  onTap?: (substance: string) => void;
  onLongPress?: (substance: string) => void;
  animated?: boolean;
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

  const getProgressBarWidth = (): number => {
    if (comparisonData.recommended === 0) {
      return 0;
    }
    
    const percentage = Math.min((comparisonData.consumed / comparisonData.recommended) * 100, 200);
    return percentage;
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
                  width: `${getProgressBarWidth()}%`,
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

// Enhanced ComparisonCard with layered progress bars and interactive features
export const EnhancedComparisonCard: React.FC<EnhancedComparisonCardProps> = ({
  data,
  onTap,
  onLongPress,
  animated = true,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  // Check accessibility settings
  useEffect(() => {
    const checkAccessibilitySettings = async () => {
      const screenReaderEnabled = await accessibility.isScreenReaderEnabled();
      const reduceMotion = await accessibility.isReduceMotionEnabled();
      setIsScreenReaderEnabled(screenReaderEnabled);
      setReduceMotionEnabled(reduceMotion);
    };

    checkAccessibilitySettings();
  }, []);

  // Memoized accessibility props
  const accessibilityProps = useMemo(() => 
    accessibility.enhancedComparisonCard(
      data.substance,
      data.consumed,
      data.unit,
      data.status,
      data.referenceValues
    ), [data.substance, data.consumed, data.unit, data.status, data.referenceValues]);

  // Memoized progress bar accessibility props
  const progressBarAccessibilityProps = useMemo(() =>
    accessibility.layeredProgressBar(
      data.substance,
      data.layers,
      data.referenceValues,
      data.unit
    ), [data.substance, data.layers, data.referenceValues, data.unit]);

  // Performance-optimized animation setup
  useEffect(() => {
    const shouldAnimate = animated && !reduceMotionEnabled;
    const animationConfig = visualizationPerformance.optimizeProgressBarRendering.getAnimationConfig(1);
    
    if (shouldAnimate) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: animationConfig.duration,
        useNativeDriver: animationConfig.useNativeDriver,
      }).start();
    } else {
      animatedValue.setValue(1);
    }
  }, [animated, reduceMotionEnabled, animatedValue]);

  const handleTap = useCallback((event: GestureResponderEvent) => {
    hapticFeedback.light();
    
    // Announce action for screen readers
    if (isScreenReaderEnabled) {
      accessibility.announce(`Opening detailed view for ${data.substance}`);
    }
    
    // Animate tap feedback only if motion is not reduced
    if (!reduceMotionEnabled) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Show detailed modal
    setShowDetailModal(true);
    
    if (onTap) {
      onTap(data.substance);
    }
  }, [data.substance, isScreenReaderEnabled, reduceMotionEnabled, onTap, scaleAnim]);

  const handleLongPress = useCallback((event: GestureResponderEvent) => {
    hapticFeedback.medium();
    
    // Announce action for screen readers
    if (isScreenReaderEnabled) {
      accessibility.announce(`Showing quick information for ${data.substance}`);
    }
    
    // Get touch position for tooltip placement
    const { pageX, pageY } = event.nativeEvent;
    setTouchPosition({ x: pageX, y: pageY });
    setShowTooltip(true);
    
    if (onLongPress) {
      onLongPress(data.substance);
    }
  }, [data.substance, isScreenReaderEnabled, onLongPress]);

  const handleCloseTooltip = useCallback(() => {
    setShowTooltip(false);
    if (isScreenReaderEnabled) {
      accessibility.announce('Quick information closed');
    }
  }, [isScreenReaderEnabled]);

  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false);
    if (isScreenReaderEnabled) {
      accessibility.announce('Detailed view closed');
    }
  }, [isScreenReaderEnabled]);

  // Memoized formatting functions for performance
  const formatValue = useMemo(() => 
    performance.memoize((value: number, unit: string): string => {
      if (unit === 'cal') {
        return value.toFixed(0);
      } else if (unit === 'g') {
        return value >= 1 ? value.toFixed(1) : (value * 1000).toFixed(0);
      } else if (unit === 'mg') {
        return value.toFixed(1);
      } else if (unit === 'μg') {
        return value.toFixed(1);
      }
      return value.toFixed(1);
    }), []);

  const getDisplayUnit = useMemo(() =>
    performance.memoize((value: number, unit: string): string => {
      if (unit === 'g' && value < 1) {
        return 'mg';
      }
      return unit;
    }), []);

  // Memoized and performance-optimized progress bar rendering
  const renderLayeredProgressBars = useMemo(() => {
    const maxWidth = data.visualConfig.maxBarWidth;
    
    // Pre-calculate widths for performance
    const layerWidths = visualizationPerformance.calculations.calculateLayerWidths(
      data.layers, 
      maxWidth
    );
    
    return (
      <View 
        style={enhancedStyles.progressContainer}
        {...progressBarAccessibilityProps}
      >
        {/* Reference lines (background) */}
        {data.referenceValues.map((ref, index) => {
          const refColor = colorContrast.getAccessibleColor(ref.color, Colors.white);
          return (
            <View
              key={`ref-${index}`}
              style={[
                enhancedStyles.referenceLine,
                {
                  width: Math.min(maxWidth * (ref.position / 100), maxWidth),
                  backgroundColor: refColor,
                }
              ]}
              accessible={false} // Hide from screen readers as parent has description
            />
          );
        })}
        
        {/* Main consumption layers */}
        {data.layers.map((layer, index) => {
          const layerColor = colorContrast.getAccessibleColor(layer.color, Colors.white);
          return (
            <Animated.View
              key={`layer-${index}`}
              style={[
                enhancedStyles.consumptionLayer,
                {
                  width: reduceMotionEnabled 
                    ? layerWidths[index]
                    : animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, layerWidths[index]],
                      }),
                  height: layer.height,
                  backgroundColor: layerColor,
                  borderRadius: layer.borderRadius,
                  marginBottom: index < data.layers.length - 1 ? 1 : 0,
                }
              ]}
              accessible={false} // Hide from screen readers as parent has description
            />
          );
        })}
        
        {/* Reference indicators */}
        {data.referenceValues.map((ref, index) => {
          const indicatorColor = colorContrast.getAccessibleColor(ref.color, Colors.white);
          return (
            <View
              key={`indicator-${index}`}
              style={[
                enhancedStyles.referenceIndicator,
                {
                  left: Math.min(maxWidth * (ref.position / 100), maxWidth - data.visualConfig.indicatorSize),
                  backgroundColor: indicatorColor,
                  width: data.visualConfig.indicatorSize,
                  height: data.visualConfig.indicatorSize,
                  borderRadius: data.visualConfig.indicatorSize / 2,
                }
              ]}
              accessible={false} // Hide from screen readers as parent has description
            />
          );
        })}
      </View>
    );
  }, [
    data.visualConfig.maxBarWidth,
    data.layers,
    data.referenceValues,
    data.visualConfig.indicatorSize,
    progressBarAccessibilityProps,
    animatedValue,
    reduceMotionEnabled
  ]);

  // Memoized reference labels with accessibility
  const renderReferenceLabels = useMemo(() => {
    return (
      <View style={enhancedStyles.referenceLabelsContainer}>
        {data.referenceValues.map((ref, index) => {
          const labelColor = colorContrast.getAccessibleColor(ref.color, Colors.white);
          const formattedValue = formatValue(ref.value, data.unit);
          const displayUnit = getDisplayUnit(ref.value, data.unit);
          
          return (
            <Text
              key={`label-${index}`}
              style={[
                enhancedStyles.referenceLabel,
                { color: labelColor }
              ]}
              accessible={isScreenReaderEnabled}
              accessibilityLabel={isScreenReaderEnabled 
                ? `${ref.label}: ${formattedValue} ${displayUnit}` 
                : undefined
              }
            >
              {ref.label}: {formattedValue}{displayUnit}
            </Text>
          );
        })}
      </View>
    );
  }, [data.referenceValues, data.unit, formatValue, getDisplayUnit, isScreenReaderEnabled]);

  // Memoized formatted values for performance
  const formattedConsumptionValue = useMemo(() => 
    formatValue(data.consumed, data.unit), [data.consumed, data.unit, formatValue]);
  
  const displayUnit = useMemo(() => 
    getDisplayUnit(data.consumed, data.unit), [data.consumed, data.unit, getDisplayUnit]);

  return (
    <>
      <Animated.View style={[
        enhancedStyles.container, 
        { transform: reduceMotionEnabled ? [] : [{ scale: scaleAnim }] }
      ]}>
        <TouchableOpacity
          style={enhancedStyles.touchable}
          onPress={handleTap}
          onLongPress={handleLongPress}
          activeOpacity={1}
          delayLongPress={500}
          testID={accessibilityTestHelpers.testID('enhanced-comparison-card', data.substance)}
          {...accessibilityProps}
        >
          {/* Header with substance name and consumption value */}
          <View style={enhancedStyles.header}>
            <Text 
              style={enhancedStyles.substanceName}
              accessible={false} // Included in parent accessibility label
            >
              {data.substance}
            </Text>
            <View style={enhancedStyles.valueContainer}>
              <Text 
                style={enhancedStyles.consumptionValue}
                accessible={false} // Included in parent accessibility label
              >
                {formattedConsumptionValue}
              </Text>
              <Text 
                style={enhancedStyles.unitIndicator}
                accessible={false} // Included in parent accessibility label
              >
                | {displayUnit}
              </Text>
            </View>
          </View>

          {/* Layered progress bars */}
          {renderLayeredProgressBars}

          {/* Reference labels */}
          {renderReferenceLabels}

          {/* Interactive hint - hidden from screen readers */}
          {!isScreenReaderEnabled && (
            <View style={enhancedStyles.interactiveHint}>
              <Text style={enhancedStyles.hintText}>
                Tap for details • Long press for quick info
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Detail Modal */}
      <NutrientDetailModal
        visible={showDetailModal}
        data={data}
        onClose={handleCloseModal}
      />

      {/* Tooltip */}
      <NutrientTooltip
        visible={showTooltip}
        data={data}
        position={touchPosition}
        onClose={handleCloseTooltip}
      />
    </>
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

const enhancedStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  touchable: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  substanceName: {
    fontSize: 12,
    fontWeight: 'normal',
    color: Colors.textPrimary,
    flex: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  consumptionValue: {
    fontSize: 22,
    fontWeight: 'normal',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  unitIndicator: {
    fontSize: 8,
    fontWeight: '300',
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  progressContainer: {
    position: 'relative',
    height: 20,
    marginVertical: Spacing.xs,
  },
  referenceLine: {
    position: 'absolute',
    height: 2,
    top: 9,
    borderRadius: 1,
  },
  consumptionLayer: {
    position: 'absolute',
    top: 8,
  },
  referenceIndicator: {
    position: 'absolute',
    top: 7,
    marginLeft: -1,
  },
  referenceLabelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
  },
  referenceLabel: {
    fontSize: 8,
    marginRight: Spacing.xs,
    marginBottom: 2,
  },
  interactiveHint: {
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});