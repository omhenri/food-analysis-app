import { Platform, Dimensions } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Platform-specific styling utilities
export const platformStyles = {
  // Shadow styles
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
    },
    android: {
      elevation: 5,
    },
  }),

  // Card shadow
  cardShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.08,
      shadowRadius: 2.22,
    },
    android: {
      elevation: 3,
    },
  }),

  // Button shadow
  buttonShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.12,
      shadowRadius: 1.41,
    },
    android: {
      elevation: 2,
    },
  }),

  // Safe area padding
  safeAreaPadding: Platform.select({
    ios: {
      paddingTop: 44, // Status bar height on iOS
    },
    android: {
      paddingTop: 24, // Status bar height on Android
    },
  }),

  // Font family
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
  }),

  // Input styles
  input: Platform.select({
    ios: {
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 8,
    },
    android: {
      borderBottomWidth: 2,
      borderBottomColor: '#E2E8F0',
      borderRadius: 0,
    },
  }),

  // Button styles
  button: Platform.select({
    ios: {
      borderRadius: 8,
      paddingVertical: 12,
    },
    android: {
      borderRadius: 4,
      paddingVertical: 14,
    },
  }),
};

// Platform-specific dimensions
export const platformDimensions = {
  headerHeight: Platform.select({
    ios: 44,
    android: 56,
  }),
  tabBarHeight: Platform.select({
    ios: 83,
    android: 75,
  }),
  statusBarHeight: Platform.select({
    ios: 44,
    android: 24,
  }),
};

// Performance optimization utilities
export const shouldUseNativeDriver = Platform.select({
  ios: true,
  android: true,
  default: false,
});

// Haptic feedback utility
export const hapticFeedback = {
  light: () => {
    if (Platform.OS === 'ios') {
      // iOS haptic feedback implementation
      try {
        const { HapticFeedback } = require('react-native');
        if (HapticFeedback && HapticFeedback.impact) {
          HapticFeedback.impact(HapticFeedback.ImpactFeedbackStyle.Light);
        }
      } catch (error) {
        // Fallback for development/testing
        console.log('Light haptic feedback');
      }
    } else if (Platform.OS === 'android') {
      // Android vibration fallback
      try {
        const { Vibration } = require('react-native');
        Vibration.vibrate(50);
      } catch (error) {
        console.log('Light haptic feedback (Android)');
      }
    }
  },
  medium: () => {
    if (Platform.OS === 'ios') {
      try {
        const { HapticFeedback } = require('react-native');
        if (HapticFeedback && HapticFeedback.impact) {
          HapticFeedback.impact(HapticFeedback.ImpactFeedbackStyle.Medium);
        }
      } catch (error) {
        console.log('Medium haptic feedback');
      }
    } else if (Platform.OS === 'android') {
      try {
        const { Vibration } = require('react-native');
        Vibration.vibrate(100);
      } catch (error) {
        console.log('Medium haptic feedback (Android)');
      }
    }
  },
  heavy: () => {
    if (Platform.OS === 'ios') {
      try {
        const { HapticFeedback } = require('react-native');
        if (HapticFeedback && HapticFeedback.impact) {
          HapticFeedback.impact(HapticFeedback.ImpactFeedbackStyle.Heavy);
        }
      } catch (error) {
        console.log('Heavy haptic feedback');
      }
    } else if (Platform.OS === 'android') {
      try {
        const { Vibration } = require('react-native');
        Vibration.vibrate(200);
      } catch (error) {
        console.log('Heavy haptic feedback (Android)');
      }
    }
  },
  selection: () => {
    if (Platform.OS === 'ios') {
      try {
        const { HapticFeedback } = require('react-native');
        if (HapticFeedback && HapticFeedback.selection) {
          HapticFeedback.selection();
        }
      } catch (error) {
        console.log('Selection haptic feedback');
      }
    } else if (Platform.OS === 'android') {
      try {
        const { Vibration } = require('react-native');
        Vibration.vibrate(25);
      } catch (error) {
        console.log('Selection haptic feedback (Android)');
      }
    }
  },
};