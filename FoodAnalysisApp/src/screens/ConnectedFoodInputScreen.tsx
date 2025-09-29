import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addFoodItem,
  removeFoodItem,
  updateFoodItem,
  clearCurrentFoods,
  saveFoodItems,
  loadCurrentDayFoodEntries,
  selectCurrentFoods,
  selectFoodLoading,
  selectFoodError,
  selectIsDirty,
  clearError,
} from '../store/slices/foodSlice';
import { analyzeAndSaveFoods } from '../store/slices/analysisSlice';
import { FoodInputRow } from '../components/FoodInputRow';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Colors } from '../constants/theme';
import { FoodItem, MealType, PortionSize } from '../models/types';
import { generateId } from '../utils/validation';

export const ConnectedFoodInputScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const currentFoods = useAppSelector(selectCurrentFoods);
  const loading = useAppSelector(selectFoodLoading);
  const error = useAppSelector(selectFoodError);
  const isDirty = useAppSelector(selectIsDirty);
  
  // Local state
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load existing food entries on mount
  useEffect(() => {
    dispatch(loadCurrentDayFoodEntries());
  }, [dispatch]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Add a new food item
  const handleAddFood = () => {
    const newFood: FoodItem = {
      id: generateId(),
      name: '',
      mealType: 'breakfast',
      portion: '1/1',
    };
    dispatch(addFoodItem(newFood));
  };

  // Remove a food item
  const handleRemoveFood = (index: number) => {
    if (currentFoods.length > 1) {
      dispatch(removeFoodItem(index));
    }
  };

  // Update a food item
  const handleUpdateFood = (index: number, updatedFood: Partial<FoodItem>) => {
    const currentFood = currentFoods[index];
    if (currentFood) {
      const newFood: FoodItem = { ...currentFood, ...updatedFood };
      dispatch(updateFoodItem({ index, food: newFood }));
    }
  };

  // Validate foods before saving/analyzing
  const validateFoods = (): boolean => {
    const validFoods = currentFoods.filter(food => food.name.trim() !== '');
    if (validFoods.length === 0) {
      Alert.alert('Validation Error', 'Please enter at least one food item.');
      return false;
    }
    return true;
  };

  // Save foods to database
  const handleSaveFoods = async () => {
    if (!validateFoods()) return;

    try {
      const validFoods = currentFoods.filter(food => food.name.trim() !== '');
      await dispatch(saveFoodItems(validFoods)).unwrap();
      
      Alert.alert('Success', 'Foods saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save foods. Please try again.');
    }
  };

  // Analyze foods using AI
  const handleAnalyzeFoods = async () => {
    if (!validateFoods()) return;

    try {
      setIsAnalyzing(true);
      const validFoods = currentFoods.filter(food => food.name.trim() !== '');
      
      // This will save foods and analyze them
      await dispatch(analyzeAndSaveFoods(validFoods)).unwrap();
      
      Alert.alert('Success', 'Foods analyzed successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to analysis screen
            // This would be handled by navigation in a real app
            console.log('Navigate to analysis screen');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze foods. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clear all foods
  const handleClearFoods = () => {
    Alert.alert(
      'Clear Foods',
      'Are you sure you want to clear all food entries?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            dispatch(clearCurrentFoods());
            // Add one empty food item
            handleAddFood();
          },
        },
      ]
    );
  };

  // Ensure we always have at least one food item
  useEffect(() => {
    if (currentFoods.length === 0) {
      handleAddFood();
    }
  }, [currentFoods.length]);

  if (loading.loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading your food entries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>What's your poison?</Text>
        {isDirty && (
          <View style={styles.dirtyIndicator}>
            <Text style={styles.dirtyText}>Unsaved changes</Text>
          </View>
        )}
      </View>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => dispatch(clearError())} 
        />
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.foodInputContainer}>
          {currentFoods.map((food, index) => (
            <FoodInputRow
              key={food.id}
              food={food}
              onFoodChange={(updatedFood) => handleUpdateFood(index, updatedFood)}
              onRemove={() => handleRemoveFood(index)}
              showRemoveButton={currentFoods.length > 1}
            />
          ))}

          <TouchableOpacity style={styles.addButton} onPress={handleAddFood}>
            <Text style={styles.addButtonText}>+ Add Food</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearFoods}
          disabled={loading.saving || isAnalyzing}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSaveFoods}
          disabled={loading.saving || isAnalyzing || !isDirty}
        >
          {loading.saving ? (
            <LoadingSpinner size="small" color={Colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.analyzeButton]}
          onPress={handleAnalyzeFoods}
          disabled={loading.saving || isAnalyzing}
        >
          {isAnalyzing ? (
            <LoadingSpinner size="small" color={Colors.white} />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.white,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    flex: 1,
  },
  dirtyIndicator: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dirtyText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  foodInputContainer: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 20,
    padding: 20,
    minHeight: 200,
  },
  addButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  clearButton: {
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  clearButtonText: {
    fontSize: 16,
    color: Colors.gray,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.info,
  },
  saveButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
  analyzeButton: {
    backgroundColor: Colors.primary,
  },
  analyzeButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
});