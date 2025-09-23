import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../src/hooks/useFormValidation';
import { ValidationError } from '../src/utils/errorHandler';

interface TestForm {
  name: string;
  email: string;
  age: number;
}

const mockValidationRules = {
  name: [
    {
      validator: (value: string) => value.length > 0,
      message: 'Name is required',
    },
    {
      validator: (value: string) => value.length >= 2,
      message: 'Name must be at least 2 characters',
    },
  ],
  email: [
    {
      validator: (value: string) => value.includes('@'),
      message: 'Email must contain @',
    },
  ],
  age: [
    {
      validator: (value: number) => value >= 18,
      message: 'Age must be at least 18',
    },
  ],
};

describe('useFormValidation', () => {
  const initialValues: TestForm = {
    name: '',
    email: '',
    age: 0,
  };

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules)
    );

    expect(result.current.isFormValid).toBe(true);
    expect(result.current.fields.name.value).toBe('');
    expect(result.current.fields.name.error).toBe(null);
    expect(result.current.fields.name.isValid).toBe(true);
    expect(result.current.fields.name.isTouched).toBe(false);
  });

  it('should update field value', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules)
    );

    act(() => {
      result.current.setFieldValue('name', 'John');
    });

    expect(result.current.fields.name.value).toBe('John');
  });

  it('should validate on change when enabled', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules, { validateOnChange: true })
    );

    act(() => {
      result.current.setFieldValue('name', 'J'); // Too short
    });

    expect(result.current.fields.name.error).toBe('Name must be at least 2 characters');
    expect(result.current.fields.name.isValid).toBe(false);
  });

  it('should not validate on change when disabled', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules, { validateOnChange: false })
    );

    act(() => {
      result.current.setFieldValue('name', 'J'); // Too short
    });

    expect(result.current.fields.name.error).toBe(null);
    expect(result.current.fields.name.isValid).toBe(true);
  });

  it('should validate on blur when enabled', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules, { validateOnBlur: true })
    );

    act(() => {
      result.current.setFieldValue('name', 'J'); // Too short
      result.current.setFieldTouched('name');
    });

    expect(result.current.fields.name.error).toBe('Name must be at least 2 characters');
    expect(result.current.fields.name.isValid).toBe(false);
    expect(result.current.fields.name.isTouched).toBe(true);
  });

  it('should validate all fields', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules)
    );

    act(() => {
      result.current.setFieldValue('name', ''); // Invalid
      result.current.setFieldValue('email', 'invalid-email'); // Invalid
      result.current.setFieldValue('age', 16); // Invalid
    });

    const isValid = act(() => result.current.validateAllFields());

    expect(isValid).toBe(false);
    expect(result.current.fields.name.error).toBe('Name is required');
    expect(result.current.fields.email.error).toBe('Email must contain @');
    expect(result.current.fields.age.error).toBe('Age must be at least 18');
  });

  it('should get field props correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules)
    );

    const fieldProps = result.current.getFieldProps('name');

    expect(fieldProps.value).toBe('');
    expect(fieldProps.error).toBe(null);
    expect(fieldProps.isValid).toBe(true);
    expect(typeof fieldProps.onChangeText).toBe('function');
    expect(typeof fieldProps.onBlur).toBe('function');
  });

  it('should get form values', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules)
    );

    act(() => {
      result.current.setFieldValue('name', 'John');
      result.current.setFieldValue('email', 'john@example.com');
      result.current.setFieldValue('age', 25);
    });

    const values = result.current.getFormValues();

    expect(values).toEqual({
      name: 'John',
      email: 'john@example.com',
      age: 25,
    });
  });

  it('should reset form', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules)
    );

    act(() => {
      result.current.setFieldValue('name', 'John');
      result.current.setFieldTouched('name');
    });

    expect(result.current.fields.name.value).toBe('John');
    expect(result.current.fields.name.isTouched).toBe(true);

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.fields.name.value).toBe('');
    expect(result.current.fields.name.isTouched).toBe(false);
  });

  it('should submit form successfully', async () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules)
    );

    const onSubmit = jest.fn();

    act(() => {
      result.current.setFieldValue('name', 'John');
      result.current.setFieldValue('email', 'john@example.com');
      result.current.setFieldValue('age', 25);
    });

    await act(async () => {
      const success = await result.current.submitForm(onSubmit);
      expect(success).toBe(true);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John',
      email: 'john@example.com',
      age: 25,
    });
  });

  it('should throw ValidationError on invalid form submission', async () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules)
    );

    const onSubmit = jest.fn();

    // Leave form with invalid values
    act(() => {
      result.current.setFieldValue('name', ''); // Invalid
    });

    await expect(
      act(async () => {
        await result.current.submitForm(onSubmit);
      })
    ).rejects.toThrow(ValidationError);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should update form validity when fields change', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules, { validateOnChange: true })
    );

    expect(result.current.isFormValid).toBe(true);

    act(() => {
      result.current.setFieldValue('name', 'J'); // Invalid
    });

    expect(result.current.isFormValid).toBe(false);

    act(() => {
      result.current.setFieldValue('name', 'John'); // Valid
    });

    expect(result.current.isFormValid).toBe(true);
  });

  it('should handle multiple validation rules', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidationRules, { validateOnChange: true })
    );

    // First rule fails (empty name)
    act(() => {
      result.current.setFieldValue('name', '');
    });

    expect(result.current.fields.name.error).toBe('Name is required');

    // Second rule fails (too short)
    act(() => {
      result.current.setFieldValue('name', 'J');
    });

    expect(result.current.fields.name.error).toBe('Name must be at least 2 characters');

    // All rules pass
    act(() => {
      result.current.setFieldValue('name', 'John');
    });

    expect(result.current.fields.name.error).toBe(null);
    expect(result.current.fields.name.isValid).toBe(true);
  });
});