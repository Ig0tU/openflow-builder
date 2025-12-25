# OpenFlow Builder - Code Quality Improvements

This document outlines all production-grade enhancements made to the OpenFlow Builder codebase to improve reliability, security, and maintainability.

## Summary of Improvements

### 1. Advanced Retry Logic with Exponential Backoff (`server/_core/retry.ts`)

**What was fixed:**
- All external API calls lacked retry logic, causing immediate failures on network issues
- No exponential backoff or jitter, leading to thundering herd problems
- No timeout handling, allowing requests to hang indefinitely

**New features:**
- `withRetry()` function with configurable exponential backoff and jitter
- `CircuitBreaker` class to prevent cascading failures
- Automatic timeout enforcement (30s default)
- Distinguishes between retryable (429, 503) and non-retryable errors (4xx)
- Pre-configured circuit breakers for external services

**Usage:**
```typescript
import { withRetry, circuitBreakers } from '@/server/_core/retry';

// Simple retry with defaults
const result = await withRetry(
  () => fetch('/api/endpoint'),
  { maxAttempts: 3, initialDelayMs: 1000 }
);

// With circuit breaker
const result = await circuitBreakers.gemini.execute(async () => {
  return await aiService.generate(request);
});
```

---

### 2. Observability & Request Tracking (`server/_core/observability.ts`)

**What was fixed:**
- No request ID tracking, impossible to correlate logs across distributed calls
- Errors lost context about which user/action caused them
- No structured logging for debugging production issues

**New features:**
- Request context management with unique request IDs
- Structured logging with user/action/metadata
- Error context builder with automatic sensitive data redaction
- Decorators for automatic function execution tracking
- Request-scoped error context propagation

**Usage:**
```typescript
import { observability, createContextualError } from '@/server/_core/observability';

// Create context for a request
const ctx = observability.createContext(userId, { action: 'project.create' });

// Log with context
observability.log('info', ctx.requestId, 'Project created', { projectId: 123 });

// Create error with context
throw createContextualError(
  'Failed to create project',
  ctx.requestId,
  'project.create',
  input,
  { reason: 'database constraint' }
);
```

---

### 3. Enhanced AI Service (`server/aiService.ts`)

**What was fixed:**
- All AI API calls used bare `axios.post()` without retry or timeout
- AI-generated JSON was parsed without schema validation
- No input size validation, allowing memory exhaustion
- Errors didn't distinguish between API failure types

**New features:**
- All provider integrations (Gemini, Grok, OpenRouter, Ollama) with retry + circuit breaker
- 60-second timeouts on all API calls
- Zod schema validation for all AI-generated responses
- Input validation (max 50KB per request)
- Sanitized error messages that don't expose internal details
- Temperature/token limits enforced programmatically

**Usage:**
```typescript
import { createAIService } from '@/server/aiService';

const service = createAIService(config);

// Automatically includes retry, timeout, circuit breaker, and validation
const response = await service.generateWebsiteStructure(prompt);
// Response is guaranteed to match WebsiteStructureSchema or throws validated error
```

---

### 4. Advanced Database Transactions (`server/_core/dbTransaction.ts` & `server/_core/dbEnhanced.ts`)

**What was fixed:**
- Multi-step database operations (duplicate project, delete cascade) weren't atomic
- Orphaned resources if operation failed midway
- Recursive delete caused stack overflow on deep hierarchies
- No transaction retry logic for deadlocks
- Bulk operations returned all records instead of created ones

**New features:**
- `withTransaction()` for atomic operations with automatic rollback
- `withBatchTransaction()` for bulk operations
- `withRetryableTransaction()` automatically retries on deadlocks
- Nested transaction support via savepoints
- `deleteElementWithChildren()` with iterative depth-limited traversal
- `createElementsBatch()` returning only created elements
- `duplicateProjectAtomically()` for safe project duplication
- `deleteProjectAtomically()` for safe cascading deletes
- Data integrity checking with orphan detection

**Usage:**
```typescript
import { withTransaction, deleteElementWithChildren } from '@/server/_core/dbEnhanced';

// Atomic operation with rollback on failure
await withTransaction(db, async (txDb) => {
  const newProject = await txDb.insert(projects).values(...);
  const newPage = await txDb.insert(pages).values(...);
  // Both succeed or both rollback - no partial state
});

// Safe element deletion with depth limit
const result = await deleteElementWithChildren(db, elementId);
// Returns { deletedCount } - never causes stack overflow
```

---

### 5. Input Validation Schemas (`shared/validation.ts`)

**What was fixed:**
- tRPC procedures used minimal Zod validation
- No file size validation before processing
- No HTML/CSS sanitization
- No max length enforcement on user inputs
- Sensitive data could leak in error messages

**New features:**
- Comprehensive Zod schemas for all inputs with sensible limits
- File size validation (50MB max)
- HTML/CSS sanitization functions
- Project name/description length limits
- Element content size limits (50KB)
- AI prompt limits with character validation
- Slug validation (lowercase, alphanumeric + hyphens)
- Automatic sensitive data redaction in logs
- Type-safe input types exported from schemas

**Usage:**
```typescript
import { CreateProjectInputSchema, sanitizeHtml } from '@/shared/validation';

// In tRPC procedure
create: protectedProcedure
  .input(CreateProjectInputSchema)
  .mutation(async ({ input }) => {
    // input is type-safe and validated
    const project = await db.createProject(input);
    return project;
  }),

// Manual validation
const validated = CreateProjectInputSchema.parse(untrustedInput);

// Content sanitization
const safe = sanitizeHtml(userHtml);
```

---

## Integration Guide

### Step 1: Update Package Imports

In files that need these utilities, add imports:

```typescript
// Retry logic
import { withRetry, circuitBreakers } from '@/server/_core/retry';

// Observability
import { observability } from '@/server/_core/observability';

// Database transactions
import { withTransaction, withRetryableTransaction } from '@/server/_core/dbTransaction';
import * as dbEnhanced from '@/server/_core/dbEnhanced';

// Validation
import { CreateProjectInputSchema } from '@shared/validation';
```

### Step 2: Update Existing Routers

Replace simple error handling with comprehensive validation and error context:

**Before:**
```typescript
create: protectedProcedure
  .input(z.object({ name: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      return db.createProject({
        userId: ctx.user.id,
        name: input.name,
      });
    } catch (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    }
  }),
```

**After:**
```typescript
create: protectedProcedure
  .input(CreateProjectInputSchema)
  .mutation(async ({ input, ctx }) => {
    const requestId = nanoid();
    try {
      const result = await withTransaction(db, async (txDb) => {
        return await dbEnhanced.createProject(txDb, {
          userId: ctx.user.id,
          ...input,
        });
      });

      observability.log('info', requestId, 'Project created', { projectId: result.id });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      observability.log('error', requestId, 'Failed to create project', {
        error: err.message,
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create project. Please try again.',
      });
    }
  }),
```

### Step 3: Update API Integration Points

Wrap all external API calls with retry logic:

**Before:**
```typescript
const response = await axios.post(apiUrl, data);
```

**After:**
```typescript
const result = await circuitBreakers.gemini.execute(async () => {
  return await withRetry(
    () => axios.post(apiUrl, data, { timeout: 30000 }),
    { maxAttempts: 3, initialDelayMs: 1000 }
  );
});

if (!result.success) {
  throw new Error(`API failed after ${result.attempts} attempts: ${result.error?.message}`);
}

return result.data;
```

### Step 4: Update Cascade Operations

Replace manual database operations with atomic transactions:

**Before:**
```typescript
async function deleteProject(projectId: number) {
  const pages = await db.select().from(pages).where(eq(pages.projectId, projectId));
  for (const page of pages) {
    await db.delete(elements).where(eq(elements.pageId, page.id));
  }
  await db.delete(pages).where(eq(pages.projectId, projectId));
  await db.delete(projects).where(eq(projects.id, projectId));
}
```

**After:**
```typescript
async function deleteProject(projectId: number) {
  const result = await dbEnhanced.deleteProjectAtomically(db, projectId);
  return result; // { deletedPages, deletedElements }
}
```

---

## Performance Impact

### Improved Reliability
- **Retry Logic**: Recovers from transient failures (network blips, rate limiting, temporary service outages)
- **Circuit Breaker**: Fails fast when external services are down, preventing resource waste
- **Timeouts**: Prevents requests from hanging indefinitely

### Better Observability
- **Request IDs**: Correlate logs across the entire request lifecycle
- **Structured Logging**: Query logs by action, user, or error type
- **Error Context**: Includes input data (sanitized), user, timestamp, and duration

### Data Integrity
- **Transactions**: Multi-step operations are atomic (all-or-nothing)
- **Retry Logic**: Handles transient database errors (deadlocks)
- **Depth Limits**: Prevents stack overflow in recursive operations

### Security
- **Input Validation**: Rejects oversized, malformed, or suspicious inputs
- **Content Sanitization**: Removes XSS and CSS injection vectors
- **Sensitive Data Redaction**: Never logs passwords, tokens, or API keys

---

## Configuration

### Retry Defaults (in `server/_core/retry.ts`)
```typescript
const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,              // Retry up to 3 times
  initialDelayMs: 1000,        // Start with 1 second delay
  maxDelayMs: 30000,           // Cap delay at 30 seconds
  backoffMultiplier: 2,        // Double delay each attempt
  jitterFactor: 0.1,           // Add 10% random jitter
  timeoutMs: 30000,            // 30 second timeout per attempt
};
```

### Circuit Breaker Defaults (in `server/_core/retry.ts`)
```typescript
new CircuitBreaker(
  5,        // Open after 5 failures
  2,        // Close after 2 successes
  60000     // Reset timeout (1 minute)
)
```

### Input Size Limits (in `shared/validation.ts`)
```typescript
const LIMITS = {
  FILE_SIZE_MAX: 50 * 1024 * 1024,      // 50MB files
  ELEMENT_CONTENT_MAX: 50000,            // 50KB element content
  ELEMENT_STYLES_MAX: 100000,            // 100KB styles
  HTML_CODE_MAX: 100000,                 // 100KB HTML for analysis
  AI_PROMPT_MAX: 10000,                  // 10KB AI prompts
};
```

---

## Monitoring & Debugging

### Viewing Request Logs
```typescript
import { observability } from '@/server/_core/observability';

// Get logs for a specific request
const logs = observability.getRequestLogs(requestId);

// Logs include: timestamp, level, message, user, data
logs.forEach(log => {
  console.log(`[${log.level}] ${log.message}`, log.data);
});
```

### Checking Circuit Breaker Status
```typescript
import { circuitBreakers } from '@/server/_core/retry';

const status = circuitBreakers.gemini.getState();
console.log(`Gemini API: ${status}`); // CLOSED, OPEN, or HALF_OPEN
```

### Verifying Data Integrity
```typescript
import * as dbEnhanced from '@/server/_core/dbEnhanced';

const integrity = await dbEnhanced.checkProjectIntegrity(db, projectId);
if (!integrity.isValid) {
  console.error('Data integrity issues:', integrity.issues);
}
```

---

## Testing

### Unit Testing with Mocked Retries
```typescript
import { withRetry } from '@/server/_core/retry';

it('retries on transient failure', async () => {
  let attempts = 0;

  const result = await withRetry(
    async () => {
      attempts++;
      if (attempts < 2) throw new Error('Timeout');
      return 'success';
    },
    { maxAttempts: 3, initialDelayMs: 10 } // Short delay for tests
  );

  expect(result.success).toBe(true);
  expect(result.attempts).toBe(2);
});
```

### Testing Transactions
```typescript
import { withTransaction } from '@/server/_core/dbTransaction';

it('rolls back on error', async () => {
  const testDb = await createTestDatabase();

  try {
    await withTransaction(testDb, async (txDb) => {
      await txDb.insert(projects).values({ name: 'Test' });
      throw new Error('Simulated error');
    });
  } catch {
    // Expected
  }

  // Verify no project was created
  const projects = await testDb.select().from(projectsTable);
  expect(projects).toHaveLength(0);
});
```

---

## Migration Checklist

- [ ] Copy `server/_core/retry.ts` (4.5 KB)
- [ ] Copy `server/_core/observability.ts` (5.8 KB)
- [ ] Copy `server/_core/dbTransaction.ts` (5.2 KB)
- [ ] Copy `server/_core/dbEnhanced.ts` (9.1 KB)
- [ ] Copy `shared/validation.ts` (8.3 KB)
- [ ] Update `server/aiService.ts` with new imports and implementations
- [ ] Update `server/routers.ts` to use validation schemas
- [ ] Update database operations to use `dbEnhanced` functions
- [ ] Update API calls to use `withRetry()` and circuit breakers
- [ ] Add request IDs to tRPC context middleware
- [ ] Run tests: `pnpm test`
- [ ] Type check: `pnpm check`
- [ ] Build: `pnpm build`

---

## Files Created/Modified

### New Files (Production-Ready)
- `server/_core/retry.ts` - Retry logic and circuit breakers
- `server/_core/observability.ts` - Request tracking and structured logging
- `server/_core/dbTransaction.ts` - Database transaction management
- `server/_core/dbEnhanced.ts` - Enhanced database operations with transactions
- `shared/validation.ts` - Comprehensive input validation schemas

### Modified Files
- `server/aiService.ts` - Enhanced with retry, timeout, and schema validation
- `CLAUDE.md` - Updated with new architecture patterns

### Documentation
- `IMPROVEMENTS.md` - This document

---

## Production Recommendations

1. **Enable Structured Logging**: Integrate request logs into your observability platform (Datadog, New Relic, etc.)
2. **Monitor Circuit Breakers**: Alert when circuit breakers are open
3. **Set Up Request Tracing**: Use request IDs to trace failures end-to-end
4. **Review Retry Policies**: Adjust timeouts based on your API SLAs
5. **Database Connection Pooling**: Configure appropriate pool size in production
6. **Rate Limiting**: Consider adding rate limiting on top of retry logic to prevent abuse

---

## Support & Questions

For questions about specific implementations, refer to:
- Retry logic: `server/_core/retry.ts` comments
- Transactions: `server/_core/dbTransaction.ts` comments
- Validation: `shared/validation.ts` comments
- Observability: `server/_core/observability.ts` comments
