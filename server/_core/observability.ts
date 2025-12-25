/**
 * Advanced observability and error tracking with request context
 * Provides structured logging, request ID correlation, and error metadata
 */

import { nanoid } from "nanoid";

export interface RequestContext {
  requestId: string;
  userId?: number | string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface ErrorContext {
  requestId: string;
  userId?: number | string;
  action: string;
  input?: unknown;
  error: Error;
  metadata: Record<string, unknown>;
  timestamp: number;
  durationMs?: number;
}

export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  requestId: string;
  timestamp: number;
  message: string;
  data?: unknown;
  userId?: number | string;
}

/**
 * Global request context storage using async local storage pattern
 */
class RequestContextManager {
  private contexts = new Map<string, RequestContext>();
  private logs: LogEntry[] = [];
  private maxLogs = 10000;

  /**
   * Create a new request context
   */
  createContext(userId?: number | string, metadata: Record<string, unknown> = {}): RequestContext {
    const context: RequestContext = {
      requestId: nanoid(12),
      userId,
      timestamp: Date.now(),
      metadata,
    };

    this.contexts.set(context.requestId, context);
    return context;
  }

  /**
   * Get current request context by ID
   */
  getContext(requestId: string): RequestContext | undefined {
    return this.contexts.get(requestId);
  }

  /**
   * Clear request context
   */
  clearContext(requestId: string): void {
    this.contexts.delete(requestId);
  }

  /**
   * Add structured log entry
   */
  log(
    level: LogEntry["level"],
    requestId: string,
    message: string,
    data?: unknown,
    userId?: number | string
  ): void {
    const entry: LogEntry = {
      level,
      requestId,
      timestamp: Date.now(),
      message,
      data,
      userId,
    };

    this.logs.push(entry);

    // Keep logs bounded in memory
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console in development
    if (process.env.NODE_ENV === "development") {
      const prefix = `[${requestId}]`;
      const logFn = console[level] || console.log;
      logFn(prefix, message, data ? data : "");
    }
  }

  /**
   * Get logs for a specific request
   */
  getRequestLogs(requestId: string): LogEntry[] {
    return this.logs.filter(log => log.requestId === requestId);
  }

  /**
   * Build comprehensive error context for logging/debugging
   */
  createErrorContext(
    requestId: string,
    action: string,
    error: unknown,
    input?: unknown,
    metadata: Record<string, unknown> = {},
    durationMs?: number
  ): ErrorContext {
    const context = this.getContext(requestId);
    const errorObj = error instanceof Error ? error : new Error(String(error));

    return {
      requestId,
      userId: context?.userId,
      action,
      input: input ? this.sanitizeInput(input) : undefined,
      error: errorObj,
      metadata,
      timestamp: Date.now(),
      durationMs,
    };
  }

  /**
   * Sanitize sensitive data from input (passwords, tokens, etc.)
   */
  private sanitizeInput(input: unknown): unknown {
    if (typeof input !== "object" || input === null) {
      return input;
    }

    const sensitiveKeys = ["password", "token", "secret", "apiKey", "Authorization", "Cookie"];
    const copy = JSON.parse(JSON.stringify(input));

    const sanitize = (obj: any): void => {
      if (typeof obj !== "object" || obj === null) return;

      Object.keys(obj).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (
          sensitiveKeys.some(
            sensitive => lowerKey.includes(sensitive.toLowerCase())
          )
        ) {
          obj[key] = "[REDACTED]";
        } else if (typeof obj[key] === "object") {
          sanitize(obj[key]);
        }
      });
    };

    sanitize(copy);
    return copy;
  }

  /**
   * Format error context for logging/reporting
   */
  formatErrorContext(ctx: ErrorContext): string {
    return `
[Error Context]
Request ID: ${ctx.requestId}
User ID: ${ctx.userId ?? "anonymous"}
Action: ${ctx.action}
Timestamp: ${new Date(ctx.timestamp).toISOString()}
Duration: ${ctx.durationMs ?? "unknown"}ms
Error: ${ctx.error.message}
Stack: ${ctx.error.stack}
Input: ${JSON.stringify(ctx.input, null, 2)}
Metadata: ${JSON.stringify(ctx.metadata, null, 2)}
    `.trim();
  }
}

export const observability = new RequestContextManager();

/**
 * Enhanced error class that carries request context
 */
export class ContextualError extends Error {
  constructor(
    message: string,
    public requestId: string,
    public action: string,
    public input?: unknown,
    public metadata: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "ContextualError";
  }
}

/**
 * Create an error with full context for better debugging
 */
export function createContextualError(
  message: string,
  requestId: string,
  action: string,
  input?: unknown,
  metadata: Record<string, unknown> = {}
): ContextualError {
  return new ContextualError(message, requestId, action, input, metadata);
}

/**
 * Decorator for tracking async function execution with observability
 */
export function trackAsyncExecution(action: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const requestId = nanoid(12);
      const startTime = Date.now();

      try {
        observability.log("debug", requestId, `Starting: ${action}`);
        const result = await originalMethod.apply(this, args);
        const durationMs = Date.now() - startTime;

        observability.log("info", requestId, `Completed: ${action}`, {
          durationMs,
        });

        return result;
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorCtx = observability.createErrorContext(
          requestId,
          action,
          error,
          args[0],
          {},
          durationMs
        );

        observability.log(
          "error",
          requestId,
          `Failed: ${action}`,
          {
            error: error instanceof Error ? error.message : String(error),
            durationMs,
          }
        );

        console.error(observability.formatErrorContext(errorCtx));
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Create a middleware-like wrapper for sync/async functions with observability
 */
export function withObservability<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  action: string,
  requestId?: string
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>) => {
    const id = requestId || nanoid(12);
    const startTime = Date.now();

    try {
      observability.log("debug", id, `Starting: ${action}`, {
        args: args[0],
      });

      const result = await fn(...args);
      const durationMs = Date.now() - startTime;

      observability.log("info", id, `Completed: ${action}`, {
        durationMs,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorCtx = observability.createErrorContext(
        id,
        action,
        error,
        args[0],
        {},
        durationMs
      );

      observability.log(
        "error",
        id,
        `Failed: ${action}`,
        {
          error: error instanceof Error ? error.message : String(error),
          durationMs,
        }
      );

      console.error(observability.formatErrorContext(errorCtx));
      throw error;
    }
  };
}

/**
 * Async Local Storage-inspired context propagation for tRPC
 */
export class ContextStack {
  private stack: RequestContext[] = [];

  push(context: RequestContext): void {
    this.stack.push(context);
  }

  pop(): RequestContext | undefined {
    return this.stack.pop();
  }

  current(): RequestContext | undefined {
    return this.stack[this.stack.length - 1];
  }

  clear(): void {
    this.stack = [];
  }
}

export const contextStack = new ContextStack();
