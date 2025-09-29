import { RetryManager, NetworkError, DatabaseError, ValidationError, ErrorHandler } from '../src/utils/errorHandler';

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ErrorHandler.clearErrorLog();
    // Suppress console output for tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle network errors with retry', async () => {
    let attemptCount = 0;
    const mockOperation = jest.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new NetworkError('Network failed');
      }
      return Promise.resolve('success');
    });

    const result = await RetryManager.withRetry(
      mockOperation,
      3,
      (error) => error instanceof NetworkError
    );

    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('should handle database errors without retry', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new DatabaseError('DB failed'));

    await expect(
      RetryManager.withRetry(
        mockOperation,
        3,
        (error) => !(error instanceof DatabaseError) // Don't retry database errors
      )
    ).rejects.toThrow('DB failed');

    expect(mockOperation).toHaveBeenCalledTimes(1); // No retry for database errors
  });

  it('should handle validation errors immediately', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new ValidationError('Invalid input'));

    await expect(
      RetryManager.withRetry(
        mockOperation,
        3,
        (error) => !(error instanceof ValidationError) // Don't retry validation errors
      )
    ).rejects.toThrow('Invalid input');

    expect(mockOperation).toHaveBeenCalledTimes(1); // No retry for validation errors
  });

  it('should handle error logging correctly', () => {
    const networkError = new NetworkError('Network failed');
    const dbError = new DatabaseError('DB failed');

    ErrorHandler.handleError(networkError, false);
    ErrorHandler.handleError(dbError, false);

    const log = ErrorHandler.getErrorLog();
    expect(log).toHaveLength(2);
    expect(log[0]).toBeInstanceOf(DatabaseError); // Most recent first
    expect(log[1]).toBeInstanceOf(NetworkError);
  });

  it('should handle mixed error scenarios with retry logic', async () => {
    let attemptCount = 0;
    const mockOperation = jest.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount === 1) {
        throw new NetworkError('Network failed'); // Should retry
      }
      if (attemptCount === 2) {
        throw new Error('fetch failed'); // Should retry (network-like error)
      }
      if (attemptCount === 3) {
        throw new DatabaseError('DB failed'); // Should not retry
      }
      return Promise.resolve('success');
    });

    await expect(
      RetryManager.withRetry(
        mockOperation,
        5,
        (error) => {
          // Retry network errors but not database errors
          return error instanceof NetworkError || 
                 error.message.includes('fetch');
        }
      )
    ).rejects.toThrow('DB failed');

    expect(mockOperation).toHaveBeenCalledTimes(3); // Stopped at database error
  });
});