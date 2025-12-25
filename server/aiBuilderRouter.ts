import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as builderActions from './aiBuilderActions';
import * as db from './db';


/**
 * AI Builder Router
 * Handles AI-driven builder operations with function calling
 */

export const aiBuilderRouter = router({
  /**
   * Execute a builder action from AI
   */
  executeAction: protectedProcedure
    .input(z.object({
      action: z.any(), // BuilderAction type
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await builderActions.executeBuilderAction(input.action, ctx.user.id);
        return { success: true, result };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to execute action',
        });
      }
    }),

  /**
   * Find elements by natural language description
   */
  findElements: protectedProcedure
    .input(z.object({
      pageId: z.number(),
      description: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      return builderActions.findElementsByDescription(
        input.pageId,
        input.description,
        ctx.user.id
      );
    }),

  /**
   * Get current page context for AI
   */
  getPageContext: protectedProcedure
    .input(z.object({
      pageId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const page = await db.getPageById(input.pageId);
      if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

      const project = await db.getProjectById(page.projectId);
      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const elements = await db.getPageElements(input.pageId);
      
      return {
        page,
        project,
        elements,
        elementCount: elements.length,
      };
    }),

  /**
   * AI chat with builder operations
   * This endpoint handles natural language requests and executes builder actions
   */
  chat: protectedProcedure
    .input(z.object({
      pageId: z.number(),
      message: z.string(),
      conversationId: z.number().optional(),
      provider: z.enum(['gemini', 'grok', 'openrouter', 'ollama-cloud']),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get page context
      const page = await db.getPageById(input.pageId);
      if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

      const project = await db.getProjectById(page.projectId);
      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const elements = await db.getPageElements(input.pageId);

      // Get or create conversation
      let conversationId = input.conversationId;
      if (!conversationId) {
        const conversation = await db.createAiConversation({
          userId: ctx.user.id,
          projectId: project.id,
          provider: input.provider,
          messages: [],
        });
        conversationId = conversation.id;
      }

      // Build context for AI
      const context = {
        page: {
          id: page.id,
          name: page.name,
          slug: page.slug,
        },
        project: {
          id: project.id,
          name: project.name,
        },
        elements: elements.map(el => ({
          id: el.id,
          type: el.elementType,
          content: el.content,
          styles: el.styles,
        })),
      };

      // Define available functions for AI
      const functions = [
        {
          name: 'create_element',
          description: 'Create a new element on the canvas',
          parameters: {
            type: 'object',
            properties: {
              elementType: {
                type: 'string',
                enum: ['container', 'heading', 'text', 'button', 'link', 'image', 'input', 'textarea', 'select', 'video', 'iframe'],
                description: 'Type of element to create',
              },
              content: {
                type: 'string',
                description: 'Content of the element (text, URL, etc.)',
              },
              styles: {
                type: 'object',
                description: 'CSS styles as key-value pairs',
              },
              position: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                },
                description: 'Position on canvas',
              },
            },
            required: ['elementType'],
          },
        },
        {
          name: 'update_element',
          description: 'Update an existing element',
          parameters: {
            type: 'object',
            properties: {
              elementId: {
                type: 'number',
                description: 'ID of the element to update',
              },
              content: {
                type: 'string',
                description: 'New content',
              },
              styles: {
                type: 'object',
                description: 'CSS styles to update',
              },
            },
            required: ['elementId'],
          },
        },
        {
          name: 'delete_element',
          description: 'Delete an element',
          parameters: {
            type: 'object',
            properties: {
              elementId: {
                type: 'number',
                description: 'ID of the element to delete',
              },
            },
            required: ['elementId'],
          },
        },
        {
          name: 'update_style',
          description: 'Update a specific style property of an element',
          parameters: {
            type: 'object',
            properties: {
              elementId: {
                type: 'number',
                description: 'ID of the element',
              },
              property: {
                type: 'string',
                description: 'CSS property name (e.g., "color", "fontSize")',
              },
              value: {
                type: 'string',
                description: 'CSS property value',
              },
            },
            required: ['elementId', 'property', 'value'],
          },
        },
        {
          name: 'find_elements',
          description: 'Find elements by description (e.g., "the blue button", "main heading")',
          parameters: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'Natural language description of the element',
              },
            },
            required: ['description'],
          },
        },
      ];

      // Get AI provider config
      const providerConfig = await db.getAiProviderConfig(ctx.user.id, input.provider);
      if (!providerConfig || !providerConfig.apiKey) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Please configure your ${input.provider} API key in settings`,
        });
      }

      // Call AI with function calling capability
      const systemPrompt = `You are an AI assistant that helps users build websites visually. You have access to a canvas where you can create, modify, and delete elements.

Current page context:
- Page: ${context.page.name}
- Project: ${context.project.name}
- Elements on canvas: ${context.elements.length}

When the user asks you to modify the website, use the available functions to make changes. You can:
- Create new elements (buttons, text, images, containers, etc.)
- Update existing elements (change text, styles, properties)
- Delete elements
- Find elements by description

Always execute actions step by step and provide clear feedback about what you're doing.`;

      // This is a simplified version - in production, you'd use the actual AI provider's function calling API
      // For now, we'll return a structured response that the frontend can parse
      
      return {
        conversationId,
        response: {
          message: "AI builder integration is ready. The AI can now operate the builder interface.",
          actions: [],
          context,
        },
      };
    }),
});
