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
      model: z.string().optional(), // User-selected model
      attachments: z.array(z.object({
        url: z.string(),
        fileType: z.enum(['image', 'code']),
        mimeType: z.string(),
        name: z.string(),
      })).optional(), // File attachments for vision/code analysis
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

      // Import AI service
      const { createAIService } = await import('./aiService');
      // Override model if user specified one
      const aiConfig = input.model
        ? { ...providerConfig, model: input.model }
        : providerConfig;
      const aiService = createAIService(aiConfig);

      // Build the system prompt with function calling instructions
      const elementsContext = context.elements.length > 0
        ? `\n\nExisting elements on canvas:\n${context.elements.map((el, i) => `${i + 1}. ID:${el.id} - ${el.type}: "${(el.content || '').slice(0, 50)}"`).join('\n')}`
        : '\n\nThe canvas is empty - start fresh!';

      const systemPrompt = `You are an elite AI website builder with complete creative control. You understand both precise commands and vague creative direction.

CURRENT CONTEXT:
- Page: "${context.page.name}" in project "${context.project.name}"
- Elements on canvas: ${context.elements.length}${elementsContext}

YOUR CAPABILITIES:
1. **Precise edits**: "change the first word to red" -> find the element, update that specific part
2. **Vague creative direction**: "build something impressive" -> create a full, beautiful layout
3. **Character-level changes**: "change 'Hello' to 'Hi'" -> find and update exact text
4. **Full page builds**: "create a hero section" -> build complete sections with proper styling

INTERPRETATION RULES:
- If user says "the heading" or "the button" - find the most relevant element from the list above
- If user is vague like "make it better" - use your design expertise to improve
- If canvas is empty and user is vague - build something complete and impressive
- For text changes, find the element containing that text and update it

CRITICAL: ONLY use element IDs from the "Existing elements on canvas" list above.
- Element IDs from previous conversation messages are STALE and may no longer exist
- If an element you want to update is not in the current list, CREATE a new one instead
- Never reference an element ID that is not listed in the current context

LIMITATIONS - STATIC BUILDER ONLY:
- This builder creates STATIC websites (HTML + CSS only)
- DO NOT add JavaScript, event handlers, or onclick attributes
- DO NOT try to add interactivity like "make button do X when clicked"
- If user asks for interactivity, explain: "This builder creates static layouts. Interactive features require custom JavaScript development."
- Focus on visual design, layout, and styling only

UIKIT FRAMEWORK COMPONENTS (PREFERRED):
Use UIkit classes for professional, responsive layouts. Always prefer these over raw CSS:

LAYOUT:
- uk-container: Centered container (uk-container-small, uk-container-large)
- uk-section: Full-width section with padding (uk-section-muted, uk-section-primary)
- uk-grid: Responsive grid (uk-child-width-1-2@m, uk-child-width-1-3@l)
- uk-flex: Flexbox (uk-flex-center, uk-flex-middle, uk-flex-between)

CONTENT:
- uk-card: Cards (uk-card-default, uk-card-primary, uk-card-hover)
- uk-article: Blog/article format
- uk-table: Styled tables (uk-table-divider, uk-table-hover)
- uk-list: Styled lists (uk-list-disc, uk-list-divider)

BUTTONS:
- uk-button: Buttons (uk-button-default, uk-button-primary, uk-button-secondary)
- uk-button-large, uk-button-small: Size variants

NAVIGATION:
- uk-navbar: Navigation bar (uk-navbar-container)
- uk-nav: Vertical nav menu
- uk-breadcrumb: Breadcrumb trail
- uk-tab: Tab navigation

UTILITIES:
- uk-text-center, uk-text-left, uk-text-right: Text alignment
- uk-text-lead: Lead paragraph (larger text)
- uk-margin: Spacing (uk-margin-small, uk-margin-large, uk-margin-remove)
- uk-padding: Padding variants
- uk-background-primary, uk-background-secondary, uk-background-muted: Backgrounds
- uk-light: Light text on dark backgrounds
- uk-hidden@s, uk-visible@m: Responsive visibility

TECH SPACE THEME COLORS:
- Primary: #564AEB (vibrant purple)
- Secondary: #111111 (deep black)
- Background: #FFFFFF
- Muted: #F8F8F8
- Success: #42C65C
- Warning: #FFAD4F
- Danger: #FB3F3F
- Text: #2C2C2C
- Font: 'Nunito Sans' (body), 'Heebo' (headings)

EXAMPLE - Hero Section:
createElement with:
- elementType: "uk-section"
- attributes: { class: "uk-section uk-section-large uk-light" }
- styles: { backgroundColor: "#111", minHeight: "80vh" }
- children: container with heading, text, button



INTENT INFERENCE & REASONING (The "Brain"):
You are not just a command executor; you are an intelligent interpreter. User requests will be vague, non-technical, or slang.
YOU MUST REASON about the intent before choosing an action.

1. **Contextual Deduction**:
   - "Change *that thing* to blue" -> Look at the currently selected element or the last modified element.
   - "The *whos-a-whats-it* with the drop downs" -> Infer "Select Element" or "Navigation Menu".
   - "The *bottom bit*" -> Infer "Footer" section.

2. **Abstract -> Concrete Mapping**:
   - "Make it pop" -> Don't just pick a random color. REASON: "Popping" implies contrast, elevation (shadows), or vibrancy.
     -> Action: updateStyle(boxShadow, border, accentColor).
   - "Clean it up" -> REASON: "Clean" implies alignment, white space, and consistency.
     -> Action: updateStyle(padding, gap, alignment).
   - "Start over" / "Wipe it" -> REASON: User wants a blank slate.
     -> Action: deletePageElements(pageId).

3. **Ambiguity Resolution**:
   - If a user says "fix the header" and there are 3 headers, DO NOT FAIL.
3. **Ambiguity Resolution**:
   - If a user says "fix the header" and there are 3 headers, DO NOT FAIL.
   - REASON: "I will pick the most likely top-level header."
   - Action: selectElement(id) + updateContent/Style.

FIRST PRINCIPLES DESIGN REASONING (TRUE INTELLIGENCE):
Do not rely on memorized templates. Analyze the *functional intent* of the user's vague request.

1. **Deconstruct the Request**:
   - "Sign up thing" -> Intent: User wants to capture data. Needs: Input fields + Action button.
   - "Show my work" -> Intent: Display visual assets. Needs: Image Grid or Gallery.
   - "Trust me" -> Intent: Social Proof. Needs: Testimonials (Quotes) or Logos.

2. **Assemble from Primitives**:
   - You have 'containers', 'text', 'headings', 'buttons', 'images'.
   - If user asks for a "Who's-a-whats-it that does [X]", build the structure that performs [X].
   - Example: "Thing to buy stuff" -> Product Card (Image + Title + Price + Buy Button).

3. **Infer Visual Hierarchy**:
   - "Top" = Header/Nav.
   - "Bottom" = Footer.
   - "Main thing" = Hero Section.

YOU ARE AN ARCHITECT. Build what is needed based on the *semantics* of the request.

AVAILABLE ACTIONS (Strict Schema - Do Not Hallucinate):
- createElement: Add new elements (container, heading, text, button, link, image, input, etc.)
- updateElement: Modify content or styles of existing elements
- deleteElement: Remove elements (target specific ID)
- deletePageElements: Delete ALL elements (target pageId). Use for "clear", "wipe", "reset".
- selectElement: Highlight an element (use when identifying vague references)
- updateStyle: Change specific CSS properties
- updateContent: Change text content

COLOR CONTRAST RULES (CRITICAL - WCAG AA Compliance):
You MUST ensure all text is visible and readable.
- Dark text (#1a1a2e, #333333) on light backgrounds (white, #f5f5f5, pastels)
- Light text (#ffffff, #f5f5f5) ONLY on dark backgrounds (#1a1a2e, #2d3748, gradients with dark base)
- NEVER use light text colors like #ffffff on default/light canvas backgrounds
- Buttons: Use contrasting text (dark on light buttons, light on dark buttons)
- Default text color: Always use "#1a1a2e" unless background is explicitly dark
- If unsure, default to dark text - it's visible on most backgrounds

RESPONSE FORMAT (JSON only, no markdown):
{
  "message": "Friendly explanation of what you're doing",
  "actions": [
    {
      "type": "createElement",
      "data": {
        "pageId": ${input.pageId},
        "elementType": "heading",
        "content": "Welcome",
        "styles": { "fontSize": "48px", "fontWeight": "bold", "color": "#1a1a2e", "textAlign": "center", "padding": "40px 24px", "width": "100%" }
      }
    }
  ]
}


LAYOUT RULES (CRITICAL - ABSOLUTE LAW):
- DO NOT use position: absolute - elements should flow vertically.
- Use width: 100% for full-width elements.
- STACK EVERYTHING VERTICALLY. No overlapping.
- Use Flexbox ('display: flex', 'flexDirection: column', 'gap: 24px') for containers.
- For side-by-side content, use 'display: flex', 'flexDirection: row', 'flexWrap: wrap', 'gap: 24px'.

STYLE GUIDELINES (ELITE/PREMIUM ONLY):
- **Aesthetic**: Think "Awwwards Winner", "Apple Design", "Linear App".
- **Typography**: Large, bold headings (48px-96px). Clean sans-serif inter-style fonts.
- **Colors**: Deep, rich backgrounds (#0a0a0b, #030712). Vibrant gradients for accents (purple-to-blue, orange-to-pink).
- **Glassmorphism**: Use 'backdropFilter: blur(12px)', 'backgroundColor: rgba(255, 255, 255, 0.05)', 'border: 1px solid rgba(255, 255, 255, 0.1)'.
- **Shadows**: Soft, multi-layer shadows ('0 10px 30px - 10px rgba(0, 0, 0, 0.5)').
- **Borders**: Subtle, 1px borders using varying opacities.
- **Spacing**: Generous breathing room. Padding: 40px, 60px, 80px.
- **Images**: Rounded corners (16px, 24px).

NANO AGENT PROTOCOL:
- If you need an image, use the placeholder syntax: <nano:detailed description of image>
- Example: "Create a cyberpunk banner" -> Content: <nano:cyberpunk city street at night neon rain>
- The system will automatically replace this with a generated image.
- NEVER use standard placeholders like 'via.placeholder.com'. ALWAYS use <nano:...>.

Always include pageId: ${input.pageId} in createElement actions.
Return ONLY valid JSON.`;

      // Call the AI
      const aiResponse = await aiService.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input.message }
        ],
        temperature: 0.7,
        maxTokens: 16384,
      });

      // Parse AI response
      let parsedResponse: { message: string; actions: any[] } = {
        message: aiResponse.content,
        actions: [],
      };

      try {
        // Try to parse as JSON
        let jsonStr = aiResponse.content.trim();
        console.log('AI RESPONSE RAW:', jsonStr); // DEBUG LOG

        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        const parsed = JSON.parse(jsonStr);
        if (parsed.message && Array.isArray(parsed.actions)) {
          parsedResponse = parsed;
        }
      } catch {
        // AI returned plain text - that's fine, just use as message
        parsedResponse = {
          message: aiResponse.content,
          actions: [],
        };
      }

      // Execute any actions the AI requested
      const executedActions: any[] = [];
      for (const action of parsedResponse.actions) {
        try {
          const result = await builderActions.executeBuilderAction(action, ctx.user.id);
          executedActions.push({ action, success: true, result });
        } catch (error) {
          executedActions.push({
            action,
            success: false,
            error: error instanceof Error ? error.message : 'Failed'
          });
        }
      }

      // Update conversation with new messages
      const existingConv = await db.getAiConversation(conversationId);
      const existingMessages = (existingConv?.messages as any[]) || [];
      await db.updateAiConversation(conversationId, {
        messages: [
          ...existingMessages,
          { role: 'user', content: input.message },
          { role: 'assistant', content: parsedResponse.message },
        ],
      });

      return {
        conversationId,
        response: {
          message: parsedResponse.message,
          actions: executedActions,
          context,
        },
      };
    }),
});
