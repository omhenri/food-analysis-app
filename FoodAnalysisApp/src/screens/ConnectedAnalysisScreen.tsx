import React from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AnalysisScreen } from './AnalysisScreen';
import { AnalysisResult } from '../models/types';
import { InputStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<InputStackParamList, 'Analysis'>;
type RouteProp = RouteProp<InputStackParamList, 'Analysis'>;

export const ConnectedAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  
  const { foods } = route.params;

  const handleComparisonPress = (analysisResults: AnalysisResult[]) => {
    navigation.navigate('Comparison', { analysisResults });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <AnalysisScreen
      foods={foods}
      onComparisonPress={handleComparisonPress}
      onBackPress={handleBackPress}
    />
  );
};