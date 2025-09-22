import React from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ComparisonScreen } from './ComparisonScreen';
import { InputStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<InputStackParamList, 'Comparison'>;
type RouteProp = RouteProp<InputStackParamList, 'Comparison'>;

export const ConnectedComparisonScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  
  const { analysisResults } = route.params;

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <ComparisonScreen
      analysisResults={analysisResults}
      onBackPress={handleBackPress}
    />
  );
};