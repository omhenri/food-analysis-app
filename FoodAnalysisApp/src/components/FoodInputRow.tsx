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
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { MEAL_TYPES, PORTION_SIZES } from '../utils/validation';
import { MealIcon } from './MealIcon';

interface FoodInputRowProps {
  food: FoodItem;
  onFoodChange: (food: FoodItem) => void;
  onRemove?: () => void;
  showRemoveButton?: boolean;
}

export const FoodInputRow: React.FC<FoodInputRowProps> = ({
  food,
  onFoodChange,
  onRemove,
  showRemoveButton = false,
}) => {
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [showPortionModal, setShowPortionModal] = useState(false);

  const handleFoodNameChange = (name: string) => {
    onFoodChange({ ...food, name });
  };

  const handleMealTypeSelect = (mealType: MealType) => {
    onFoodChange({ ...food, mealType });
    setShowMealTypeModal(false);
  };

  const handlePortionSelect = (portion: PortionSize) => {
    onFoodChange({ ...food, portion });
    setShowPortionModal(false);
  };


  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {/* Meal Type Button */}
        <TouchableOpacity
          style={styles.mealTypeButton}
          onPress={() => setShowMealTypeModal(true)}
        >
          <MealIcon mealType={food.mealType} />
        </TouchableOpacity>

        {/* Food Name Input */}
        <TextInput
          style={styles.foodInput}
          placeholder="name of food or drink"
          placeholderTextColor={Colors.placeholder}
          value={food.name}
          onChangeText={handleFoodNameChange}
        />

        {/* Portion Button */}
        <TouchableOpacity
          style={styles.portionButton}
          onPress={() => setShowPortionModal(true)}
        >
          <Text style={styles.portionText}>{food.portion}</Text>
          <View style={styles.portionIndicator} />
        </TouchableOpacity>
      </View>

      {/* Remove Button */}
      {showRemoveButton && onRemove && (
        <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
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
                <MealIcon mealType={mealType} />
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  mealTypeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  foodInput: {
    flex: 1,
    fontSize: FontSizes.small,
    color: Colors.textPrimary,
    paddingVertical: Spacing.xs,
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  mealTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
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