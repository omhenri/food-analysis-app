import { Alert } from 'react-native';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  AI_ANALYSIS = 'AI_ANALYSIS',
  UNKNOWN = 'UNKNOWN',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly userMessage: string;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

  constructor(
    type: ErrorType,
    message: string,
    userMessage: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.timestamp = new Date();
  }
}

// Network error handling
export class NetworkError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(
      ErrorType.NETWORK,
      message,
      'Network connection failed. Please check your internet connection and try again.',
      ErrorSeverity.MEDIUM,
      originalError
    );
  }
}

// Database error handling
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(
      ErrorType.DATABASE,
      message,
      'Data storage error occurred. Your data may not be saved properly.',
      ErrorSeverity.HIGH,
      originalError
    );
  }
}

// Validation error handling
export class ValidationError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(
      ErrorType.VALIDATION,
      message,
      userMessage || 'Please check your input and try again.',
      ErrorSeverity.LOW
    );
  }
}

// AI Analysis error handling
export class AIAnalysisError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(
      ErrorType.AI_ANALYSIS,
      message,
      'Food analysis failed. Using offline analysis instead.',
      ErrorSeverity.MEDIUM,
      originalError
    );
  }
}

// Error handler class
export class ErrorHandler {
  private static errorLog: AppError[] = [];
  private static maxLogSize = 100;

  // Log error
  public static logError(error: AppError): void {
    console.error(`[${error.type}] ${error.message}`, error.originalError);
    
    // Add to error log
    this.errorLog.unshift(error);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }
  }

  // Handle error with user feedback
  public static handleError(error: Error | AppError, showAlert: boolean = true): void {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else {
      // Convert generic error to AppError
      appError = this.convertToAppError(error);
    }

    // Log the error
    this.logError(appError);

    // Show user feedback if requested
    if (showAlert) {
      this.showUserFeedback(appError);
    }
  }

  // Convert generic error to AppError
  private static convertToAppError(error: Error): AppError {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return new NetworkError(error.message, error);
    }

    if (message.includes('database') || message.includes('sqlite')) {
      return new DatabaseError(error.message, error);
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return new ValidationError(error.message);
    }

    if (message.includes('ai') || message.includes('analysis')) {
      return new AIAnalysisError(error.message, error);
    }

    return new AppError(
      ErrorType.UNKNOWN,
      error.message,
      'An unexpected error occurred. Please try again.',
      ErrorSeverity.MEDIUM,
      error
    );
  }

  // Show user feedback
  private static showUserFeedback(error: AppError): void {
    const title = this.getErrorTitle(error.type);
    
    Alert.alert(
      title,
      error.userMessage,
      [
        {
          text: 'OK',
          style: 'default',
        },
        ...(error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL
          ? [
              {
                text: 'Report Issue',
                style: 'default',
                onPress: () => this.reportIssue(error),
              },
            ]
          : []),
      ]
    );
  }

  // Get error title based on type
  private static getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Connection Error';
      case ErrorType.DATABASE:
        return 'Data Error';
      case ErrorType.VALIDATION:
        return 'Input Error';
      case ErrorType.AI_ANALYSIS:
        return 'Analysis Error';
      default:
        return 'Error';
    }
  }

  // Report issue (placeholder for future implementation)
  private static reportIssue(error: AppError): void {
    console.log('Reporting issue:', error);
    // TODO: Implement error reporting to analytics service
  }

  // Get error log
  public static getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  // Clear error log
  public static clearErrorLog(): void {
    this.errorLog = [];
  }

  // Check if error is recoverable
  public static isRecoverable(error: AppError): boolean {
    return error.type === ErrorType.NETWORK || error.type === ErrorType.AI_ANALYSIS;
  }

  // Get retry delay based on attempt number
  public static getRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
  }
}

// Retry mechanism utility
export class RetryManager {
  public static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    shouldRetry?: (error: Error) => boolean
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry this error
        if (shouldRetry && !shouldRetry(lastError)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retrying
        const delay = ErrorHandler.getRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Retry attempt ${attempt} after ${delay}ms delay`);
      }
    }

    throw lastError!;
  }
}

// Network status utility
export class NetworkStatus {
  private static isOnline: boolean = true;
  private static listeners: ((isOnline: boolean) => void)[] = [];

  public static setOnlineStatus(isOnline: boolean): void {
    if (this.isOnline !== isOnline) {
      this.isOnline = isOnline;
      this.notifyListeners();
    }
  }

  public static getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public static addListener(listener: (isOnline: boolean) => void): void {
    this.listeners.push(listener);
  }

  public static removeListener(listener: (isOnline: boolean) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private static notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }
}