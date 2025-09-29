import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps,
  Animated,
} from 'react-native';
import { Colors } from '../constants/theme';

interface ValidatedTextInputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  isValid?: boolean;
  required?: boolean;
  helperText?: string;
  showValidationIcon?: boolean;
}

export const ValidatedTextInput: React.FC<ValidatedTextInputProps> = ({
  label,
  error,
  isValid = true,
  required = false,
  helperText,
  showValidationIcon = true,
  style,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [shakeAnimation] = useState(new Animated.Value(0));

  const hasError = error !== null && error !== undefined;
  const showError = hasError && !isFocused;

  // Shake animation for errors
  React.useEffect(() => {
    if (hasError) {
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hasError, shakeAnimation]);

  const getBorderColor = () => {
    if (showError) return Colors.error;
    if (isFocused) return Colors.primary;
    if (!isFocused && isValid && textInputProps.value) return Colors.success;
    return Colors.border;
  };

  const getValidationIcon = () => {
    if (!showValidationIcon || !textInputProps.value) return null;
    if (showError) return '❌';
    if (isValid) return '✅';
    return null;
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <Animated.View
        style={[
          styles.inputContainer,
          { 
            borderColor: getBorderColor(),
            transform: [{ translateX: shakeAnimation }],
          },
        ]}
      >
        <TextInput
          {...textInputProps}
          style={[styles.input, style]}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          placeholderTextColor={Colors.textSecondary}
        />
        
        {getValidationIcon() && (
          <Text style={styles.validationIcon}>{getValidationIcon()}</Text>
        )}
      </Animated.View>

      {showError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      {helperText && !showError && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  required: {
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  validationIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
});