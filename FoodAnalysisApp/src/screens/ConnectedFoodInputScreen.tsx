import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FoodInputScreen } from './FoodInputScreen';
import { FoodItem } from '../models/types';
import { InputStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<InputStackParamList, 'FoodInput'>;

export const ConnectedFoodInputScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleAnalyze = (foods: FoodItem[]) => {
    navigation.navigate('Analysis', { foods });
  };

  return <FoodInputScreen onAnalyze={handleAnalyze} />;
};