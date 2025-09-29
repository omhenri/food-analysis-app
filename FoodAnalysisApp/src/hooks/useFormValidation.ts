import { useState, useCallback, useEffect } from 'react';
import { ValidationError } from '../utils/errorHandler';

interface ValidationRule<T> {
  validator: (value: T) => boolean;
  message: string;
}

interface FieldValidation<T> {
  value: T;
  error: string | null;
  isValid: boolean;
  isTouched: boolean;
}

interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, ValidationRule<T[keyof T]>[]>>,
  options: UseFormValidationOptions = {}
) {
  const { validateOnChange = true, validateOnBlur = true } = options;

  const [fields, setFields] = useState<Record<keyof T, FieldValidation<T[keyof T]>>>(() => {
    const initialFields = {} as Record<keyof T, FieldValidation<T[keyof T]>>;
    
    Object.keys(initialValues).forEach(key => {
      const fieldKey = key as keyof T;
      initialFields[fieldKey] = {
        value: initialValues[fieldKey],
        error: null,
        isValid: true,
        isTouched: false,
      };
    });
    
    return initialFields;
  });

  const [isFormValid, setIsFormValid] = useState(true);

  // Validate a single field
  const validateField = useCallback((fieldName: keyof T, value: T[keyof T]): string | null => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    for (const rule of rules) {
      if (!rule.validator(value)) {
        return rule.message;
      }
    }

    return null;
  }, [validationRules]);

  // Update field value
  const setFieldValue = useCallback((fieldName: keyof T, value: T[keyof T]) => {
    setFields(prev => {
      const field = prev[fieldName];
      const error = validateOnChange ? validateField(fieldName, value) : field.error;
      
      return {
        ...prev,
        [fieldName]: {
          ...field,
          value,
          error,
          isValid: error === null,
        },
      };
    });
  }, [validateField, validateOnChange]);

  // Mark field as touched (for blur validation)
  const setFieldTouched = useCallback((fieldName: keyof T) => {
    setFields(prev => {
      const field = prev[fieldName];
      const error = validateOnBlur ? validateField(fieldName, field.value) : field.error;
      
      return {
        ...prev,
        [fieldName]: {
          ...field,
          isTouched: true,
          error,
          isValid: error === null,
        },
      };
    });
  }, [validateField, validateOnBlur]);

  // Validate all fields
  const validateAllFields = useCallback(() => {
    const newFields = { ...fields };
    let allValid = true;

    Object.keys(fields).forEach(key => {
      const fieldKey = key as keyof T;
      const field = fields[fieldKey];
      const error = validateField(fieldKey, field.value);
      
      newFields[fieldKey] = {
        ...field,
        error,
        isValid: error === null,
        isTouched: true,
      };

      if (error !== null) {
        allValid = false;
      }
    });

    setFields(newFields);
    return allValid;
  }, [fields, validateField]);

  // Get field props for easy integration with form components
  const getFieldProps = useCallback((fieldName: keyof T) => {
    const field = fields[fieldName];
    
    return {
      value: field.value,
      error: field.isTouched ? field.error : null,
      isValid: field.isValid,
      onChangeText: (value: T[keyof T]) => setFieldValue(fieldName, value),
      onBlur: () => setFieldTouched(fieldName),
    };
  }, [fields, setFieldValue, setFieldTouched]);

  // Get form values
  const getFormValues = useCallback((): T => {
    const values = {} as T;
    
    Object.keys(fields).forEach(key => {
      const fieldKey = key as keyof T;
      values[fieldKey] = fields[fieldKey].value;
    });
    
    return values;
  }, [fields]);

  // Reset form
  const resetForm = useCallback(() => {
    setFields(() => {
      const resetFields = {} as Record<keyof T, FieldValidation<T[keyof T]>>;
      
      Object.keys(initialValues).forEach(key => {
        const fieldKey = key as keyof T;
        resetFields[fieldKey] = {
          value: initialValues[fieldKey],
          error: null,
          isValid: true,
          isTouched: false,
        };
      });
      
      return resetFields;
    });
  }, [initialValues]);

  // Submit form with validation
  const submitForm = useCallback(async (
    onSubmit: (values: T) => Promise<void> | void
  ): Promise<boolean> => {
    const isValid = validateAllFields();
    
    if (!isValid) {
      // Create validation error with all field errors
      const errors = Object.keys(fields)
        .map(key => fields[key as keyof T].error)
        .filter(error => error !== null);
      
      throw new ValidationError(
        'Form validation failed',
        `Please fix the following errors: ${errors.join(', ')}`
      );
    }

    try {
      await onSubmit(getFormValues());
      return true;
    } catch (error) {
      throw error;
    }
  }, [validateAllFields, getFormValues, fields]);

  // Update form validity when fields change
  useEffect(() => {
    const allValid = Object.values(fields).every(field => field.isValid);
    setIsFormValid(allValid);
  }, [fields]);

  return {
    fields,
    isFormValid,
    setFieldValue,
    setFieldTouched,
    validateAllFields,
    getFieldProps,
    getFormValues,
    resetForm,
    submitForm,
  };
}