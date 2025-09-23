import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { ErrorType } from '../utils/errorHandler';

interface ErrorMessageProps {
  message: string;
  type?: ErrorType;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryText?: string;
  dismissText?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  type = ErrorType.UNKNOWN,
  onRetry,
  onDismiss,
  retryText = 'Try Again',
  dismissText = 'Dismiss',
}) => {
  const getErrorColor = () => {
    switch (type) {
      case ErrorType.NETWORK:
        return Colors.warning;
      case ErrorType.DATABASE:
        return Colors.error;
      case ErrorType.VALIDATION:
        return Colors.warning;
      case ErrorType.AI_ANALYSIS:
        return Colors.info;
      default:
        return Colors.error;
    }
  };

  const getErrorIcon = () => {
    switch (type) {
      case ErrorType.NETWORK:
        return '📡';
      case ErrorType.DATABASE:
        return '💾';
      case ErrorType.VALIDATION:
        return '⚠️';
      case ErrorType.AI_ANALYSIS:
        return '🤖';
      default:
        return '❌';
    }
  };

  return (
    <View style={[styles.container, { borderLeftColor: getErrorColor() }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{getErrorIcon()}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      
      <View style={styles.actions}>
        {onDismiss && (
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>{dismissText}</Text>
          </TouchableOpacity>
        )}
        {onRetry && (
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: getErrorColor() }]} 
            onPress={onRetry}
          >
            <Text style={styles.retryText}>{retryText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderLeftWidth: 4,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  dismissButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dismissText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
});