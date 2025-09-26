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

interface FoodInputScreenProps {
  onAnalyze: (foods: FoodItem[]) => void;
}

export const FoodInputScreen: React.FC<FoodInputScreenProps> = ({
  onAnalyze,
}) => {
  const [foods, setFoods] = useState<FoodItem[]>([
    {
      id: generateFoodId(),
      name: '',
      mealType: 'breakfast',
      portion: '1/1',
    },
  ]);

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

  const handleAnalyze = () => {
    const validation = validateFoodItems(foods);
    
    if (!validation.isValid) {
      Alert.alert(
        'Validation Error',
        validation.errors.join('\n'),
        [{ text: 'OK' }]
      );
      return;
    }

    onAnalyze(foods);
  };

  const isAnalyzeDisabled = () => {
    return foods.some(food => !food.name.trim());
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>What's your poison?</Text>
        </View>

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
          <TouchableOpacity style={styles.addButton} onPress={handleAddFood}>
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
          >
            <Text style={styles.analyzeButtonText}>Analyse</Text>
          </TouchableOpacity>
        </View>
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