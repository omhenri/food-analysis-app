import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { FoodItem, MealType, PortionSize } from '../models/types';
import { Colors, Spacing, BorderRadius, FontSizes, PlatformStyles } from '../constants/theme';
import { MEAL_TYPES, PORTION_SIZES, validateFoodItem } from '../utils/validation';
import { accessibility } from '../utils/accessibility';
import { hapticFeedback } from '../utils/platform';

interface FoodInputRowProps {
  food: FoodItem;
  onFoodChange: (food: FoodItem) => void;
  onRemove?: () => void;
  showRemoveButton?: boolean;
  showValidation?: boolean;
}

export const FoodInputRow: React.FC<FoodInputRowProps> = ({
  food,
  onFoodChange,
  onRemove,
  showRemoveButton = false,
  showValidation = true,
}) => {
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  // Validate food item
  const validation = validateFoodItem(food);
  const hasError = !validation.isValid && isTouched && showValidation;

  const handleFoodNameChange = (name: string) => {
    onFoodChange({ ...food, name });
  };

  const handleMealTypeSelect = (mealType: MealType) => {
    hapticFeedback.light();
    onFoodChange({ ...food, mealType });
    setShowMealTypeModal(false);
    accessibility.announce(`Selected ${mealType} meal type`);
  };

  const handlePortionSelect = (portion: PortionSize) => {
    hapticFeedback.light();
    onFoodChange({ ...food, portion });
    setShowPortionModal(false);
    accessibility.announce(`Selected ${portion} portion`);
  };

  const getMealTypeIcon = (mealType: MealType) => {
    switch (mealType) {
      case 'breakfast':
        return '🍳';
      case 'lunch':
        return '🍽️';
      case 'dinner':
        return '🍖';
      case 'snack':
        return '🍿';
      default:
        return '🍽️';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {/* Meal Type Button */}
        <TouchableOpacity
          style={styles.mealTypeButton}
          onPress={() => setShowMealTypeModal(true)}
          {...accessibility.button(
            `Select meal type, currently ${food.mealType}`,
            'Opens meal type selection menu'
          )}
        >
          <Text style={styles.mealTypeIcon}>{getMealTypeIcon(food.mealType)}</Text>
        </TouchableOpacity>

        {/* Food Name Input */}
        <TextInput
          style={[
            styles.foodInput,
            hasError && styles.foodInputError,
          ]}
          placeholder="name of food or drink"
          placeholderTextColor={Colors.placeholder}
          value={food.name}
          onChangeText={handleFoodNameChange}
          onBlur={() => setIsTouched(true)}
          {...accessibility.textInput(
            'Food name input',
            food.name,
            'Enter the name of the food or drink'
          )}
        />

        {/* Portion Button */}
        <TouchableOpacity
          style={styles.portionButton}
          onPress={() => setShowPortionModal(true)}
          {...accessibility.button(
            `Select portion size, currently ${food.portion}`,
            'Opens portion size selection menu'
          )}
        >
          <Text style={styles.portionText}>{food.portion}</Text>
          <View style={styles.portionIndicator} />
        </TouchableOpacity>
      </View>

      {/* Validation Error */}
      {hasError && (
        <Text style={styles.errorText}>
          {validation.errors[0]}
        </Text>
      )}

      {/* Remove Button */}
      {showRemoveButton && onRemove && (
        <TouchableOpacity 
          style={styles.removeButton} 
          onPress={onRemove}
          {...accessibility.button(
            'Remove food item',
            'Removes this food entry from the list'
          )}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      )}

      {/* Meal Type Modal */}
      <Modal
        visible={showMealTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMealTypeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowMealTypeModal(false)}
        >
          <View style={styles.mealTypeModal}>
            {MEAL_TYPES.map((mealType) => (
              <TouchableOpacity
                key={mealType}
                style={styles.mealTypeOption}
                onPress={() => handleMealTypeSelect(mealType)}
              >
                <Text style={styles.mealTypeOptionIcon}>
                  {getMealTypeIcon(mealType)}
                </Text>
                <Text style={styles.mealTypeOptionText}>
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Portion Modal */}
      <Modal
        visible={showPortionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPortionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowPortionModal(false)}
        >
          <View style={styles.portionModal}>
            {PORTION_SIZES.map((portion) => (
              <TouchableOpacity
                key={portion}
                style={styles.portionOption}
                onPress={() => handlePortionSelect(portion)}
              >
                <Text style={styles.portionOptionText}>{portion}</Text>
                <View
                  style={[
                    styles.portionRadio,
                    food.portion === portion && styles.portionRadioSelected,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    ...PlatformStyles.cardShadow,
  },
  mealTypeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  mealTypeIcon: {
    fontSize: 20,
  },
  foodInput: {
    flex: 1,
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    paddingVertical: Spacing.xs,
  },
  foodInputError: {
    color: Colors.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 12,
  },
  portionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  portionText: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    marginRight: Spacing.xs,
  },
  portionIndicator: {
    width: 14,
    height: 14,
    borderRadius: BorderRadius.circle,
    backgroundColor: Colors.primary,
  },
  removeButton: {
    position: 'absolute',
    right: -10,
    top: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealTypeModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.small,
    padding: Spacing.sm,
    minWidth: 150,
    ...PlatformStyles.shadow,
  },
  mealTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  mealTypeOptionIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  mealTypeOptionText: {
    fontSize: FontSizes.small,
    color: Colors.inactive,
    textTransform: 'lowercase',
  },
  portionModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.small,
    padding: Spacing.sm,
    minWidth: 100,
    ...PlatformStyles.shadow,
  },
  portionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  portionOptionText: {
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  portionRadio: {
    width: 14,
    height: 14,
    borderRadius: BorderRadius.circle,
    backgroundColor: Colors.buttonSecondary,
  },
  portionRadioSelected: {
    backgroundColor: Colors.primary,
  },
});