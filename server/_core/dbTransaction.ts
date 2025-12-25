/**
 * Database transaction management with advanced error handling and rollback support
 * Provides atomic operations with automatic rollback on failure
 */

import type { MySql2Database } from 'drizzle-orm/mysql2';

export type Db = MySql2Database<Record<string, never>>;

/**
 * Transaction context that tracks nested transactions and savepoints
 */
class TransactionContext {
  private transactionStack: string[] = [];
  private depth = 0;

  /**
   * Enter transaction (create savepoint for nested transactions)
   */
  enter(savepoint: string): void {
    this.transactionStack.push(savepoint);
    this.depth++;
  }

  /**
   * Exit transaction/savepoint
   */
  exit(): string | undefined {
    this.depth--;
    return this.transactionStack.pop();
  }

  /**
   * Get current depth (0 = outside transaction)
   */
  getDepth(): number {
    return this.depth;
  }

  /**
   * Check if inside transaction
   */
  isInTransaction(): boolean {
    return this.depth > 0;
  }

  /**
   * Get current savepoint name
   */
  getCurrentSavepoint(): string | undefined {
    return this.transactionStack[this.transactionStack.length - 1];
  }
}

const txContext = new TransactionContext();

/**
 * Execute a function within a database transaction with automatic rollback support
 * Supports nested transactions via savepoints
 */
export async function withTransaction<T>(
  db: Db,
  fn: (db: Db) => Promise<T>,
  options: {
    name?: string;
    isolation?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  } = {}
): Promise<T> {
  const { name = `txn_${Date.now()}`, isolation = 'READ COMMITTED' } = options;
  const depth = txContext.getDepth();

  try {
    if (depth === 0) {
      // Start main transaction
      await db.execute(`BEGIN ISOLATION LEVEL ${isolation}`);
      txContext.enter(name);

      try {
        const result = await fn(db);
        await db.execute('COMMIT');
        txContext.exit();
        return result;
      } catch (error) {
        // Rollback on error
        await db.execute('ROLLBACK').catch(err => {
          console.error('[Transaction] Failed to rollback:', err);
        });
        txContext.exit();
        throw error;
      }
    } else {
      // Nested transaction - use savepoint
      const savepointName = `${name}_${depth}`;

      try {
        await db.execute(`SAVEPOINT ${savepointName}`);
        txContext.enter(savepointName);

        const result = await fn(db);

        await db.execute(`RELEASE SAVEPOINT ${savepointName}`);
        txContext.exit();
        return result;
      } catch (error) {
        // Rollback to savepoint
        await db.execute(`ROLLBACK TO SAVEPOINT ${savepointName}`).catch(err => {
          console.error('[Transaction] Failed to rollback to savepoint:', err);
        });
        txContext.exit();
        throw error;
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Transaction] Error in transaction "${name}": ${errorMsg}`);
    throw error;
  }
}

/**
 * Execute multiple operations in a batch transaction
 * More efficient than individual transactions for bulk operations
 */
export async function withBatchTransaction<T>(
  db: Db,
  operations: Array<(db: Db) => Promise<void>>,
  options: { name?: string; stopOnError?: boolean } = {}
): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ index: number; error: Error }>;
}> {
  const { name = `batch_${Date.now()}`, stopOnError = true } = options;
  const errors: Array<{ index: number; error: Error }> = [];
  let successful = 0;
  let failed = 0;

  const result = await withTransaction(
    db,
    async (txDb) => {
      for (let i = 0; i < operations.length; i++) {
        try {
          await operations[i](txDb);
          successful++;
        } catch (error) {
          failed++;
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push({ index: i, error: err });

          if (stopOnError) {
            throw new Error(
              `Batch transaction "${name}" failed at operation ${i}: ${err.message}`
            );
          }

          // Continue with next operation if stopOnError is false
          console.warn(
            `[Transaction] Batch operation ${i} failed (continuing):`,
            err.message
          );
        }
      }
    },
    { name }
  ).catch(error => {
    // If transaction failed, return partial results
    return { successful, failed, errors };
  });

  // Return the result from withTransaction if successful, or the partial results
  if (errors.length === 0 && result === undefined) {
    return { successful, failed: 0, errors: [] };
  }

  return result ?? { successful, failed, errors };
}

/**
 * Execute operation with transaction timeout
 * Useful for preventing long-running transactions from blocking other operations
 */
export async function withTransactionTimeout<T>(
  db: Db,
  fn: (db: Db) => Promise<T>,
  timeoutMs: number = 30000,
  options: { name?: string } = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const timeoutHandle = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(
          new Error(
            `Transaction timeout after ${timeoutMs}ms (${options.name ?? 'unnamed'})`
          )
        );
      }
    }, timeoutMs);

    withTransaction(db, fn, options)
      .then(result => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve(result);
        }
      })
      .catch(error => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          reject(error);
        }
      });
  });
}

/**
 * Retry transaction on deadlock/concurrency errors
 */
export async function withRetryableTransaction<T>(
  db: Db,
  fn: (db: Db) => Promise<T>,
  maxRetries: number = 3,
  options: { name?: string; backoffMs?: number } = {}
): Promise<T> {
  const { name = 'retryable_txn', backoffMs = 100 } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(db, fn, { name: `${name}_attempt_${attempt}` });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable (deadlock, lock timeout, etc.)
      const errorMsg = lastError.message.toLowerCase();
      const isRetryable =
        errorMsg.includes('deadlock') ||
        errorMsg.includes('lock wait timeout') ||
        errorMsg.includes('1205') ||
        errorMsg.includes('1213');

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Wait before retry with exponential backoff
      const delayMs = backoffMs * Math.pow(2, attempt - 1);
      console.warn(
        `[Transaction] Retrying "${name}" after deadlock (attempt ${attempt}/${maxRetries}), waiting ${delayMs}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Transaction failed after retries');
}

/**
 * Get current transaction state info for debugging
 */
export function getTransactionState(): {
  depth: number;
  inTransaction: boolean;
  currentSavepoint: string | undefined;
} {
  return {
    depth: txContext.getDepth(),
    inTransaction: txContext.isInTransaction(),
    currentSavepoint: txContext.getCurrentSavepoint(),
  };
}
