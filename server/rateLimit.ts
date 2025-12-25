/**
 * API Rate Limiting Middleware
 * Prevents abuse and ensures fair usage of API resources
 */

import type { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests per window
    message?: string;      // Error message when limit exceeded
    keyGenerator?: (req: Request) => string;
}

interface RateLimitRecord {
    count: number;
    resetAt: number;
}

// In-memory store for rate limits (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetAt) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Clean every minute

/**
 * Create a rate limiting middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
    const {
        windowMs,
        maxRequests,
        message = 'Too many requests, please try again later.',
        keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown',
    } = config;

    return (req: Request, res: Response, next: NextFunction) => {
        const key = keyGenerator(req);
        const now = Date.now();
        const record = rateLimitStore.get(key);

        // First request or window expired
        if (!record || now > record.resetAt) {
            rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
            res.setHeader('X-RateLimit-Limit', maxRequests.toString());
            res.setHeader('X-RateLimit-Remaining', (maxRequests - 1).toString());
            res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000).toString());
            return next();
        }

        // Limit exceeded
        if (record.count >= maxRequests) {
            res.setHeader('X-RateLimit-Limit', maxRequests.toString());
            res.setHeader('X-RateLimit-Remaining', '0');
            res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000).toString());
            res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000).toString());
            return res.status(429).json({
                error: 'RATE_LIMIT_EXCEEDED',
                message,
                retryAfterMs: record.resetAt - now,
            });
        }

        // Increment counter
        record.count++;
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', (maxRequests - record.count).toString());
        res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000).toString());
        return next();
    };
}

// ============ PRESET RATE LIMITERS ============

/**
 * General API rate limiter: 100 requests per minute
 */
export const apiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 100,
    message: 'API rate limit exceeded. Please slow down.',
});

/**
 * AI/Chat rate limiter: 20 requests per minute
 * AI requests are more expensive, so lower limit
 */
export const aiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,          // 1 minute
    maxRequests: 20,
    message: 'AI rate limit exceeded. Please wait before sending more AI requests.',
});

/**
 * Upload rate limiter: 30 uploads per minute
 */
export const uploadRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'Upload rate limit exceeded.',
});

/**
 * Auth rate limiter: 10 attempts per minute
 * Prevent brute force attacks
 */
export const authRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'Too many authentication attempts. Please wait.',
});

/**
 * Export rate limiter: 5 exports per minute
 * Exports are resource-intensive
 */
export const exportRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: 'Export rate limit exceeded. Please wait before exporting again.',
});
