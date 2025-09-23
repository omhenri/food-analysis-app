import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { Colors, FontSizes } from '../constants/theme';

interface FirstTimeUserExperienceProps {
  visible: boolean;
  onComplete: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const onboardingSteps = [
  {
    title: 'Welcome to Food Analysis',
    description: 'Track your daily meals and understand what you\'re eating with AI-powered nutritional analysis.',
    icon: '🍽️',
  },
  {
    title: 'Input Your Meals',
    description: 'Simply enter the foods you eat throughout the day with meal types and portion sizes.',
    icon: '📝',
  },
  {
    title: 'AI Analysis',
    description: 'Get detailed breakdowns of ingredients and chemical substances in your food.',
    icon: '🤖',
  },
  {
    title: 'Compare & Track',
    description: 'See how your consumption compares to recommended daily intake values.',
    icon: '📊',
  },
  {
    title: 'Weekly Reports',
    description: 'Generate comprehensive weekly reports to track your nutritional patterns over time.',
    icon: '📈',
  },
];

export const FirstTimeUserExperience: React.FC<FirstTimeUserExperienceProps> = ({
  visible,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{currentStepData.icon}</Text>
            </View>

            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.description}>{currentStepData.description}</Text>

            {/* Progress Indicators */}
            <View style={styles.progressContainer}>
              {onboardingSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.previousButton,
                currentStep === 0 && styles.navButtonDisabled,
              ]}
              onPress={handlePrevious}
              disabled={currentStep === 0}
            >
              <Text
                style={[
                  styles.navButtonText,
                  styles.previousButtonText,
                  currentStep === 0 && styles.navButtonTextDisabled,
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={handleNext}
            >
              <Text style={[styles.navButtonText, styles.nextButtonText]}>
                {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 50,
    paddingBottom: 20,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: Colors.white,
    fontSize: FontSizes.medium,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: FontSizes.xxlarge,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: FontSizes.large,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 40,
    opacity: 0.9,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
    opacity: 0.3,
    marginHorizontal: 4,
  },
  progressDotActive: {
    opacity: 1,
    transform: [{ scale: 1.2 }],
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: 20,
  },
  navButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  previousButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.white,
  },
  nextButton: {
    backgroundColor: Colors.white,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  previousButtonText: {
    color: Colors.white,
  },
  nextButtonText: {
    color: Colors.primary,
  },
  navButtonTextDisabled: {
    opacity: 0.5,
  },
});