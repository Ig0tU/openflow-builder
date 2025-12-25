import { Router, Request, Response } from 'express';
import { createAIService } from '../aiService';
import * as db from '../db';
import { sdk } from './sdk';

const router = Router();

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
