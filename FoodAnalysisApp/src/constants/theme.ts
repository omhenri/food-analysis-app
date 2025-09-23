import { Platform } from 'react-native';
import { platformStyles, platformDimensions } from '../utils/platform';

export const Colors = {
  // Primary Colors
  primary: '#75F5DB',
  background: '#75F5DB',
  textPrimary: '#2D3748',
  textSecondary: '#4A5568',
  white: '#FFFFFF',

  // Accent Colors
  success: '#48BB78',
  warning: '#ED8936',
  error: '#F56565',
  info: '#4299E1',

  // Component Colors
  cardBackground: '#FFFFFF',
  inputBackground: '#F7FAFC',
  buttonPrimary: '#75F5DB',
  buttonSecondary: '#E2E8F0',
  border: '#E2E8F0',

  // UI Colors
  inactive: '#595959',
  placeholder: '#DEDBDB',
  shadow: 'rgba(0, 0, 0, 0.05)',
  lightGray: '#F7FAFC',
  gray: '#A0AEC0',

  // Enhanced Comparison Colors
  enhancedPrimary: '#75F5DB', // Theme color for main consumption bars
  enhancedSecondary1: '#67C7C1', // First gradient variation
  enhancedSecondary2: '#509A9C', // Second gradient variation
  referenceBlue: '#4A78CF', // Blue for recommended values
  referencePink: '#EA92BD', // Pink for limit values
};

export const Spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
};

export const BorderRadius = {
  small: 5,
  medium: 8,
  large: 10,
  round: 20,
  pill: 45,
  circle: 9999,
};

export const FontSizes = {
  small: 12,
  medium: 14,
  large: 16,
  xlarge: 20,
  xxlarge: 24,
};

export const Shadows = {
  card: '2px 2px 5px rgba(0, 0, 0, 0.05)',
  tab: '0px -2px 4px rgba(0, 0, 0, 0.05)',
};

// Platform-specific styles and dimensions
export const PlatformStyles = platformStyles;
export const PlatformDimensions = platformDimensions;

// Typography with platform-specific font families
export const Typography = {
  h1: {
    fontSize: FontSizes.xxlarge,
    fontWeight: 'bold' as const,
    fontFamily: platformStyles.fontFamily,
  },
  h2: {
    fontSize: FontSizes.xlarge,
    fontWeight: 'bold' as const,
    fontFamily: platformStyles.fontFamily,
  },
  h3: {
    fontSize: FontSizes.large,
    fontWeight: '600' as const,
    fontFamily: platformStyles.fontFamily,
  },
  body: {
    fontSize: FontSizes.large,
    fontWeight: 'normal' as const,
    fontFamily: platformStyles.fontFamily,
  },
  caption: {
    fontSize: FontSizes.medium,
    fontWeight: 'normal' as const,
    fontFamily: platformStyles.fontFamily,
  },
  small: {
    fontSize: FontSizes.small,
    fontWeight: 'normal' as const,
    fontFamily: platformStyles.fontFamily,
  },
};