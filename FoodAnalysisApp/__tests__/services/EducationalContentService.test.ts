import { EducationalContentService } from '../../src/services/EducationalContentService';

describe('EducationalContentService', () => {
  describe('getEducationalContent', () => {
    it('should return educational content for known substances', () => {
      const vitaminCContent = EducationalContentService.getEducationalContent('Vitamin C');
      
      expect(vitaminCContent).toBeTruthy();
      expect(vitaminCContent?.healthImpact).toContain('antioxidant');
      expect(vitaminCContent?.recommendedSources).toContain('Citrus fruits');
      expect(vitaminCContent?.optimalRange).toContain('75-90 mg per day');
    });

    it('should return null for unknown substances', () => {
      const unknownContent = EducationalContentService.getEducationalContent('Unknown Substance');
      
      expect(unknownContent).toBeNull();
    });

    it('should return content for macronutrients', () => {
      const proteinContent = EducationalContentService.getEducationalContent('Protein');
      
      expect(proteinContent).toBeTruthy();
      expect(proteinContent?.healthImpact).toContain('muscle building');
      expect(proteinContent?.recommendedSources).toContain('Lean meats');
    });

    it('should return content for harmful substances', () => {
      const sodiumContent = EducationalContentService.getEducationalContent('Sodium');
      
      expect(sodiumContent).toBeTruthy();
      expect(sodiumContent?.healthImpact).toContain('blood pressure');
      expect(sodiumContent?.reductionTips).toContain('Cook at home more often');
      expect(sodiumContent?.safetyInformation).toBeTruthy();
    });
  });

  describe('getAllSubstances', () => {
    it('should return a list of all available substances', () => {
      const substances = EducationalContentService.getAllSubstances();
      
      expect(substances).toBeInstanceOf(Array);
      expect(substances.length).toBeGreaterThan(0);
      expect(substances).toContain('Vitamin C');
      expect(substances).toContain('Protein');
      expect(substances).toContain('Sodium');
    });
  });

  describe('getDeficiencyRecommendations', () => {
    it('should return food sources for deficient nutrients', () => {
      const ironSources = EducationalContentService.getDeficiencyRecommendations('Iron');
      
      expect(ironSources).toBeInstanceOf(Array);
      expect(ironSources.length).toBeGreaterThan(0);
      expect(ironSources).toContain('Red meat');
    });

    it('should return empty array for unknown substances', () => {
      const unknownSources = EducationalContentService.getDeficiencyRecommendations('Unknown');
      
      expect(unknownSources).toEqual([]);
    });
  });

  describe('getExcessReductionTips', () => {
    it('should return reduction tips for excess nutrients', () => {
      const sodiumTips = EducationalContentService.getExcessReductionTips('Sodium');
      
      expect(sodiumTips).toBeInstanceOf(Array);
      expect(sodiumTips.length).toBeGreaterThan(0);
      expect(sodiumTips).toContain('Cook at home more often');
    });

    it('should return empty array for unknown substances', () => {
      const unknownTips = EducationalContentService.getExcessReductionTips('Unknown');
      
      expect(unknownTips).toEqual([]);
    });
  });

  describe('getHealthImpact', () => {
    it('should return health impact for known substances', () => {
      const calciumImpact = EducationalContentService.getHealthImpact('Calcium');
      
      expect(calciumImpact).toBeTruthy();
      expect(calciumImpact).toContain('bone');
    });

    it('should return default message for unknown substances', () => {
      const unknownImpact = EducationalContentService.getHealthImpact('Unknown');
      
      expect(unknownImpact).toBe('No information available for this substance.');
    });
  });

  describe('getSafetyInformation', () => {
    it('should return safety information for substances that have it', () => {
      const ironSafety = EducationalContentService.getSafetyInformation('Iron');
      
      expect(ironSafety).toBeTruthy();
      expect(ironSafety).toContain('toxic');
    });

    it('should return undefined for substances without safety information', () => {
      const vitaminCSafety = EducationalContentService.getSafetyInformation('Vitamin C');
      
      expect(vitaminCSafety).toBeUndefined();
    });
  });

  describe('getOptimalRange', () => {
    it('should return optimal range for substances that have it', () => {
      const proteinRange = EducationalContentService.getOptimalRange('Protein');
      
      expect(proteinRange).toBeTruthy();
      expect(proteinRange).toContain('46-56g per day');
    });

    it('should return undefined for substances without optimal range', () => {
      const unknownRange = EducationalContentService.getOptimalRange('Unknown');
      
      expect(unknownRange).toBeUndefined();
    });
  });

  describe('Content Quality', () => {
    it('should have comprehensive content for major nutrients', () => {
      const majorNutrients = ['Calories', 'Protein', 'Fat', 'Carbohydrates', 'Vitamin C', 'Iron', 'Calcium'];
      
      majorNutrients.forEach(nutrient => {
        const content = EducationalContentService.getEducationalContent(nutrient);
        expect(content).toBeTruthy();
        expect(content?.healthImpact).toBeTruthy();
        expect(content?.healthImpact.length).toBeGreaterThan(20);
      });
    });

    it('should have reduction tips for harmful substances', () => {
      const harmfulSubstances = ['Sodium', 'Saturated Fat', 'Trans Fat', 'Added Sugar'];
      
      harmfulSubstances.forEach(substance => {
        const content = EducationalContentService.getEducationalContent(substance);
        expect(content).toBeTruthy();
        expect(content?.reductionTips).toBeTruthy();
        expect(content?.reductionTips?.length).toBeGreaterThan(0);
      });
    });

    it('should have food sources for beneficial nutrients', () => {
      const beneficialNutrients = ['Protein', 'Vitamin C', 'Iron', 'Calcium', 'Fiber'];
      
      beneficialNutrients.forEach(nutrient => {
        const content = EducationalContentService.getEducationalContent(nutrient);
        expect(content).toBeTruthy();
        expect(content?.recommendedSources).toBeTruthy();
        expect(content?.recommendedSources?.length).toBeGreaterThan(0);
      });
    });
  });
});