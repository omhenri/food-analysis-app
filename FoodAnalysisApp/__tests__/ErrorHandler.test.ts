import {
  ErrorHandler,
  AppError,
  ErrorType,
  ErrorSeverity,
  NetworkError,
  DatabaseError,
  ValidationError,
  AIAnalysisError,
  RetryManager,
  NetworkStatus,
} from '../src/utils/errorHandler';

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    ErrorHandler.clearErrorLog();
    jest.clearAllMocks();
    // Suppress console.error for tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AppError', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError(
        ErrorType.NETWORK,
        'Test error',
        'User message',
        ErrorSeverity.HIGH
      );

      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.message).toBe('Test error');
      expect(error.userMessage).toBe('User message');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Specific Error Types', () => {
    it('should create NetworkError correctly', () => {
      const error = new NetworkError('Network failed');
      
      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.userMessage).toContain('Network connection failed');
    });

    it('should create DatabaseError correctly', () => {
      const error = new DatabaseError('DB failed');
      
      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.userMessage).toContain('Data storage error');
    });

    it('should create ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', 'Custom message');
      
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.userMessage).toBe('Custom message');
    });

    it('should create AIAnalysisError correctly', () => {
      const error = new AIAnalysisError('AI failed');
      
      expect(error.type).toBe(ErrorType.AI_ANALYSIS);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.userMessage).toContain('Food analysis failed');
    });
  });

  describe('Error Logging', () => {
    it('should log errors correctly', () => {
      const error = new AppError(
        ErrorType.NETWORK,
        'Test error',
        'User message'
      );

      ErrorHandler.logError(error);
      const log = ErrorHandler.getErrorLog();

      expect(log).toHaveLength(1);
      expect(log[0]).toBe(error);
    });

    it('should maintain maximum log size', () => {
      // Create more errors than max log size
      for (let i = 0; i < 105; i++) {
        const error = new AppError(
          ErrorType.NETWORK,
          `Error ${i}`,
          'User message'
        );
        ErrorHandler.logError(error);
      }

      const log = ErrorHandler.getErrorLog();
      expect(log).toHaveLength(100); // Should be capped at maxLogSize
    });

    it('should clear error log', () => {
      const error = new AppError(
        ErrorType.NETWORK,
        'Test error',
        'User message'
      );

      ErrorHandler.logError(error);
      expect(ErrorHandler.getErrorLog()).toHaveLength(1);

      ErrorHandler.clearErrorLog();
      expect(ErrorHandler.getErrorLog()).toHaveLength(0);
    });
  });

  describe('Error Conversion', () => {
    it('should convert generic network error to NetworkError', () => {
      const genericError = new Error('Network connection failed');
      
      ErrorHandler.handleError(genericError, false);
      const log = ErrorHandler.getErrorLog();

      expect(log[0]).toBeInstanceOf(NetworkError);
      expect(log[0].type).toBe(ErrorType.NETWORK);
    });

    it('should convert generic database error to DatabaseError', () => {
      const genericError = new Error('SQLite database error');
      
      ErrorHandler.handleError(genericError, false);
      const log = ErrorHandler.getErrorLog();

      expect(log[0]).toBeInstanceOf(DatabaseError);
      expect(log[0].type).toBe(ErrorType.DATABASE);
    });

    it('should convert unknown error to generic AppError', () => {
      const genericError = new Error('Unknown error');
      
      ErrorHandler.handleError(genericError, false);
      const log = ErrorHandler.getErrorLog();

      expect(log[0]).toBeInstanceOf(AppError);
      expect(log[0].type).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('Recoverable Errors', () => {
    it('should identify recoverable errors', () => {
      const networkError = new NetworkError('Network failed');
      const aiError = new AIAnalysisError('AI failed');
      const dbError = new DatabaseError('DB failed');

      expect(ErrorHandler.isRecoverable(networkError)).toBe(true);
      expect(ErrorHandler.isRecoverable(aiError)).toBe(true);
      expect(ErrorHandler.isRecoverable(dbError)).toBe(false);
    });
  });

  describe('Retry Delay', () => {
    it('should calculate exponential backoff delay', () => {
      expect(ErrorHandler.getRetryDelay(1)).toBe(1000);
      expect(ErrorHandler.getRetryDelay(2)).toBe(2000);
      expect(ErrorHandler.getRetryDelay(3)).toBe(4000);
      expect(ErrorHandler.getRetryDelay(4)).toBe(8000);
      expect(ErrorHandler.getRetryDelay(5)).toBe(10000); // Capped at 10s
    });
  });
});

describe('RetryManager', () => {
  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await RetryManager.withRetry(operation, 3);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');
    
    const result = await RetryManager.withRetry(operation, 3);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Always fail'));
    
    await expect(RetryManager.withRetry(operation, 2)).rejects.toThrow('Always fail');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should respect shouldRetry function', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Non-retryable'));
    const shouldRetry = jest.fn().mockReturnValue(false);
    
    await expect(RetryManager.withRetry(operation, 3, shouldRetry)).rejects.toThrow('Non-retryable');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('NetworkStatus', () => {
  it('should track online status', () => {
    expect(NetworkStatus.getOnlineStatus()).toBe(true);
    
    NetworkStatus.setOnlineStatus(false);
    expect(NetworkStatus.getOnlineStatus()).toBe(false);
    
    NetworkStatus.setOnlineStatus(true);
    expect(NetworkStatus.getOnlineStatus()).toBe(true);
  });

  it('should notify listeners of status changes', () => {
    const listener = jest.fn();
    
    NetworkStatus.addListener(listener);
    NetworkStatus.setOnlineStatus(false);
    
    expect(listener).toHaveBeenCalledWith(false);
    
    NetworkStatus.removeListener(listener);
    NetworkStatus.setOnlineStatus(true);
    
    expect(listener).toHaveBeenCalledTimes(1); // Should not be called after removal
  });

  it('should not notify listeners if status unchanged', () => {
    const listener = jest.fn();
    
    NetworkStatus.addListener(listener);
    NetworkStatus.setOnlineStatus(true); // Same as current status
    
    expect(listener).not.toHaveBeenCalled();
  });
});