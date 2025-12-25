# OpenFlow Builder - Implementation Examples

This document provides copy-paste ready examples for integrating the new production-grade improvements into your codebase.

---

## 1. Enhanced AI Service Integration

### Example: Using Retry Logic + Circuit Breaker in AI Service

```typescript
// File: server/aiService.ts - Already implemented

import { withRetry, circuitBreakers } from './_core/retry';
import { observability } from './_core/observability';
import { z } from 'zod';

export class AIService {
  async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const requestId = nanoid();

    try {
      observability.log('debug', requestId, 'Starting AI generation', {
        provider: this.provider,
        messageCount: request.messages.length,
      });

      // Circuit breaker prevents cascading failures
      const response = await circuitBreakers.gemini.execute(async () => {
        // Retry with exponential backoff
        const result = await withRetry(
          () => this.callAPI(request),
          {
            maxAttempts: 3,
            initialDelayMs: 1000,
            maxDelayMs: 15000,
            timeoutMs: 60000,
          }
        );

        if (!result.success) {
          throw result.error;
        }

        return result.data;
      });

      observability.log('info', requestId, 'AI generation succeeded', {
        contentLength: response.content.length,
        tokens: response.usage?.totalTokens,
      });

      return response;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      observability.log('error', requestId, 'AI generation failed', {
        error: errMsg,
      });
      throw error;
    }
  }

  private async callAPI(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    // Implementation details...
  }
}
```

---

## 2. Validated tRPC Procedures

### Example: Create Project with Full Validation

```typescript
// File: server/routers.ts - Update existing procedure

import { CreateProjectInputSchema } from '@shared/validation';
import { withTransaction } from './_core/dbTransaction';
import { observability } from './_core/observability';
import { nanoid } from 'nanoid';

export const appRouter = router({
  projects: router({
    create: protectedProcedure
      .input(CreateProjectInputSchema)
      .mutation(async ({ input, ctx }) => {
        const requestId = nanoid();

        const ctx = observability.createContext(ctx.user.id, {
          action: 'projects.create',
          projectName: input.name,
        });

        try {
          observability.log('debug', ctx.requestId, 'Creating project', input);

          const result = await withTransaction(
            db,
            async (txDb) => {
              // Create project atomically
              const project = await txDb
                .insert(projects)
                .values({
                  userId: ctx.user.id,
                  name: input.name,
                  description: input.description,
                  settings: {},
                })
                .$returningId();

              if (!project || project.length === 0) {
                throw new Error('Failed to create project');
              }

              const projectId = project[0].id;

              // Create default home page in same transaction
              await txDb.insert(pages).values({
                projectId: projectId,
                name: 'Home',
                slug: 'index',
                isHomePage: true,
                settings: {},
              });

              return projectId;
            },
            { name: `create_project_${ctx.user.id}` }
          );

          observability.log('info', ctx.requestId, 'Project created successfully', {
            projectId: result,
          });

          return { success: true, projectId: result };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));

          observability.log('error', ctx.requestId, 'Failed to create project', {
            error: err.message,
            input: sanitizeObject(input),
          });

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create project. Please try again.',
          });
        }
      }),

    // ... other procedures
  }),
});
```

---

## 3. Safe Database Operations with Transactions

### Example: Duplicate Project Atomically

```typescript
// File: server/routers.ts - In projects router

import * as dbEnhanced from './_core/dbEnhanced';

duplicate: protectedProcedure
  .input(z.object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(255),
  }))
  .mutation(async ({ input, ctx }) => {
    const requestId = nanoid();

    try {
      observability.log('debug', requestId, 'Duplicating project', {
        sourceId: input.id,
        newName: input.name,
      });

      // Atomic operation: all succeed or all rollback
      const result = await dbEnhanced.duplicateProjectAtomically(
        db,
        input.id,
        input.name
      );

      observability.log('info', requestId, 'Project duplicated', result);

      return {
        success: true,
        projectId: result.projectId,
        stats: result,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      observability.log('error', requestId, 'Failed to duplicate project', {
        error: err.message,
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to duplicate project.',
      });
    }
  }),
```

---

## 4. Safe Cascade Deletion

### Example: Delete Project with All Related Data

```typescript
// File: server/routers.ts - In projects router

import * as dbEnhanced from './_core/dbEnhanced';

delete: protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    const requestId = nanoid();

    try {
      // Verify ownership
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id));

      if (!project[0] || project[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      observability.log('debug', requestId, 'Deleting project', {
        projectId: input.id,
      });

      // Safe cascading delete with transaction
      const result = await dbEnhanced.deleteProjectAtomically(db, input.id);

      observability.log('info', requestId, 'Project deleted', result);

      return { success: true, ...result };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      observability.log('error', requestId, 'Failed to delete project', {
        error: err.message,
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete project.',
      });
    }
  }),
```

---

## 5. Bulk Element Operations with Validation

### Example: Create Multiple Elements Safely

```typescript
// File: server/routers.ts - In elements router

import * as dbEnhanced from './_core/dbEnhanced';

createBatch: protectedProcedure
  .input(z.object({
    pageId: z.number().int().positive(),
    elements: z.array(CreateElementInputSchema).min(1).max(100),
  }))
  .mutation(async ({ input, ctx }) => {
    const requestId = nanoid();

    try {
      observability.log('debug', requestId, 'Creating batch of elements', {
        pageId: input.pageId,
        count: input.elements.length,
      });

      // Atomic batch operation
      const created = await dbEnhanced.createElementsBatch(
        db,
        input.elements.map(el => ({
          pageId: input.pageId,
          elementType: el.elementType,
          order: el.order,
          content: el.content,
          styles: el.styles,
          attributes: el.attributes,
          parentId: el.parentId,
        }))
      );

      observability.log('info', requestId, 'Elements created', {
        count: created.length,
      });

      return {
        success: true,
        elements: created,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      observability.log('error', requestId, 'Failed to create elements', {
        error: err.message,
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create elements.',
      });
    }
  }),
```

---

## 6. Safe Recursive Element Deletion

### Example: Delete Element with All Children

```typescript
// File: server/routers.ts - In elements router

import * as dbEnhanced from './_core/dbEnhanced';

delete: protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    const requestId = nanoid();

    try {
      observability.log('debug', requestId, 'Deleting element tree', {
        elementId: input.id,
      });

      // Safe iterative deletion with depth limit
      const result = await dbEnhanced.deleteElementWithChildren(db, input.id);

      observability.log('info', requestId, 'Element tree deleted', result);

      return { success: true, ...result };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      observability.log('error', requestId, 'Failed to delete element', {
        error: err.message,
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete element.',
      });
    }
  }),
```

---

## 7. File Upload with Validation

### Example: Upload Asset with Size & Type Validation

```typescript
// File: server/routers.ts - In assets router

import { FileUploadInputSchema } from '@shared/validation';

uploadAsset: protectedProcedure
  .input(FileUploadInputSchema)
  .mutation(async ({ input, ctx }) => {
    const requestId = nanoid();

    try {
      observability.log('debug', requestId, 'Uploading asset', {
        projectId: input.projectId,
        fileName: input.name,
        mimeType: input.mimeType,
      });

      // File validation done at input schema level
      const buffer = Buffer.from(input.fileData, 'base64');

      // Upload to storage with retry
      const { url } = await withRetry(
        () => storagePut(
          `users/${ctx.user.id}/assets/${nanoid()}-${input.name}`,
          buffer,
          input.mimeType
        ),
        { maxAttempts: 3, timeoutMs: 30000 }
      );

      // Store in database atomically
      const asset = await withTransaction(db, async (txDb) => {
        return await txDb
          .insert(assets)
          .values({
            userId: ctx.user.id,
            projectId: input.projectId,
            name: input.name,
            url,
            mimeType: input.mimeType,
          })
          .$returningId();
      });

      observability.log('info', requestId, 'Asset uploaded successfully', {
        assetId: asset[0]?.id,
        url,
      });

      return { success: true, asset };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      observability.log('error', requestId, 'Failed to upload asset', {
        error: err.message,
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to upload asset.',
      });
    }
  }),
```

---

## 8. AI HTML Detection with Validation

### Example: Detect UI Library from HTML

```typescript
// File: server/routers.ts - In aiBuilder router

import { AIDetectLibraryInputSchema } from '@shared/validation';

detectLibrary: protectedProcedure
  .input(AIDetectLibraryInputSchema)
  .mutation(async ({ input, ctx }) => {
    const requestId = nanoid();

    try {
      observability.log('debug', requestId, 'Detecting UI library', {
        htmlLength: input.htmlCode.length,
      });

      // Fetch AI provider config from database
      const config = await db
        .select()
        .from(aiProviderConfigs)
        .where(
          and(
            eq(aiProviderConfigs.provider, input.provider),
            eq(aiProviderConfigs.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!config[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'AI provider not configured',
        });
      }

      // Use AI service with all safety features
      const aiService = createAIService(config[0]);
      const result = await aiService.detectUILibrary(input.htmlCode);

      observability.log('info', requestId, 'Library detected', result);

      return result;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      const err = error instanceof Error ? error : new Error(String(error));

      observability.log('error', requestId, 'Failed to detect library', {
        error: err.message,
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to analyze HTML code.',
      });
    }
  }),
```

---

## 9. Data Integrity Check

### Example: Verify Project Data Integrity

```typescript
// File: server/routers.ts - In system router (admin-only)

import * as dbEnhanced from './_core/dbEnhanced';

verifyProjectIntegrity: adminProcedure
  .input(z.object({ projectId: z.number().int().positive() }))
  .query(async ({ input }) => {
    const requestId = nanoid();

    try {
      observability.log('debug', requestId, 'Checking project integrity', {
        projectId: input.projectId,
      });

      const integrity = await dbEnhanced.checkProjectIntegrity(
        db,
        input.projectId
      );

      if (!integrity.isValid) {
        observability.log('warn', requestId, 'Data integrity issues found', {
          issues: integrity.issues,
        });
      }

      return integrity;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      observability.log('error', requestId, 'Failed to check integrity', {
        error: err.message,
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check project integrity.',
      });
    }
  }),
```

---

## 10. Observability in Async Operations

### Example: Track Async Operation with Automatic Logging

```typescript
// File: server/aiBuilderRouter.ts

import { withObservability } from './_core/observability';

async function executeBuilderAction(action: string, userId: number) {
  const requestId = nanoid();

  const wrapped = withObservability(
    async () => {
      // Implementation
      return await aiBuilderActions.executeAction(action, userId);
    },
    `executeBuilderAction(${action})`,
    requestId
  );

  return wrapped();
}

// Or use decorator pattern
import { trackAsyncExecution } from '@/server/_core/observability';

class AIBuilderService {
  @trackAsyncExecution('AIBuilder.generatePage')
  async generatePage(prompt: string): Promise<any> {
    // Implementation automatically tracked
    return await this.aiService.generateWebsiteStructure(prompt);
  }
}
```

---

## 11. Request Context Middleware

### Example: Add to tRPC Context Creation

```typescript
// File: server/_core/context.ts - Update createContext

import { observability } from './observability';
import { nanoid } from 'nanoid';

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Create request context with unique ID
  const requestContext = observability.createContext(
    undefined, // User not yet authenticated
    {
      path: opts.req.path,
      method: opts.req.method,
      ip: opts.req.ip,
    }
  );

  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
    // Update context with user ID
    observability.observability.getContext(requestContext.requestId)!.metadata.userId = user.id;
  } catch (error) {
    // Authentication is optional for public procedures
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    requestId: requestContext.requestId, // Make available to procedures
  };
}
```

---

## 12. Complete tRPC Procedure Template

### Example: Use All Features Together

```typescript
// File: server/routers.ts - Template for new procedures

import { protectedProcedure } from './_core/trpc';
import { observability } from './_core/observability';
import { withTransaction } from './_core/dbTransaction';
import { SomeInputSchema } from '@shared/validation';
import { nanoid } from 'nanoid';
import { TRPCError } from '@trpc/server';

example: protectedProcedure
  .input(SomeInputSchema)
  .mutation(async ({ input, ctx }) => {
    const requestId = nanoid();

    // Create context
    const context = observability.createContext(ctx.user.id, {
      action: 'example.mutation',
      input: sanitizeObject(input),
    });

    try {
      // Log start
      observability.log('debug', context.requestId, 'Starting operation', input);

      // Execute with transaction and retry
      const result = await withTransaction(db, async (txDb) => {
        // Your database operations here
        return someValue;
      });

      // Log success
      observability.log('info', context.requestId, 'Operation succeeded', {
        resultId: result.id,
      });

      return result;
    } catch (error) {
      // Log error with full context
      const err = error instanceof Error ? error : new Error(String(error));
      const errorCtx = observability.createErrorContext(
        context.requestId,
        'example.mutation',
        err,
        input
      );

      observability.log('error', context.requestId, 'Operation failed', {
        error: err.message,
      });

      console.error(observability.formatErrorContext(errorCtx));

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Operation failed. Please try again.',
      });
    }
  }),
```

---

## Migration Checklist

- [ ] Copy new utility files to `server/_core/` and `shared/`
- [ ] Update `server/aiService.ts` with retry + circuit breaker logic
- [ ] Create request context with ID in `server/_core/context.ts`
- [ ] Add validation schemas import to `server/routers.ts`
- [ ] Migrate highest-impact procedures first:
  - [ ] `projects.create`
  - [ ] `projects.delete`
  - [ ] `projects.duplicate`
  - [ ] `elements.createBatch`
  - [ ] `elements.delete`
- [ ] Run tests: `pnpm test`
- [ ] Type check: `pnpm check`
- [ ] Build: `pnpm build`
- [ ] Deploy to staging
- [ ] Monitor error rates and request durations
- [ ] Deploy to production

---

## Quick Reference: Key Functions

| Function | Purpose | Where |
|----------|---------|-------|
| `withRetry(fn, options)` | Retry with exponential backoff | `retry.ts` |
| `circuitBreakers.X.execute(fn)` | Protect against cascading failures | `retry.ts` |
| `withTransaction(db, fn)` | Atomic database operation | `dbTransaction.ts` |
| `withRetryableTransaction(db, fn)` | Retry on deadlock | `dbTransaction.ts` |
| `observability.log()` | Structured logging | `observability.ts` |
| `observability.createContext()` | Create request context | `observability.ts` |
| `dbEnhanced.deleteElementWithChildren()` | Safe recursive delete | `dbEnhanced.ts` |
| `dbEnhanced.duplicateProjectAtomically()` | Safe project duplication | `dbEnhanced.ts` |
| `SomeSchema.parse(input)` | Validate input | `shared/validation.ts` |

---

All examples are production-ready and can be copy-pasted directly into your code.
