import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { EnhancedComparisonData } from '../models/types';
import { EducationalContentService } from '../services/EducationalContentService';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { hapticFeedback } from '../utils/platform';

interface NutrientDetailModalProps {
  visible: boolean;
  data: EnhancedComparisonData | null;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const NutrientDetailModal: React.FC<NutrientDetailModalProps> = ({
  visible,
  data,
  onClose,
}) => {
  if (!data) return null;

  const educationalContent = EducationalContentService.getEducationalContent(data.substance);

  const handleClose = () => {
    hapticFeedback.light();
    onClose();
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

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'deficient':
        return 'Below Recommended';
      case 'optimal':
        return 'Optimal Range';
      case 'acceptable':
        return 'Acceptable Level';
      case 'excess':
        return 'Above Recommended';
      default:
        return 'Unknown Status';
    }
  };

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

  const renderProgressVisualization = () => {
    const maxWidth = screenWidth - 80; // Account for modal padding
    
    return (
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Current Intake vs References</Text>
        
        {/* Visual progress bar */}
        <View style={styles.progressContainer}>
          {/* Reference lines */}
          {data.referenceValues.map((ref, index) => (
            <View
              key={`ref-${index}`}
              style={[
                styles.referenceLine,
                {
                  width: Math.min(maxWidth * (ref.position / 100), maxWidth),
                  backgroundColor: ref.color,
                }
              ]}
            />
          ))}
          
          {/* Consumption layers */}
          {data.layers.map((layer, index) => (
            <View
              key={`layer-${index}`}
              style={[
                styles.consumptionLayer,
                {
                  width: Math.min(maxWidth * (layer.percentage / 100), maxWidth),
                  height: layer.height,
                  backgroundColor: layer.color,
                  borderRadius: layer.borderRadius,
                  marginBottom: index < data.layers.length - 1 ? 1 : 0,
                }
              ]}
            />
          ))}
          
          {/* Reference indicators */}
          {data.referenceValues.map((ref, index) => (
            <View
              key={`indicator-${index}`}
              style={[
                styles.referenceIndicator,
                {
                  left: Math.min(maxWidth * (ref.position / 100), maxWidth - 4),
                  backgroundColor: ref.color,
                }
              ]}
            />
          ))}
        </View>
        
        {/* Reference values list */}
        <View style={styles.referencesList}>
          {data.referenceValues.map((ref, index) => (
            <View key={`ref-item-${index}`} style={styles.referenceItem}>
              <View style={[styles.referenceColorDot, { backgroundColor: ref.color }]} />
              <Text style={styles.referenceText}>
                {ref.label}: {formatValue(ref.value, data.unit)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderHealthImpact = () => {
    if (!educationalContent?.healthImpact) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Impact</Text>
        <Text style={styles.bodyText}>{educationalContent.healthImpact}</Text>
      </View>
    );
  };

  const renderOptimalRange = () => {
    if (!educationalContent?.optimalRange) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Optimal Range</Text>
        <Text style={styles.bodyText}>{educationalContent.optimalRange}</Text>
      </View>
    );
  };

  const renderRecommendations = () => {
    const isDeficient = data.status === 'deficient';
    const isExcess = data.status === 'excess';
    
    if (!isDeficient && !isExcess) return null;

    const recommendations = isDeficient 
      ? educationalContent?.recommendedSources 
      : educationalContent?.reductionTips;
    
    const title = isDeficient ? 'Recommended Food Sources' : 'Tips to Reduce Intake';
    
    if (!recommendations || recommendations.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {recommendations.map((item, index) => (
          <View key={index} style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderSafetyInformation = () => {
    if (!educationalContent?.safetyInformation) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Information</Text>
        <View style={styles.warningContainer}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>{educationalContent.safetyInformation}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{data.substance}</Text>
            <Text style={styles.category}>{data.category.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Status */}
          <View style={styles.statusSection}>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Current Intake</Text>
              <Text style={styles.statusValue}>{formatValue(data.consumed, data.unit)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(data.status) }]}>
                <Text style={styles.statusBadgeText}>{getStatusText(data.status)}</Text>
              </View>
            </View>
          </View>

          {/* Progress Visualization */}
          {renderProgressVisualization()}

          {/* Health Impact */}
          {renderHealthImpact()}

          {/* Optimal Range */}
          {renderOptimalRange()}

          {/* Recommendations */}
          {renderRecommendations()}

          {/* Safety Information */}
          {renderSafetyInformation()}

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  category: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  statusSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusLabel: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.small,
  },
  statusBadgeText: {
    fontSize: FontSizes.small,
    color: Colors.white,
    fontWeight: '600',
  },
  progressSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressContainer: {
    position: 'relative',
    height: 24,
    marginVertical: Spacing.md,
  },
  referenceLine: {
    position: 'absolute',
    height: 2,
    top: 11,
    borderRadius: 1,
  },
  consumptionLayer: {
    position: 'absolute',
    top: 10,
  },
  referenceIndicator: {
    position: 'absolute',
    top: 9,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  referencesList: {
    marginTop: Spacing.sm,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  referenceColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  referenceText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  bodyText: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  bullet: {
    fontSize: FontSizes.medium,
    color: Colors.primary,
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  bulletText: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3CD',
    padding: Spacing.md,
    borderRadius: BorderRadius.small,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  warningText: {
    fontSize: FontSizes.medium,
    color: '#856404',
    flex: 1,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: Spacing.xl,
  },
});