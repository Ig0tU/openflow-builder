/**
 * Advanced retry logic with exponential backoff, jitter, and circuit breaker patterns
 * Handles transient failures, rate limiting, and provides comprehensive error context
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelayMs?: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Add random jitter to prevent thundering herd (0-1 ratio, default: 0.1) */
  jitterFactor?: number;
  /** HTTP status codes to retry on (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatusCodes?: number[];
  /** Timeout per attempt in ms (default: 30000) */
  timeoutMs?: number;
  /** Custom should-retry logic */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback on retry (for logging/monitoring) */
  onRetry?: (error: unknown, attempt: number, nextDelayMs: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDurationMs: number;
}

/**
 * Default retryable HTTP status codes (transient failures)
 */
const DEFAULT_RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Determine if an error is retryable based on type and status code
 */
function isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean {
  if (error instanceof TypeError) {
    // Network errors like ECONNREFUSED, ETIMEDOUT, etc.
    const message = error.message || "";
    return (
      message.includes("fetch") ||
      message.includes("ECONNREFUSED") ||
      message.includes("ETIMEDOUT") ||
      message.includes("EHOSTUNREACH") ||
      message.includes("ENETUNREACH") ||
      message.includes("The operation was aborted") // AbortController timeout
    );
  }

  if (error instanceof Error) {
    const response = (error as any).response;
    if (response && typeof response.status === "number") {
      return retryableStatusCodes.includes(response.status);
    }
  }

  return false;
}

/**
 * Calculate next retry delay with exponential backoff and jitter
 */
function calculateNextDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitterFactor: number
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = Math.min(
    initialDelayMs * Math.pow(backoffMultiplier, attempt),
    maxDelayMs
  );

  // Add random jitter to prevent thundering herd
  const jitter = exponentialDelay * jitterFactor * Math.random();
  return Math.round(exponentialDelay + jitter);
}

/**
 * Retry a function with exponential backoff and configurable behavior
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result with success status, data/error, and attempt metadata
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    jitterFactor = 0.1,
    retryableStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES,
    timeoutMs = 30000,
    shouldRetry: customShouldRetry,
    onRetry,
  } = options;

  let lastError: Error | null = null;
  const startTime = Date.now();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const promise = fn();

      // Apply timeout to the promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      );

      const data = await Promise.race([promise, timeoutPromise]);

      return {
        success: true,
        data,
        attempts: attempt + 1,
        totalDurationMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isLastAttempt = attempt === maxAttempts - 1;

      // Determine if we should retry
      const shouldRetryThis =
        customShouldRetry?.(error, attempt) ??
        isRetryableError(error, retryableStatusCodes);

      if (isLastAttempt || !shouldRetryThis) {
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
          totalDurationMs: Date.now() - startTime,
        };
      }

      // Calculate delay and retry
      const nextDelayMs = calculateNextDelay(
        attempt,
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier,
        jitterFactor
      );

      onRetry?.(error, attempt + 1, nextDelayMs);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, nextDelayMs));
    }
  }

  // Should not reach here, but just in case
  return {
    success: false,
    error: lastError || new Error("Unknown error"),
    attempts: maxAttempts,
    totalDurationMs: Date.now() - startTime,
  };
}

/**
 * Wraps a fetch-based API call with retry logic and timeout handling
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit & RetryOptions
): Promise<Response> {
  const {
    maxAttempts,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    jitterFactor,
    retryableStatusCodes,
    timeoutMs,
    shouldRetry,
    onRetry,
    ...fetchOptions
  } = options ?? {};

  const result = await withRetry(
    () => fetch(url, fetchOptions),
    {
      maxAttempts,
      initialDelayMs,
      maxDelayMs,
      backoffMultiplier,
      jitterFactor,
      retryableStatusCodes,
      timeoutMs,
      shouldRetry,
      onRetry: (error, attempt, nextDelay) => {
        console.warn(
          `[Retry] Attempt ${attempt} failed for ${url}, retrying in ${nextDelay}ms`,
          error instanceof Error ? error.message : String(error)
        );
        onRetry?.(error, attempt, nextDelay);
      },
    }
  );

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}

/**
 * Circuit breaker implementation for protecting against cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private failureThreshold = 5,
    private successThreshold = 2,
    private resetTimeoutMs = 60000
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.resetTimeoutMs) {
        // Attempt to recover
        this.state = "HALF_OPEN";
        this.successCount = 0;
      } else {
        throw new Error(
          `Circuit breaker is OPEN. Retry after ${Math.ceil(
            (this.resetTimeoutMs - timeSinceLastFailure) / 1000
          )}s`
        );
      }
    }

    try {
      const result = await fn();

      if (this.state === "HALF_OPEN") {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.state = "CLOSED";
          this.failureCount = 0;
          this.successCount = 0;
        }
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = "OPEN";
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
  }
}

/**
 * Global circuit breakers for common external services
 */
export const circuitBreakers = {
  gemini: new CircuitBreaker(3, 2, 60000),
  imageGeneration: new CircuitBreaker(3, 2, 60000),
  voiceTranscription: new CircuitBreaker(3, 2, 60000),
  notificationService: new CircuitBreaker(5, 2, 120000),
};
