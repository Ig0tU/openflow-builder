# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenFlow Builder is a full-stack web application for building and managing projects with AI-assisted features. It uses:

- **Frontend**: React 19 with Vite, Tailwind CSS, and Radix UI components
- **Backend**: Express.js with tRPC for type-safe API communication
- **Database**: MySQL with Drizzle ORM
- **Package Manager**: pnpm
- **Testing**: Vitest

## Core Architecture

### Monorepo Structure

```
├── client/          # React frontend (Vite)
├── server/          # Express.js backend with tRPC
├── shared/          # Shared types and utilities
├── drizzle/         # Database schema and migrations
└── attached_assets/ # Static assets (referenced in Vite config)
```

### Full-Stack Communication Flow

1. **Client** (React + Vite) makes HTTP calls to `/api/trpc`
2. **Server** (Express middleware) receives tRPC requests at `/api/trpc`
3. **tRPC Router** (`server/routers.ts`) defines procedures with input validation using Zod
4. **Database** (MySQL via Drizzle ORM) persists data
5. **Shared Types** exported from `shared/types.ts` ensure type safety across client and server

### Key Backend Files

- `server/routers.ts` - Main tRPC router defining all procedures (auth, projects, pages, elements, templates, components, assets, AI builder)
- `server/_core/trpc.ts` - tRPC instance setup with `publicProcedure`, `protectedProcedure`, and `adminProcedure`
- `server/_core/context.ts` - Request context creation with user authentication from session cookies
- `server/_core/index.ts` - Express server setup with Vite dev server or static file serving
- `server/db.ts` - Database query functions for all entities (users, projects, pages, elements, etc.)
- `server/_core/oauth.ts` - OAuth authentication flow and session management
- `server/_core/env.ts` - Environment variables configuration

### Key Client Files

- `client/src/main.tsx` - Application entry point setting up tRPC client and React Query
- `client/src/App.tsx` - Root React component with routing
- `client/src/_core/hooks/useAuth.ts` - Authentication hook for checking current user
- `client/src/lib/trpc.ts` - tRPC client factory
- `client/src/pages/*` - Page components corresponding to routes
- `client/src/components/*` - Reusable React components (Radix UI based)

### Database Layer

- Schema defined in `drizzle/schema.ts` with exported TypeScript types (User, Project, Page, Element, etc.)
- Database queries abstracted in `server/db.ts` for all CRUD operations
- Type safety: database schema types automatically used for tRPC input/output

### Authentication

- User authentication via OAuth (configured in `server/_core/oauth.ts`)
- Session stored in JWT cookie managed by `server/_core/cookies.ts`
- tRPC context extracts user from request via `sdk.authenticateRequest()`
- `protectedProcedure` middleware enforces authentication for protected routes
- `adminProcedure` middleware enforces admin role

### Type Paths (tsconfig)

- `@/*` maps to `client/src/*`
- `@shared/*` maps to `shared/*`
- `@assets/*` maps to `attached_assets/*`

## Common Development Commands

### Development

```bash
# Start development server with hot reload
pnpm dev

# Type checking (no emit)
pnpm check

# Format code with Prettier
pnpm format
```

### Building & Production

```bash
# Build frontend (Vite) and bundle backend (esbuild)
pnpm build

# Run production server
pnpm start
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode (if supported by vitest config)
vitest

# Run specific test file
vitest server/projects.test.ts
```

### Database

```bash
# Generate migrations from schema changes and apply them
pnpm db:push

# Just generate migration files
drizzle-kit generate

# Just apply migrations
drizzle-kit migrate
```

## Important Patterns & Conventions

### tRPC Router Structure

All routers follow this pattern in `server/routers.ts`:
1. Define input schema with `z.object({...})`
2. Use `protectedProcedure` for authenticated endpoints
3. Use `publicProcedure` for public endpoints
4. Throw `TRPCError` with appropriate codes (UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
5. Authorization: Always verify user ownership before returning/modifying data

Example:
```ts
projects: router({
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.id);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
      if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      return project;
    }),
})
```

### Database Queries

- All database functions are in `server/db.ts` - don't put queries directly in routers
- Use Drizzle ORM query builder (`drizzle-orm` imports: `eq`, `and`, `desc`, `asc`)
- Handle `DATABASE_URL` not being available gracefully (e.g., in tests)

### Testing with tRPC

Use `appRouter.createCaller(ctx)` to test procedures directly:
```ts
const caller = appRouter.createCaller(ctx);
const result = await caller.projects.create({...});
```

### Client-Side Data Fetching

- Use tRPC hooks from `@trpc/react-query`
- tRPC client configured in `client/src/main.tsx` with `httpBatchLink` and `/api/trpc` endpoint
- Credentials: `include` to send cookies with requests

### Environment Variables

Server-side (required):
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Secret for session cookies
- `NODE_ENV` - 'development' or 'production'
- `OAUTH_SERVER_URL` - OAuth provider URL
- `VITE_APP_ID` - Application ID from OAuth provider

Optional:
- `OWNER_OPEN_ID` - User ID with admin privileges
- `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` - AI forge integration

### Component Library

- Radix UI primitives (buttons, dialogs, dropdowns, etc.) imported from `@radix-ui/react-*`
- Styled with Tailwind CSS (config in `tailwind.config.ts`)
- Icons from `lucide-react`
- Use Radix UI patterns for accessible, unstyled components combined with Tailwind

## Build Output

- Frontend built to `dist/public/` by Vite
- Backend bundled to `dist/index.js` by esbuild
- Server serves static frontend files in production from `dist/public/`
- In development, Vite dev server serves frontend with hot reload via `/api/trpc` proxy

## Common Issues & Solutions

### Port Already in Use
The server automatically finds an available port starting from 3000 (or `PORT` env var) up to +20.

### Database Connection Errors
- Ensure `DATABASE_URL` is set correctly before running migrations or dev server
- In tests, database functions gracefully handle `DATABASE_URL` being undefined

### Type Errors
- Run `pnpm check` to catch TypeScript errors
- Shared types must be exported from `shared/types.ts` for both client and server to use

## Production-Grade Improvements (2025)

Advanced reliability, security, and observability features have been added:

### New Utilities
- **Retry Logic** (`server/_core/retry.ts`) - Exponential backoff, circuit breaker, timeouts
- **Observability** (`server/_core/observability.ts`) - Request tracking, structured logging
- **Database Transactions** (`server/_core/dbTransaction.ts`) - Atomic operations, savepoints
- **Enhanced DB Operations** (`server/_core/dbEnhanced.ts`) - Safe cascades, batch ops
- **Input Validation** (`shared/validation.ts`) - Comprehensive Zod schemas

### Quick Start
1. Review `QUICK_START.md` for 30-minute integration
2. See `IMPLEMENTATION_EXAMPLES.md` for copy-paste code
3. Read `IMPROVEMENTS.md` for detailed configuration
4. Check `IMPROVEMENTS_SUMMARY.md` for executive overview

### Key Features
- 🔄 Automatic retry with exponential backoff for API calls
- 🛡️ Circuit breaker prevents cascading failures
- ⏱️ Automatic 30-60 second timeouts on external requests
- 💾 ACID transactions with automatic rollback
- 📊 Request tracking with unique IDs for tracing
- 🔐 Automatic sensitive data redaction in logs
- ✅ Comprehensive input validation and sanitization
- 🌳 Safe recursive operations with depth limits

All utilities are backwards compatible with zero breaking changes.
