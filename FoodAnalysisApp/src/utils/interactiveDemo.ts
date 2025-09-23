import { EducationalContentService } from '../services/EducationalContentService';
import { hapticFeedback } from './platform';
import { EnhancedComparisonData } from '../models/types';

/**
 * Demo utility to showcase interactive comparison features
 * This demonstrates how the tap and long press interactions work
 */
export class InteractiveComparisonDemo {
  /**
   * Simulate a tap interaction on a comparison card
   */
  static simulateTapInteraction(substance: string): {
    hapticTriggered: boolean;
    educationalContent: any;
    recommendations: string[];
    safetyInfo?: string;
  } {
    // Trigger haptic feedback
    hapticFeedback.light();
    
    // Get educational content for detailed modal
    const educationalContent = EducationalContentService.getEducationalContent(substance);
    
    // Get specific recommendations based on status
    const recommendations = EducationalContentService.getDeficiencyRecommendations(substance);
    
    // Get safety information if available
    const safetyInfo = EducationalContentService.getSafetyInformation(substance);
    
    return {
      hapticTriggered: true,
      educationalContent,
      recommendations,
      safetyInfo,
    };
  }

  /**
   * Simulate a long press interaction on a comparison card
   */
  static simulateLongPressInteraction(substance: string): {
    hapticTriggered: boolean;
    quickInfo: string;
    quickTips: string[];
    optimalRange?: string;
  } {
    // Trigger medium haptic feedback
    hapticFeedback.medium();
    
    // Get quick health impact for tooltip
    const quickInfo = EducationalContentService.getHealthImpact(substance);
    
    // Get quick tips (first 3 recommendations)
    const allRecommendations = EducationalContentService.getDeficiencyRecommendations(substance);
    const quickTips = allRecommendations.slice(0, 3);
    
    // Get optimal range if available
    const optimalRange = EducationalContentService.getOptimalRange(substance);
    
    return {
      hapticTriggered: true,
      quickInfo,
      quickTips,
      optimalRange,
    };
  }

  /**
   * Get interactive features summary for a substance
   */
  static getInteractiveFeaturesSummary(substance: string): {
    hasEducationalContent: boolean;
    hasRecommendations: boolean;
    hasReductionTips: boolean;
    hasSafetyInfo: boolean;
    hasOptimalRange: boolean;
    interactionTypes: string[];
  } {
    const content = EducationalContentService.getEducationalContent(substance);
    const recommendations = EducationalContentService.getDeficiencyRecommendations(substance);
    const reductionTips = EducationalContentService.getExcessReductionTips(substance);
    const safetyInfo = EducationalContentService.getSafetyInformation(substance);
    const optimalRange = EducationalContentService.getOptimalRange(substance);

    const interactionTypes = [];
    if (content?.healthImpact) interactionTypes.push('Detailed Health Impact');
    if (recommendations.length > 0) interactionTypes.push('Food Source Recommendations');
    if (reductionTips.length > 0) interactionTypes.push('Reduction Tips');
    if (safetyInfo) interactionTypes.push('Safety Information');
    if (optimalRange) interactionTypes.push('Optimal Range Guidance');

    return {
      hasEducationalContent: !!content,
      hasRecommendations: recommendations.length > 0,
      hasReductionTips: reductionTips.length > 0,
      hasSafetyInfo: !!safetyInfo,
      hasOptimalRange: !!optimalRange,
      interactionTypes,
    };
  }

  /**
   * Demo the complete interactive experience for different nutrient statuses
   */
  static demoCompleteExperience(): {
    deficientNutrient: any;
    excessNutrient: any;
    optimalNutrient: any;
  } {
    // Demo deficient nutrient (Iron)
    const deficientDemo = {
      substance: 'Iron',
      status: 'deficient',
      tapInteraction: this.simulateTapInteraction('Iron'),
      longPressInteraction: this.simulateLongPressInteraction('Iron'),
      features: this.getInteractiveFeaturesSummary('Iron'),
    };

    // Demo excess nutrient (Sodium)
    const excessDemo = {
      substance: 'Sodium',
      status: 'excess',
      tapInteraction: this.simulateTapInteraction('Sodium'),
      longPressInteraction: this.simulateLongPressInteraction('Sodium'),
      features: this.getInteractiveFeaturesSummary('Sodium'),
    };

    // Demo optimal nutrient (Protein)
    const optimalDemo = {
      substance: 'Protein',
      status: 'optimal',
      tapInteraction: this.simulateTapInteraction('Protein'),
      longPressInteraction: this.simulateLongPressInteraction('Protein'),
      features: this.getInteractiveFeaturesSummary('Protein'),
    };

    return {
      deficientNutrient: deficientDemo,
      excessNutrient: excessDemo,
      optimalNutrient: optimalDemo,
    };
  }

  /**
   * Get all available substances with interactive features
   */
  static getAvailableInteractiveSubstances(): string[] {
    return EducationalContentService.getAllSubstances();
  }

  /**
   * Validate that a substance has sufficient interactive content
   */
  static validateInteractiveContent(substance: string): {
    isValid: boolean;
    missingFeatures: string[];
    score: number;
  } {
    const content = EducationalContentService.getEducationalContent(substance);
    const missingFeatures = [];
    let score = 0;

    if (!content) {
      missingFeatures.push('Educational Content');
    } else {
      if (!content.healthImpact || content.healthImpact.length < 20) {
        missingFeatures.push('Comprehensive Health Impact');
      } else {
        score += 25;
      }

      if (!content.recommendedSources || content.recommendedSources.length < 3) {
        missingFeatures.push('Sufficient Food Sources');
      } else {
        score += 25;
      }

      if (!content.reductionTips || content.reductionTips.length < 2) {
        missingFeatures.push('Reduction Tips');
      } else {
        score += 25;
      }

      if (!content.optimalRange) {
        missingFeatures.push('Optimal Range Information');
      } else {
        score += 25;
      }
    }

    return {
      isValid: missingFeatures.length === 0,
      missingFeatures,
      score,
    };
  }
}

// Export demo functions for easy testing
export const demoTapInteraction = InteractiveComparisonDemo.simulateTapInteraction;
export const demoLongPressInteraction = InteractiveComparisonDemo.simulateLongPressInteraction;
export const demoCompleteExperience = InteractiveComparisonDemo.demoCompleteExperience;