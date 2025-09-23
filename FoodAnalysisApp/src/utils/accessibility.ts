import { AccessibilityInfo, Platform } from 'react-native';

// Accessibility utilities for screen readers and assistive technologies
export const accessibility = {
  // Screen reader announcements
  announce: (message: string) => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(message);
    } else if (Platform.OS === 'android') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  },

  // Check if screen reader is enabled
  isScreenReaderEnabled: async (): Promise<boolean> => {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch (error) {
      console.warn('Error checking screen reader status:', error);
      return false;
    }
  },

  // Check if reduce motion is enabled
  isReduceMotionEnabled: async (): Promise<boolean> => {
    try {
      return await AccessibilityInfo.isReduceMotionEnabled();
    } catch (error) {
      console.warn('Error checking reduce motion status:', error);
      return false;
    }
  },

  // Common accessibility props for buttons
  button: (label: string, hint?: string, disabled?: boolean) => ({
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { disabled: disabled || false },
  }),

  // Common accessibility props for text inputs
  textInput: (label: string, value?: string, hint?: string) => ({
    accessible: true,
    accessibilityRole: 'text' as const,
    accessibilityLabel: label,
    accessibilityValue: value ? { text: value } : undefined,
    accessibilityHint: hint,
  }),

  // Common accessibility props for images
  image: (label: string, decorative: boolean = false) => ({
    accessible: !decorative,
    accessibilityRole: decorative ? 'none' as const : 'image' as const,
    accessibilityLabel: decorative ? undefined : label,
  }),

  // Common accessibility props for headers
  header: (label: string, level: number = 1) => ({
    accessible: true,
    accessibilityRole: 'header' as const,
    accessibilityLabel: label,
    accessibilityLevel: level,
  }),

  // Common accessibility props for lists
  list: (itemCount: number) => ({
    accessible: true,
    accessibilityRole: 'list' as const,
    accessibilityHint: `List with ${itemCount} items`,
  }),

  // Common accessibility props for list items
  listItem: (position: number, total: number, label: string) => ({
    accessible: true,
    accessibilityRole: 'text' as const,
    accessibilityLabel: `${label}, ${position} of ${total}`,
  }),

  // Common accessibility props for progress indicators
  progressBar: (value: number, max: number, label: string) => ({
    accessible: true,
    accessibilityRole: 'progressbar' as const,
    accessibilityLabel: label,
    accessibilityValue: {
      min: 0,
      max,
      now: value,
      text: `${Math.round((value / max) * 100)}%`,
    },
  }),

  // Common accessibility props for tabs
  tab: (label: string, selected: boolean, position: number, total: number) => ({
    accessible: true,
    accessibilityRole: 'tab' as const,
    accessibilityLabel: label,
    accessibilityState: { selected },
    accessibilityHint: `Tab ${position} of ${total}`,
  }),

  // Common accessibility props for switches/toggles
  switch: (label: string, value: boolean, hint?: string) => ({
    accessible: true,
    accessibilityRole: 'switch' as const,
    accessibilityLabel: label,
    accessibilityState: { checked: value },
    accessibilityHint: hint,
  }),

  // Nutrition-specific accessibility helpers
  nutritionCard: (substance: string, amount: number, unit: string, status: string) => ({
    accessible: true,
    accessibilityRole: 'text' as const,
    accessibilityLabel: `${substance}: ${amount} ${unit}, status: ${status}`,
    accessibilityHint: 'Double tap for more details',
  }),

  // Enhanced comparison card accessibility
  enhancedComparisonCard: (
    substance: string, 
    consumed: number, 
    unit: string, 
    status: string,
    referenceValues: Array<{type: string, value: number, label: string}>
  ) => {
    const referenceText = referenceValues
      .map(ref => `${ref.label}: ${ref.value} ${unit}`)
      .join(', ');
    
    const statusDescription = {
      'deficient': 'below recommended levels',
      'optimal': 'within optimal range',
      'acceptable': 'within acceptable range',
      'excess': 'above recommended levels'
    }[status] || status;

    return {
      accessible: true,
      accessibilityRole: 'button' as const,
      accessibilityLabel: `${substance}: ${consumed} ${unit} consumed, ${statusDescription}. Reference values: ${referenceText}`,
      accessibilityHint: 'Double tap for detailed breakdown, long press for educational content',
      accessibilityActions: [
        { name: 'activate', label: 'View details' },
        { name: 'longpress', label: 'Show quick info' },
      ],
    };
  },

  // Layered progress bar accessibility
  layeredProgressBar: (
    substance: string,
    layers: Array<{value: number, percentage: number}>,
    referenceValues: Array<{type: string, value: number, label: string}>,
    unit: string
  ) => {
    const mainLayer = layers[0];
    const layerDescriptions = layers
      .map((layer, index) => 
        index === 0 
          ? `Main consumption: ${layer.value} ${unit}` 
          : `Reference layer: ${layer.value} ${unit}`
      )
      .join(', ');

    const referenceDescriptions = referenceValues
      .map(ref => `${ref.label}: ${ref.value} ${unit}`)
      .join(', ');

    return {
      accessible: true,
      accessibilityRole: 'progressbar' as const,
      accessibilityLabel: `${substance} consumption visualization`,
      accessibilityValue: {
        min: 0,
        max: Math.max(...referenceValues.map(r => r.value), mainLayer?.value || 0),
        now: mainLayer?.value || 0,
        text: `${layerDescriptions}. Reference values: ${referenceDescriptions}`,
      },
      accessibilityHint: 'Visual representation of consumption levels with multiple reference points',
    };
  },

  // Category section accessibility
  categorySection: (
    categoryName: string,
    substanceCount: number,
    isExpanded: boolean,
    deficientCount: number,
    excessCount: number,
    optimalCount: number
  ) => {
    const statusSummary = `${optimalCount} optimal, ${deficientCount} deficient, ${excessCount} excess`;
    
    return {
      accessible: true,
      accessibilityRole: 'button' as const,
      accessibilityLabel: `${categoryName} category with ${substanceCount} substances. Status: ${statusSummary}`,
      accessibilityState: { expanded: isExpanded },
      accessibilityHint: isExpanded ? 'Double tap to collapse section' : 'Double tap to expand section',
    };
  },

  // Nutrition score widget accessibility
  nutritionScoreWidget: (
    overallScore: number,
    macroScore: number,
    microScore: number,
    harmfulScore: number
  ) => ({
    accessible: true,
    accessibilityRole: 'text' as const,
    accessibilityLabel: `Overall nutrition score: ${overallScore} out of 100. Breakdown: Macronutrients ${macroScore}, Micronutrients ${microScore}, Harmful substances ${harmfulScore}`,
    accessibilityHint: 'Double tap for detailed recommendations',
  }),

  mealSection: (mealType: string, itemCount: number, expanded: boolean) => ({
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: `${mealType} section with ${itemCount} items`,
    accessibilityState: { expanded },
    accessibilityHint: expanded ? 'Double tap to collapse' : 'Double tap to expand',
  }),

  foodInput: (mealType: string, portion: string, foodName?: string) => ({
    accessible: true,
    accessibilityRole: 'text' as const,
    accessibilityLabel: `Food input for ${mealType}, portion ${portion}${foodName ? `, current food: ${foodName}` : ''}`,
    accessibilityHint: 'Enter food name',
  }),

  comparisonBar: (substance: string, consumed: number, recommended: number, unit: string) => {
    const percentage = Math.round((consumed / recommended) * 100);
    const status = percentage < 90 ? 'below recommended' : 
                  percentage > 110 ? 'above recommended' : 'within recommended range';
    
    return {
      accessible: true,
      accessibilityRole: 'progressbar' as const,
      accessibilityLabel: `${substance}: ${consumed} ${unit} consumed, ${recommended} ${unit} recommended`,
      accessibilityValue: {
        min: 0,
        max: recommended * 2, // Show up to 200% of recommended
        now: consumed,
        text: `${percentage}% of recommended, ${status}`,
      },
      accessibilityHint: 'Double tap for detailed breakdown',
    };
  },
};

// Color contrast utilities
export const colorContrast = {
  // Calculate relative luminance of a color
  getRelativeLuminance: (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Apply gamma correction
    const sRGB = [r, g, b].map(c => 
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    // Calculate relative luminance
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  },

  // Calculate contrast ratio between two colors
  getContrastRatio: (color1: string, color2: string): number => {
    const lum1 = colorContrast.getRelativeLuminance(color1);
    const lum2 = colorContrast.getRelativeLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  },

  // Check if contrast ratio meets WCAG standards
  meetsWCAGStandards: (color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
    const ratio = colorContrast.getContrastRatio(color1, color2);
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  },

  // Get accessible color variant if needed
  getAccessibleColor: (foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): string => {
    if (colorContrast.meetsWCAGStandards(foreground, background, level)) {
      return foreground;
    }

    // Try darkening or lightening the foreground color
    const bgLum = colorContrast.getRelativeLuminance(background);
    const targetRatio = level === 'AA' ? 4.5 : 7;
    
    // If background is light, darken foreground; if dark, lighten foreground
    if (bgLum > 0.5) {
      // Darken foreground more aggressively
      return colorContrast.adjustColorBrightness(foreground, -0.6);
    } else {
      // Lighten foreground more aggressively
      return colorContrast.adjustColorBrightness(foreground, 0.6);
    }
  },

  // Adjust color brightness
  adjustColorBrightness: (color: string, factor: number): string => {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + (factor * 255)));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + (factor * 255)));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + (factor * 255)));
    
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  },

  // Validate color palette for accessibility
  validateColorPalette: (colors: Record<string, string>, backgroundColor: string = '#FFFFFF') => {
    const results: Record<string, { ratio: number; meetsAA: boolean; meetsAAA: boolean }> = {};
    
    Object.entries(colors).forEach(([name, color]) => {
      const ratio = colorContrast.getContrastRatio(color, backgroundColor);
      results[name] = {
        ratio,
        meetsAA: ratio >= 4.5,
        meetsAAA: ratio >= 7,
      };
    });

    return results;
  },
};

// Accessibility testing helpers
export const accessibilityTestHelpers = {
  // Generate test IDs for automated testing
  testID: (component: string, identifier?: string) => 
    identifier ? `${component}-${identifier}` : component,

  // Validate accessibility props
  validateAccessibilityProps: (props: any) => {
    const warnings: string[] = [];
    
    if (props.accessible && !props.accessibilityLabel) {
      warnings.push('Accessible element missing accessibilityLabel');
    }
    
    if (props.accessibilityRole === 'button' && !props.accessibilityLabel) {
      warnings.push('Button missing accessibilityLabel');
    }
    
    if (props.accessibilityRole === 'image' && !props.accessibilityLabel) {
      warnings.push('Image missing accessibilityLabel');
    }
    
    return warnings;
  },

  // Validate enhanced comparison card accessibility
  validateEnhancedComparisonCard: (data: any) => {
    const warnings: string[] = [];
    
    if (!data.substance) {
      warnings.push('Enhanced comparison card missing substance name');
    }
    
    if (typeof data.consumed !== 'number') {
      warnings.push('Enhanced comparison card missing consumed value');
    }
    
    if (!data.unit) {
      warnings.push('Enhanced comparison card missing unit');
    }
    
    if (!data.status) {
      warnings.push('Enhanced comparison card missing status');
    }
    
    if (!data.referenceValues || !Array.isArray(data.referenceValues)) {
      warnings.push('Enhanced comparison card missing reference values');
    }
    
    if (!data.layers || !Array.isArray(data.layers)) {
      warnings.push('Enhanced comparison card missing consumption layers');
    }
    
    return warnings;
  },

  // Generate comprehensive accessibility description for complex visualizations
  generateVisualizationDescription: (data: {
    substance: string;
    consumed: number;
    unit: string;
    status: string;
    referenceValues: Array<{type: string, value: number, label: string}>;
    layers: Array<{value: number, percentage: number}>;
  }): string => {
    const { substance, consumed, unit, status, referenceValues, layers } = data;
    
    const statusText = {
      'deficient': 'below recommended levels',
      'optimal': 'within optimal range', 
      'acceptable': 'within acceptable range',
      'excess': 'above recommended levels'
    }[status] || status;

    const mainConsumption = `${consumed} ${unit} consumed`;
    const statusDescription = `which is ${statusText}`;
    
    const referenceText = referenceValues.length > 0 
      ? `. Reference values include: ${referenceValues.map(ref => `${ref.label} at ${ref.value} ${unit}`).join(', ')}`
      : '';
    
    const layerText = layers.length > 1 
      ? `. The visualization shows ${layers.length} consumption layers with the main layer representing your intake`
      : '';

    return `${substance}: ${mainConsumption}, ${statusDescription}${referenceText}${layerText}. Double tap for detailed breakdown, long press for educational content.`;
  },
};