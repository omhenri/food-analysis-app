import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { FoodItem } from '../models/types';
import { FoodInputRow } from '../components/FoodInputRow';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { validateFoodItems, generateFoodId } from '../utils/validation';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useFormValidation } from '../hooks/useFormValidation';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { ValidationError } from '../utils/errorHandler';

interface FoodInputScreenProps {
  onAnalyze: (foods: FoodItem[]) => void;
}

export const FoodInputScreen: React.FC<FoodInputScreenProps> = ({
  onAnalyze,
}) => {
  const { error, isLoading, clearError, executeWithErrorHandling } = useErrorHandler();
  
  const [foods, setFoods] = useState<FoodItem[]>([
    {
      id: generateFoodId(),
      name: '',
      mealType: 'breakfast',
      portion: '1/1',
    },
  ]);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleFoodChange = (index: number, updatedFood: FoodItem) => {
    const newFoods = [...foods];
    newFoods[index] = updatedFood;
    setFoods(newFoods);
  };

  const handleAddFood = () => {
    const newFood: FoodItem = {
      id: generateFoodId(),
      name: '',
      mealType: 'breakfast',
      portion: '1/1',
    };
    setFoods([...foods, newFood]);
  };

  const handleRemoveFood = (index: number) => {
    if (foods.length > 1) {
      const newFoods = foods.filter((_, i) => i !== index);
      setFoods(newFoods);
    }
  };

  const handleAnalyze = async () => {
    // Clear previous errors
    clearError();
    setValidationErrors([]);

    // Validate foods
    const validation = validateFoodItems(foods);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Execute analysis with error handling
    await executeWithErrorHandling(
      async () => {
        onAnalyze(foods);
      },
      {
        loadingMessage: 'Analyzing your food...',
        maxRetries: 2,
      }
    );
  };

  const isAnalyzeDisabled = () => {
    return foods.some(food => !food.name.trim()) || isLoading;
  };

  // Real-time validation for individual food items
  const validateFoodItem = (food: FoodItem, index: number) => {
    const errors: string[] = [];
    
    if (!food.name.trim()) {
      errors.push(`Food item ${index + 1}: Name is required`);
    } else if (food.name.trim().length < 2) {
      errors.push(`Food item ${index + 1}: Name must be at least 2 characters`);
    }
    
    return errors;
  };

  return (
    <SafeAreaView style={styles.container} testID="food-input-container">
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header" accessibilityLevel={1}>
            What's your poison?
          </Text>
        </View>

        {/* Error Messages */}
        {validationErrors.length > 0 && (
          <ErrorMessage
            message={validationErrors.join('\n')}
            type="VALIDATION"
            onDismiss={() => setValidationErrors([])}
          />
        )}

        {error && (
          <ErrorMessage
            message={error.userMessage}
            type={error.type}
            onRetry={() => {
              clearError();
              handleAnalyze();
            }}
            onDismiss={clearError}
          />
        )}

        {/* Food Input List */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {foods.map((food, index) => (
            <FoodInputRow
              key={food.id}
              food={food}
              onFoodChange={(updatedFood) => handleFoodChange(index, updatedFood)}
              onRemove={() => handleRemoveFood(index)}
              showRemoveButton={foods.length > 1}
            />
          ))}

          {/* Add More Food Button */}
          <TouchableOpacity 
            style={[styles.addButton, isLoading && styles.addButtonDisabled]} 
            onPress={handleAddFood}
            disabled={isLoading}
            testID="add-food-button"
            accessibilityLabel="Add food item"
            accessibilityHint="Adds another food input row"
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoading }}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Analyze Button */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              isAnalyzeDisabled() && styles.analyzeButtonDisabled,
            ]}
            onPress={handleAnalyze}
            disabled={isAnalyzeDisabled()}
            testID="analyze-button"
            accessibilityLabel="Analyze food items"
            accessibilityHint="Analyzes the entered food items for nutritional content"
            accessibilityRole="button"
            accessibilityState={{ disabled: isAnalyzeDisabled() }}
          >
            {isLoading ? (
              <LoadingSpinner size="small" message="" />
            ) : (
              <Text style={styles.analyzeButtonText}>Analyse</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Loading Overlay */}
        {isLoading && (
          <LoadingSpinner 
            overlay 
            message="Analyzing your food..." 
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxlarge,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 24,
    color: Colors.inactive,
    fontWeight: 'bold',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  bottomSection: {
    paddingVertical: Spacing.md,
  },
  analyzeButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  analyzeButtonDisabled: {
    backgroundColor: Colors.buttonSecondary,
    opacity: 0.6,
  },
  analyzeButtonText: {
    fontSize: FontSizes.small,
    color: Colors.inactive,
    fontWeight: '400',
    textTransform: 'capitalize',
  },
});