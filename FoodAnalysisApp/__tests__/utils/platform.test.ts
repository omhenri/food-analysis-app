import { Platform } from 'react-native';
import { 
  isIOS, 
  isAndroid, 
  platformStyles, 
  platformDimensions, 
  hapticFeedback 
} from '../../src/utils/platform';

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
}));

describe('Platform Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Platform Detection', () => {
    it('should correctly identify iOS platform', () => {
      (Platform as any).OS = 'ios';
      expect(isIOS).toBe(true);
      expect(isAndroid).toBe(false);
    });

    it('should correctly identify Android platform', () => {
      // Mock Platform.OS for Android
      jest.doMock('react-native', () => ({
        Platform: {
          OS: 'android',
          select: jest.fn((obj) => obj.android || obj.default),
        },
        Dimensions: {
          get: jest.fn(() => ({ width: 375, height: 812 })),
        },
      }));
      
      // Re-import to get updated values
      jest.resetModules();
      const { isIOS: newIsIOS, isAndroid: newIsAndroid } = require('../../src/utils/platform');
      expect(newIsIOS).toBe(false);
      expect(newIsAndroid).toBe(true);
    });
  });

  describe('Platform Styles', () => {
    it('should provide shadow styles for both platforms', () => {
      expect(platformStyles.shadow).toBeDefined();
      expect(platformStyles.cardShadow).toBeDefined();
      expect(platformStyles.buttonShadow).toBeDefined();
    });

    it('should provide platform-specific input styles', () => {
      expect(platformStyles.input).toBeDefined();
    });

    it('should provide platform-specific button styles', () => {
      expect(platformStyles.button).toBeDefined();
    });

    it('should provide platform-specific font family', () => {
      expect(platformStyles.fontFamily).toBeDefined();
    });
  });

  describe('Platform Dimensions', () => {
    it('should provide platform-specific dimensions', () => {
      expect(platformDimensions.headerHeight).toBeDefined();
      expect(platformDimensions.tabBarHeight).toBeDefined();
      expect(platformDimensions.statusBarHeight).toBeDefined();
    });

    it('should have numeric values for dimensions', () => {
      expect(typeof platformDimensions.headerHeight).toBe('number');
      expect(typeof platformDimensions.tabBarHeight).toBe('number');
      expect(typeof platformDimensions.statusBarHeight).toBe('number');
    });
  });

  describe('Haptic Feedback', () => {
    it('should provide haptic feedback methods', () => {
      expect(typeof hapticFeedback.light).toBe('function');
      expect(typeof hapticFeedback.medium).toBe('function');
      expect(typeof hapticFeedback.heavy).toBe('function');
    });

    it('should not throw when calling haptic feedback methods', () => {
      expect(() => hapticFeedback.light()).not.toThrow();
      expect(() => hapticFeedback.medium()).not.toThrow();
      expect(() => hapticFeedback.heavy()).not.toThrow();
    });
  });
});