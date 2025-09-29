# Error Handling System

This document describes the comprehensive error handling system implemented in the Food Analysis App.

## Overview

The error handling system provides:
- Centralized error management
- User-friendly error messages
- Automatic retry mechanisms
- Network status monitoring
- Form validation with real-time feedback
- Loading states and user feedback components

## Core Components

### 1. Error Types and Classes

#### AppError
Base error class with structured error information:
```typescript
const error = new AppError(
  ErrorType.NETWORK,
  'Technical message',
  'User-friendly message',
  ErrorSeverity.MEDIUM,
  originalError
);
```

#### Specific Error Types
- **NetworkError**: Network connectivity issues
- **DatabaseError**: Local storage problems
- **ValidationError**: Input validation failures
- **AIAnalysisError**: AI service failures

### 2. ErrorHandler

Central error management utility:

```typescript
import { ErrorHandler } from '../utils/errorHandler';

// Handle any error
ErrorHandler.handleError(error, showAlert);

// Check if error is recoverable
const canRetry = ErrorHandler.isRecoverable(error);

// Get retry delay
const delay = ErrorHandler.getRetryDelay(attemptNumber);
```

### 3. RetryManager

Automatic retry mechanism with exponential backoff:

```typescript
import { RetryManager } from '../utils/errorHandler';

const result = await RetryManager.withRetry(
  async () => {
    // Your operation here
    return await apiCall();
  },
  maxRetries,
  (error) => {
    // Custom retry logic
    return error.message.includes('network');
  }
);
```

### 4. NetworkStatus

Network connectivity monitoring:

```typescript
import { NetworkStatus } from '../utils/errorHandler';

// Check current status
const isOnline = NetworkStatus.getOnlineStatus();

// Listen for changes
NetworkStatus.addListener((isOnline) => {
  console.log('Network status:', isOnline);
});
```

## React Hooks

### useErrorHandler

Comprehensive error handling hook for React components:

```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

const MyComponent = () => {
  const { error, isLoading, clearError, executeWithErrorHandling } = useErrorHandler();

  const handleSubmit = async () => {
    const result = await executeWithErrorHandling(
      async () => {
        return await submitData();
      },
      {
        showAlert: true,
        maxRetries: 3,
        loadingMessage: 'Submitting...'
      }
    );

    if (result) {
      // Success
    }
  };

  return (
    <div>
      {error && (
        <ErrorMessage
          message={error.userMessage}
          type={error.type}
          onRetry={handleSubmit}
          onDismiss={clearError}
        />
      )}
      {isLoading && <LoadingSpinner />}
    </div>
  );
};
```

### useFormValidation

Form validation with real-time feedback:

```typescript
import { useFormValidation } from '../hooks/useFormValidation';

const validationRules = {
  name: [
    { validator: (value) => value.length > 0, message: 'Name is required' },
    { validator: (value) => value.length >= 2, message: 'Name too short' }
  ]
};

const MyForm = () => {
  const {
    fields,
    isFormValid,
    getFieldProps,
    submitForm
  } = useFormValidation(initialValues, validationRules);

  const handleSubmit = async () => {
    try {
      await submitForm(async (values) => {
        await saveData(values);
      });
    } catch (error) {
      // Handle validation errors
    }
  };

  return (
    <form>
      <ValidatedTextInput
        {...getFieldProps('name')}
        label="Name"
        required
      />
      <button disabled={!isFormValid} onClick={handleSubmit}>
        Submit
      </button>
    </form>
  );
};
```

## UI Components

### ErrorBoundary

Catches and handles React component errors:

```typescript
import { ErrorBoundary } from '../components/ErrorBoundary';

<ErrorBoundary>
  <MyApp />
</ErrorBoundary>
```

### ErrorMessage

Displays user-friendly error messages:

```typescript
import { ErrorMessage } from '../components/ErrorMessage';

<ErrorMessage
  message="Something went wrong"
  type={ErrorType.NETWORK}
  onRetry={() => retryOperation()}
  onDismiss={() => clearError()}
/>
```

### LoadingSpinner

Shows loading states:

```typescript
import { LoadingSpinner } from '../components/LoadingSpinner';

<LoadingSpinner 
  message="Loading..." 
  overlay={true} 
/>
```

### OfflineIndicator

Shows network status:

```typescript
import { OfflineIndicator } from '../components/OfflineIndicator';

// Automatically shows when offline
<OfflineIndicator />
```

### ValidatedTextInput

Text input with validation feedback:

```typescript
import { ValidatedTextInput } from '../components/ValidatedTextInput';

<ValidatedTextInput
  label="Email"
  error={fieldError}
  isValid={fieldValid}
  required
  showValidationIcon
  onChangeText={handleChange}
  onBlur={handleBlur}
/>
```

## Service Integration

### AI Service Error Handling

```typescript
// AIAnalysisService.ts
try {
  return await RetryManager.withRetry(
    async () => {
      const response = await this.makeAIRequest(prompt);
      return this.parseAnalysisResponse(response, foods);
    },
    MAX_RETRIES,
    (error) => {
      // Only retry network errors
      const message = error.message.toLowerCase();
      return message.includes('network') || message.includes('fetch');
    }
  );
} catch (error) {
  // Fallback to mock data
  throw new AIAnalysisError(`AI analysis failed: ${error.message}`, error);
}
```

### Database Service Error Handling

```typescript
// DatabaseService.ts
try {
  const result = await this.database.executeSql(query, params);
  return result;
} catch (error) {
  throw new DatabaseError('Failed to execute database query', error);
}
```

## Best Practices

### 1. Error Classification
Always use appropriate error types:
- Network issues → NetworkError
- Database problems → DatabaseError
- Input validation → ValidationError
- AI service issues → AIAnalysisError

### 2. User-Friendly Messages
Provide clear, actionable error messages:
```typescript
// Good
new NetworkError('Network request failed', 'Please check your internet connection and try again.');

// Bad
new Error('XMLHttpRequest failed with status 500');
```

### 3. Retry Logic
Only retry recoverable errors:
```typescript
const shouldRetry = (error) => {
  return error instanceof NetworkError || 
         error instanceof AIAnalysisError;
};
```

### 4. Loading States
Always show loading indicators for async operations:
```typescript
const { isLoading, executeWithErrorHandling } = useErrorHandler();

// Show loading during operation
if (isLoading) return <LoadingSpinner />;
```

### 5. Graceful Degradation
Provide fallbacks for critical functionality:
```typescript
try {
  return await aiService.analyze(foods);
} catch (error) {
  // Fallback to offline analysis
  return mockService.analyze(foods);
}
```

## Testing

### Error Handler Tests
```typescript
import { ErrorHandler, NetworkError } from '../utils/errorHandler';

test('should handle network errors', () => {
  const error = new NetworkError('Connection failed');
  ErrorHandler.handleError(error, false);
  
  const log = ErrorHandler.getErrorLog();
  expect(log[0]).toBeInstanceOf(NetworkError);
});
```

### Hook Tests
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useErrorHandler } from '../hooks/useErrorHandler';

test('should retry on network errors', async () => {
  const { result } = renderHook(() => useErrorHandler());
  
  const mockOperation = jest.fn()
    .mockRejectedValueOnce(new NetworkError('Failed'))
    .mockResolvedValue('success');
  
  await act(async () => {
    const result = await result.current.executeWithErrorHandling(mockOperation);
    expect(result).toBe('success');
  });
});
```

## Configuration

### Error Logging
Configure error logging in production:
```typescript
// In production, send errors to analytics service
ErrorHandler.setErrorReporter((error) => {
  analytics.reportError(error);
});
```

### Retry Settings
Customize retry behavior:
```typescript
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second
const MAX_DELAY = 10000; // 10 seconds
```

### Network Monitoring
Enable network status monitoring:
```typescript
// App.tsx
import NetInfo from '@react-native-community/netinfo';
import { NetworkStatus } from './src/utils/errorHandler';

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    NetworkStatus.setOnlineStatus(state.isConnected ?? false);
  });
  return unsubscribe;
}, []);
```

This error handling system provides comprehensive coverage for all error scenarios in the Food Analysis App, ensuring a robust and user-friendly experience.