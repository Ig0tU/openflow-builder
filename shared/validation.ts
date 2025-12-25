/**
 * Advanced input validation schemas for tRPC procedures
 * Ensures type safety and security at API boundaries
 */

import { z } from 'zod';

// Constants for safety and rate limiting
export const LIMITS = {
  PROJECT_NAME_MAX: 255,
  PROJECT_NAME_MIN: 1,
  PROJECT_DESCRIPTION_MAX: 5000,
  PAGE_NAME_MAX: 255,
  PAGE_SLUG_MAX: 255,
  ELEMENT_CONTENT_MAX: 50000,
  ELEMENT_STYLES_MAX: 100000,
  ELEMENT_ATTRIBUTES_MAX: 50000,
  HTML_CODE_MAX: 100000,
  AI_PROMPT_MAX: 10000,
  FILE_SIZE_MAX: 50 * 1024 * 1024, // 50MB
  FILE_NAME_MAX: 255,
};

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  return sanitized;
}

/**
 * Sanitize CSS to prevent CSS injection
 */
export function sanitizeCSS(css: string): string {
  // Remove @import and javascript: URLs
  let sanitized = css
    .replace(/@import\s+[^;]+;?/gi, '')
    .replace(/javascript:/gi, '');

  return sanitized;
}

/**
 * Sanitize JSON object by removing sensitive keys
 */
export function sanitizeObject(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sensitiveKeys = [
    'password', 'token', 'secret', 'apiKey', 'Authorization',
    'Cookie', 'privateKey', 'accessToken', 'refreshToken'
  ];

  const copy = JSON.parse(JSON.stringify(obj));

  const sanitize = (item: any): void => {
    if (typeof item !== 'object' || item === null) return;

    if (Array.isArray(item)) {
      item.forEach(sanitize);
    } else {
      Object.keys(item).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(s => lowerKey.includes(s.toLowerCase()))) {
          item[key] = '[REDACTED]';
        } else if (typeof item[key] === 'object') {
          sanitize(item[key]);
        }
      });
    }
  };

  sanitize(copy);
  return copy;
}

// ============================================================================
// Project Schemas
// ============================================================================

export const CreateProjectInputSchema = z.object({
  name: z.string()
    .min(LIMITS.PROJECT_NAME_MIN, 'Project name is required')
    .max(LIMITS.PROJECT_NAME_MAX, `Project name must be ${LIMITS.PROJECT_NAME_MAX} characters or less`)
    .trim()
    .refine(
      (val) => !/^[<>]/.test(val),
      'Project name cannot start with < or >'
    ),
  description: z.string()
    .max(LIMITS.PROJECT_DESCRIPTION_MAX, `Description must be ${LIMITS.PROJECT_DESCRIPTION_MAX} characters or less`)
    .optional()
    .default(''),
});

export const UpdateProjectInputSchema = z.object({
  id: z.number().int().positive('Invalid project ID'),
  name: z.string()
    .min(LIMITS.PROJECT_NAME_MIN)
    .max(LIMITS.PROJECT_NAME_MAX)
    .trim()
    .optional(),
  description: z.string()
    .max(LIMITS.PROJECT_DESCRIPTION_MAX)
    .optional(),
  thumbnail: z.string()
    .url('Invalid thumbnail URL')
    .optional(),
  settings: z.record(z.unknown()).optional(),
});

export const DeleteProjectInputSchema = z.object({
  id: z.number().int().positive('Invalid project ID'),
});

export const DuplicateProjectInputSchema = z.object({
  id: z.number().int().positive('Invalid project ID'),
  name: z.string()
    .min(LIMITS.PROJECT_NAME_MIN)
    .max(LIMITS.PROJECT_NAME_MAX)
    .trim(),
});

// ============================================================================
// Page Schemas
// ============================================================================

export const CreatePageInputSchema = z.object({
  projectId: z.number().int().positive('Invalid project ID'),
  name: z.string()
    .min(1, 'Page name is required')
    .max(LIMITS.PAGE_NAME_MAX)
    .trim(),
  slug: z.string()
    .min(1, 'Page slug is required')
    .max(LIMITS.PAGE_SLUG_MAX)
    .trim()
    .regex(/^[a-z0-9-_]+$/, 'Slug must contain only lowercase letters, numbers, hyphens, and underscores'),
  isHomePage: z.boolean().default(false),
  settings: z.record(z.unknown()).optional().default({}),
});

export const UpdatePageInputSchema = z.object({
  id: z.number().int().positive('Invalid page ID'),
  name: z.string()
    .min(1)
    .max(LIMITS.PAGE_NAME_MAX)
    .trim()
    .optional(),
  slug: z.string()
    .min(1)
    .max(LIMITS.PAGE_SLUG_MAX)
    .trim()
    .regex(/^[a-z0-9-_]+$/)
    .optional(),
  isHomePage: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

// ============================================================================
// Element Schemas
// ============================================================================

export const CreateElementInputSchema = z.object({
  pageId: z.number().int().positive('Invalid page ID'),
  elementType: z.string()
    .min(1, 'Element type is required')
    .max(50)
    .regex(/^[a-z-]+$/, 'Invalid element type'),
  order: z.number().int().nonnegative('Order must be non-negative').default(0),
  content: z.string()
    .max(LIMITS.ELEMENT_CONTENT_MAX, `Content must be ${LIMITS.ELEMENT_CONTENT_MAX} characters or less`)
    .nullable()
    .default(null),
  styles: z.record(z.unknown())
    .optional()
    .default({}),
  attributes: z.record(z.unknown())
    .optional()
    .default({}),
  parentId: z.number().int().positive().nullable().default(null),
});

export const UpdateElementInputSchema = z.object({
  id: z.number().int().positive('Invalid element ID'),
  elementType: z.string()
    .min(1)
    .max(50)
    .regex(/^[a-z-]+$/)
    .optional(),
  order: z.number().int().nonnegative().optional(),
  content: z.string()
    .max(LIMITS.ELEMENT_CONTENT_MAX)
    .nullable()
    .optional(),
  styles: z.record(z.unknown()).optional(),
  attributes: z.record(z.unknown()).optional(),
});

// ============================================================================
// File Upload Schemas
// ============================================================================

export const FileUploadInputSchema = z.object({
  projectId: z.number().int().positive('Invalid project ID'),
  name: z.string()
    .min(1, 'File name is required')
    .max(LIMITS.FILE_NAME_MAX)
    .trim()
    .regex(/^[\w\-. ]+$/i, 'Invalid file name'),
  fileData: z.string()
    .refine(
      (data) => Buffer.byteLength(data, 'base64') <= LIMITS.FILE_SIZE_MAX,
      `File size must be ${LIMITS.FILE_SIZE_MAX / (1024 * 1024)}MB or less`
    ),
  mimeType: z.string()
    .regex(/^[\w\-+.]+\/[\w\-+.]+$/, 'Invalid MIME type')
    .optional()
    .default('application/octet-stream'),
});

// ============================================================================
// AI Schemas
// ============================================================================

export const AIGenerateWebsiteInputSchema = z.object({
  prompt: z.string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(LIMITS.AI_PROMPT_MAX, `Prompt must be ${LIMITS.AI_PROMPT_MAX} characters or less'),
    .trim(),
  provider: z.enum(['gemini', 'grok', 'openrouter', 'ollama-cloud']).default('gemini'),
});

export const AIDetectLibraryInputSchema = z.object({
  htmlCode: z.string()
    .min(10, 'HTML code must be provided')
    .max(LIMITS.HTML_CODE_MAX, `HTML code must be ${LIMITS.HTML_CODE_MAX} characters or less')
    .trim(),
  provider: z.enum(['gemini', 'grok', 'openrouter', 'ollama-cloud']).default('gemini'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
export type CreatePageInput = z.infer<typeof CreatePageInputSchema>;
export type UpdatePageInput = z.infer<typeof UpdatePageInputSchema>;
export type CreateElementInput = z.infer<typeof CreateElementInputSchema>;
export type UpdateElementInput = z.infer<typeof UpdateElementInputSchema>;
export type FileUploadInput = z.infer<typeof FileUploadInputSchema>;
export type AIGenerateWebsiteInput = z.infer<typeof AIGenerateWebsiteInputSchema>;
export type AIDetectLibraryInput = z.infer<typeof AIDetectLibraryInputSchema>;
