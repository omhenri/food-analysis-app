import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FoodInputRow } from '../../src/components/FoodInputRow';
import { FoodItem } from '../../src/models/types';

const mockFoodItem: FoodItem = {
  id: '1',
  name: 'Apple',
  mealType: 'snack',
  portion: '1/1',
};

describe('FoodInputRow Component', () => {
  const mockOnFoodChange = jest.fn();
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render correctly with default props', () => {
      const { getByDisplayValue, getByText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
        />
      );

      expect(getByDisplayValue('Apple')).toBeTruthy();
      expect(getByText('1/1')).toBeTruthy();
    });

    it('should render remove button when showRemoveButton is true', () => {
      const { getByLabelText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
          onRemove={mockOnRemove}
          showRemoveButton={true}
        />
      );

      expect(getByLabelText('Remove food item')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for meal type button', () => {
      const { getByLabelText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
        />
      );

      const mealTypeButton = getByLabelText('Select meal type, currently snack');
      expect(mealTypeButton).toBeTruthy();
      expect(mealTypeButton.props.accessibilityRole).toBe('button');
      expect(mealTypeButton.props.accessibilityHint).toBe('Opens meal type selection menu');
    });

    it('should have proper accessibility labels for food input', () => {
      const { getByLabelText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
        />
      );

      const foodInput = getByLabelText('Food name input');
      expect(foodInput).toBeTruthy();
      expect(foodInput.props.accessibilityRole).toBe('text');
      expect(foodInput.props.accessibilityHint).toBe('Enter the name of the food or drink');
    });

    it('should have proper accessibility labels for portion button', () => {
      const { getByLabelText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
        />
      );

      const portionButton = getByLabelText('Select portion size, currently 1/1');
      expect(portionButton).toBeTruthy();
      expect(portionButton.props.accessibilityRole).toBe('button');
      expect(portionButton.props.accessibilityHint).toBe('Opens portion size selection menu');
    });
  });

  describe('User Interactions', () => {
    it('should call onFoodChange when food name changes', () => {
      const { getByDisplayValue } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
        />
      );

      const input = getByDisplayValue('Apple');
      fireEvent.changeText(input, 'Banana');

      expect(mockOnFoodChange).toHaveBeenCalledWith({
        ...mockFoodItem,
        name: 'Banana',
      });
    });

    it('should open meal type modal when meal type button is pressed', () => {
      const { getByLabelText, getByText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
        />
      );

      const mealTypeButton = getByLabelText('Select meal type, currently snack');
      fireEvent.press(mealTypeButton);

      expect(getByText('Breakfast')).toBeTruthy();
      expect(getByText('Lunch')).toBeTruthy();
      expect(getByText('Dinner')).toBeTruthy();
      expect(getByText('Snack')).toBeTruthy();
    });

    it('should open portion modal when portion button is pressed', () => {
      const { getByLabelText, getByText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
        />
      );

      const portionButton = getByLabelText('Select portion size, currently 1/1');
      fireEvent.press(portionButton);

      expect(getByText('1/8')).toBeTruthy();
      expect(getByText('1/4')).toBeTruthy();
      expect(getByText('1/3')).toBeTruthy();
      expect(getByText('1/2')).toBeTruthy();
      expect(getByText('1/1')).toBeTruthy();
    });

    it('should call onFoodChange when meal type is selected', async () => {
      const { getByLabelText, getByText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
        />
      );

      const mealTypeButton = getByLabelText('Select meal type, currently snack');
      fireEvent.press(mealTypeButton);

      const breakfastOption = getByText('Breakfast');
      fireEvent.press(breakfastOption);

      await waitFor(() => {
        expect(mockOnFoodChange).toHaveBeenCalledWith({
          ...mockFoodItem,
          mealType: 'breakfast',
        });
      });
    });

    it('should call onFoodChange when portion is selected', async () => {
      const { getByLabelText, getByText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
        />
      );

      const portionButton = getByLabelText('Select portion size, currently 1/1');
      fireEvent.press(portionButton);

      const halfPortionOption = getByText('1/2');
      fireEvent.press(halfPortionOption);

      await waitFor(() => {
        expect(mockOnFoodChange).toHaveBeenCalledWith({
          ...mockFoodItem,
          portion: '1/2',
        });
      });
    });

    it('should call onRemove when remove button is pressed', () => {
      const { getByLabelText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
          onRemove={mockOnRemove}
          showRemoveButton={true}
        />
      );

      const removeButton = getByLabelText('Remove food item');
      fireEvent.press(removeButton);

      expect(mockOnRemove).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should show validation error for empty food name when touched', () => {
      const emptyFoodItem = { ...mockFoodItem, name: '' };
      const { getByDisplayValue, getByText } = render(
        <FoodInputRow
          food={emptyFoodItem}
          onFoodChange={mockOnFoodChange}
          showValidation={true}
        />
      );

      const input = getByDisplayValue('');
      fireEvent(input, 'blur');

      expect(getByText('Food name is required')).toBeTruthy();
    });

    it('should not show validation error when showValidation is false', () => {
      const emptyFoodItem = { ...mockFoodItem, name: '' };
      const { getByDisplayValue, queryByText } = render(
        <FoodInputRow
          food={emptyFoodItem}
          onFoodChange={mockOnFoodChange}
          showValidation={false}
        />
      );

      const input = getByDisplayValue('');
      fireEvent(input, 'blur');

      expect(queryByText('Food name is required')).toBeNull();
    });
  });

  describe('Modal Interactions', () => {
    it('should close meal type modal when overlay is pressed', async () => {
      const { getByLabelText, getByText, queryByText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
        />
      );

      const mealTypeButton = getByLabelText('Select meal type, currently snack');
      fireEvent.press(mealTypeButton);

      expect(getByText('Breakfast')).toBeTruthy();

      // Find and press the modal overlay
      const modal = getByText('Breakfast').parent?.parent?.parent;
      if (modal) {
        fireEvent.press(modal);
      }

      await waitFor(() => {
        expect(queryByText('Breakfast')).toBeNull();
      });
    });

    it('should close portion modal when overlay is pressed', async () => {
      const { getByLabelText, getByText, queryByText } = render(
        <FoodInputRow
          food={mockFoodItem}
          onFoodChange={mockOnFoodChange}
        />
      );

      const portionButton = getByLabelText('Select portion size, currently 1/1');
      fireEvent.press(portionButton);

      expect(getByText('1/8')).toBeTruthy();

      // Find and press the modal overlay
      const modal = getByText('1/8').parent?.parent?.parent;
      if (modal) {
        fireEvent.press(modal);
      }

      await waitFor(() => {
        expect(queryByText('1/8')).toBeNull();
      });
    });
  });
});