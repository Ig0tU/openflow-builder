import { Router, Request, Response } from 'express';
import { createAIService } from '../aiService';
import * as db from '../db';
import { sdk } from './sdk';
import { EventEmitter } from 'events';

const router = Router();

// Event emitter for broadcasting element changes across connections
export const elementChangeEmitter = new EventEmitter();
elementChangeEmitter.setMaxListeners(100); // Support many concurrent clients

// Progress emitter for multi-step AI task tracking
export const progressEmitter = new EventEmitter();
progressEmitter.setMaxListeners(50);

/**
 * Multi-step task progress tracking
 */
interface TaskProgress {
    taskId: string;
    originalRequest: string;
    currentStep: number;
    totalSteps: number;
    lastAction: string;
    status: 'in_progress' | 'completed' | 'needs_continuation' | 'error';
    context?: any;
}

const activeTaskProgress = new Map<string, TaskProgress>();

/**
 * Start tracking a multi-step task
 */
export function startTaskProgress(taskId: string, originalRequest: string, totalSteps: number = 1) {
    const progress: TaskProgress = {
        taskId,
        originalRequest,
        currentStep: 0,
        totalSteps,
        lastAction: 'started',
        status: 'in_progress',
    };
    activeTaskProgress.set(taskId, progress);
    progressEmitter.emit('task:start', progress);
    console.log(`[Progress] Task started: ${taskId} - "${originalRequest.slice(0, 50)}..."`);
    return progress;
}

/**
 * Update task progress after each action
 */
export function updateTaskProgress(
    taskId: string,
    action: string,
    result: any,
    needsContinuation: boolean = false
) {
    const progress = activeTaskProgress.get(taskId);
    if (!progress) return null;

    progress.currentStep++;
    progress.lastAction = action;
    progress.context = result;

    if (needsContinuation) {
        progress.status = 'needs_continuation';
        console.log(`[Progress] Task ${taskId} needs continuation after: ${action}`);
        progressEmitter.emit('task:continue', progress);
    } else if (progress.currentStep >= progress.totalSteps) {
        progress.status = 'completed';
        console.log(`[Progress] Task ${taskId} completed`);
        progressEmitter.emit('task:complete', progress);
        activeTaskProgress.delete(taskId);
    } else {
        progressEmitter.emit('task:update', progress);
    }

    return progress;
}

/**
 * Mark task as needing manual continuation (for client to trigger)
 */
export function signalNeedsContinuation(taskId: string, context: any) {
    const progress = activeTaskProgress.get(taskId);
    if (!progress) return;

    progress.status = 'needs_continuation';
    progress.context = context;
    console.log(`[Progress] Signaling continuation for: ${taskId}`);
    progressEmitter.emit('task:continue', progress);
}

/**
 * Notify all listening clients that elements on a page have changed
 */
export function notifyElementChange(pageId: number, action: 'create' | 'update' | 'delete' | 'clear') {
    elementChangeEmitter.emit(`page:${pageId}`, { pageId, action, timestamp: Date.now() });
}

/**
 * SSE endpoint for live element sync
 * GET /api/stream/elements/:pageId
 */
router.get('/elements/:pageId', async (req: Request, res: Response) => {
    const pageId = parseInt(req.params.pageId);

    if (isNaN(pageId)) {
        res.status(400).json({ error: 'Invalid pageId' });
        return;
    }

    // Authenticate
    let user;
    try {
        user = await sdk.authenticateRequest(req);
    } catch {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    // Verify page access
    const page = await db.getPageById(pageId);
    if (!page) {
        res.status(404).json({ error: 'Page not found' });
        return;
    }

    const project = await db.getProjectById(page.projectId);
    if (!project || project.userId !== user.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ connected: true, pageId })}\n\n`);

    // Listen for element changes
    const listener = (data: { pageId: number; action: string; timestamp: number }) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    elementChangeEmitter.on(`page:${pageId}`, listener);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        res.write(`: heartbeat\n\n`);
    }, 30000);

    // Cleanup on disconnect
    req.on('close', () => {
        elementChangeEmitter.off(`page:${pageId}`, listener);
        clearInterval(heartbeat);
    });
});

/**
 * SSE endpoint for streaming AI chat responses
 * GET /api/stream/chat?pageId=X&message=X&provider=X
 */
router.get('/chat', async (req: Request, res: Response) => {
    try {
        const { pageId, message, provider } = req.query as {
            pageId: string;
            message: string;
            provider: string;
        };

        if (!pageId || !message || !provider) {
            res.status(400).json({ error: 'Missing required parameters: pageId, message, provider' });
            return;
        }

        // Authenticate using session cookie (same as tRPC)
        let user;
        try {
            user = await sdk.authenticateRequest(req);
        } catch {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Get provider config
        const providerConfig = await db.getAiProviderConfig(user.id, provider);
        if (!providerConfig || !providerConfig.apiKey) {
            res.status(400).json({ error: `Provider ${provider} not configured` });
            return;
        }

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
        res.flushHeaders();

        // Create AI service and stream response
        const aiService = createAIService(providerConfig);

        let fullContent = '';

        try {
            for await (const chunk of aiService.generateStream({
                messages: [
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
                maxTokens: 2048,
            })) {
                fullContent += chunk.content;

                // Send SSE event
                res.write(`data: ${JSON.stringify({
                    content: chunk.content,
                    done: chunk.done,
                    fullContent: fullContent,
                })}\n\n`);

                if (chunk.done) {
                    break;
                }
            }
        } catch (streamError) {
            console.error('[StreamChat] Stream error:', streamError);
            res.write(`data: ${JSON.stringify({ error: String(streamError) })}\n\n`);
        }

        // Send final done event
        res.write(`data: ${JSON.stringify({ done: true, fullContent })}\n\n`);
        res.end();
    } catch (error) {
        console.error('[StreamChat] Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: String(error) });
        } else {
            res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
            res.end();
        }
    }
});

export function registerStreamRoutes(app: import('express').Express) {
    app.use('/api/stream', router);
    console.log('[Streaming] SSE endpoints registered at /api/stream');
}

