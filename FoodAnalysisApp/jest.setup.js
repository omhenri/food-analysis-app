import 'react-native-gesture-handler/jestSetup';

// Mock react-native-sqlite-storage
jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    executeSql: jest.fn(),
  })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock react-native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  // Mock TurboModuleRegistry to prevent DevMenu errors
  const mockTurboModuleRegistry = {
    getEnforcing: jest.fn(() => ({})),
    get: jest.fn(() => ({})),
  };
  
  return {
    ...RN,
    TurboModuleRegistry: mockTurboModuleRegistry,
    Platform: {
      ...RN.Platform,
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
    },
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    },
    InteractionManager: {
      runAfterInteractions: jest.fn((callback) => callback()),
    },
    LayoutAnimation: {
      configureNext: jest.fn(),
      Types: {
        easeInEaseOut: 'easeInEaseOut',
      },
      Properties: {
        opacity: 'opacity',
      },
    },
    Animated: {
      ...RN.Animated,
      timing: jest.fn(() => ({
        start: jest.fn(),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn(),
      })),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        interpolate: jest.fn(() => 0),
      })),
    },
  };
});

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.mockFoodItem = {
  id: '1',
  name: 'Apple',
  mealType: 'snack',
  portion: '1/1',
};

global.mockAnalysisResult = {
  foodId: '1',
  ingredients: ['apple', 'water'],
  chemicalSubstances: [
    {
      name: 'Vitamin C',
      category: 'good',
      amount: 10,
      mealType: 'snack',
    },
  ],
};