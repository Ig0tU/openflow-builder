import axios from 'axios';
import { z } from 'zod';
import type { AiProviderConfig } from '../drizzle/schema';
import { withRetry, circuitBreakers, type RetryOptions } from './_core/retry';
import { observability } from './_core/observability';

// Constants for safety limits
const MAX_CONTENT_LENGTH = 50000; // 50KB max input
const MAX_API_TIMEOUT = 60000; // 60 second timeout for API calls
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export type AIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type AIGenerationRequest = {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
};

export type AIGenerationResponse = {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export type AIStreamChunk = {
  content: string;
  done: boolean;
};

/**
 * Schema validators for AI-generated responses
 */
const WebsiteStructureSchema = z.object({
  pages: z.array(z.object({
    name: z.string(),
    slug: z.string(),
    elements: z.array(z.any()),
  })).min(1),
});

const ComponentSuggestionsSchema = z.array(z.string()).min(1).max(20);

const LibraryDetectionSchema = z.object({
  library: z.string(),
  confidence: z.number().min(0).max(1),
  components: z.array(z.string()),
}).nullable();

/**
 * Validate input messages for safety
 */
function validateAIMessages(messages: AIMessage[]): void {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages must be a non-empty array');
  }

  let totalLength = 0;
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      throw new Error('Each message must have role and content');
    }
    if (typeof msg.content !== 'string') {
      throw new Error('Message content must be string');
    }
    totalLength += msg.content.length;
  }

  if (totalLength > MAX_CONTENT_LENGTH) {
    throw new Error(
      `Total message content exceeds ${MAX_CONTENT_LENGTH} characters (got ${totalLength})`
    );
  }
}

/**
 * Retry configuration for API calls with circuit breaker
 */
const defaultRetryOptions: RetryOptions = {
  maxAttempts: MAX_RETRIES,
  initialDelayMs: INITIAL_RETRY_DELAY,
  maxDelayMs: 15000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  timeoutMs: MAX_API_TIMEOUT,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  onRetry: (error, attempt, nextDelayMs) => {
    console.warn(
      `[AIService] Retry attempt ${attempt}, next delay: ${nextDelayMs}ms`,
      error instanceof Error ? error.message : String(error)
    );
  },
};

/**
 * Unified AI service that supports multiple providers
 */
export class AIService {
  private provider: string;
  private apiKey: string;
  private baseUrl?: string;
  private model?: string;

  constructor(config: AiProviderConfig) {
    this.provider = config.provider;
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || undefined;
    this.model = config.model || undefined;
  }

  /**
   * Generate AI response based on configured provider
   */
  async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    switch (this.provider) {
      case 'gemini':
        return this.generateGemini(request);
      case 'grok':
        return this.generateGrok(request);
      case 'openrouter':
        return this.generateOpenRouter(request);
      case 'ollama-cloud':
        return this.generateOllamaCloud(request);
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
  }

  /**
   * Generate AI response with streaming support
   * Yields chunks as they arrive for real-time display
   */
  async *generateStream(request: AIGenerationRequest): AsyncGenerator<AIStreamChunk> {
    validateAIMessages(request.messages);

    // Only Ollama Cloud supports streaming currently
    if (this.provider === 'ollama-cloud') {
      const url = this.baseUrl || 'https://ollama.com';
      const model = this.model || 'qwen3-coder:480b-cloud';

      const response = await axios.post(
        `${url}/api/chat`,
        {
          model,
          messages: request.messages,
          stream: true,
          options: {
            temperature: Math.min(Math.max(request.temperature || 0.7, 0), 2),
            num_predict: Math.min(request.maxTokens || 2048, 8192),
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
          },
          responseType: 'stream',
          timeout: MAX_API_TIMEOUT,
        }
      );

      // Parse streaming NDJSON response
      let buffer = '';
      for await (const chunk of response.data) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              yield {
                content: data.message?.content || '',
                done: data.done || false,
              };
            } catch (e) {
              // Skip malformed JSON lines
            }
          }
        }
      }
    } else {
      // Fallback to non-streaming for other providers
      const response = await this.generate(request);
      yield { content: response.content, done: true };
    }
  }

  /**
   * Google Gemini API integration with retry logic and circuit breaker
   */
  private async generateGemini(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    validateAIMessages(request.messages);

    const url = this.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const model = this.model || 'gemini-2.0-flash-exp';

    // Convert messages to Gemini format
    const contents = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const systemInstruction = request.messages.find(m => m.role === 'system')?.content;

    const result = await circuitBreakers.gemini.execute(async () => {
      const retryResult = await withRetry(
        async () => {
          const response = await axios.post(
            `${url}/models/${model}:generateContent?key=${this.apiKey}`,
            {
              contents,
              systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
              generationConfig: {
                temperature: Math.min(Math.max(request.temperature || 0.7, 0), 2),
                maxOutputTokens: Math.min(request.maxTokens || 2048, 8192),
              }
            },
            {
              timeout: MAX_API_TIMEOUT,
              validateStatus: (status) => status >= 200 && status < 300, // Only 2xx considered successful
            }
          );

          return response.data;
        },
        {
          ...defaultRetryOptions,
          shouldRetry: (error) => {
            // Handle rate limiting (429) and server errors
            if (error instanceof Error) {
              const msg = error.message.toLowerCase();
              return msg.includes('429') || msg.includes('500') || msg.includes('timeout');
            }
            return false;
          },
        }
      );

      if (!retryResult.success) {
        const errorMsg = retryResult.error?.message || 'Unknown error';
        throw new Error(`Gemini API failed after ${retryResult.attempts} attempts: ${errorMsg}`);
      }

      const responseData = retryResult.data!;
      const content = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!content) {
        throw new Error('Gemini API returned empty content');
      }

      const usage = responseData.usageMetadata;

      return {
        content,
        usage: usage ? {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        } : undefined
      };
    });

    return result;
  }

  /**
   * xAI Grok API integration with retry logic and circuit breaker
   */
  private async generateGrok(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    validateAIMessages(request.messages);

    const url = this.baseUrl || 'https://api.x.ai/v1';
    const model = this.model || 'grok-2-1212';

    const result = await circuitBreakers.gemini.execute(async () => {
      const retryResult = await withRetry(
        async () => {
          const response = await axios.post(
            `${url}/chat/completions`,
            {
              model,
              messages: request.messages,
              temperature: Math.min(Math.max(request.temperature || 0.7, 0), 2),
              max_tokens: Math.min(request.maxTokens || 2048, 8192),
              stream: false,
            },
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: MAX_API_TIMEOUT,
              validateStatus: (status) => status >= 200 && status < 300,
            }
          );

          return response.data;
        },
        defaultRetryOptions
      );

      if (!retryResult.success) {
        const errorMsg = retryResult.error?.message || 'Unknown error';
        throw new Error(`Grok API failed after ${retryResult.attempts} attempts: ${errorMsg}`);
      }

      const responseData = retryResult.data!;
      const content = responseData.choices?.[0]?.message?.content || '';

      if (!content) {
        throw new Error('Grok API returned empty content');
      }

      const usage = responseData.usage;

      return {
        content,
        usage: usage ? {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        } : undefined
      };
    });

    return result;
  }

  /**
   * OpenRouter API integration (supports multiple models) with retry logic
   */
  private async generateOpenRouter(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    validateAIMessages(request.messages);

    const url = this.baseUrl || 'https://openrouter.ai/api/v1';
    // Default to free coding model
    const model = this.model || 'mistralai/devstral-2512:free';

    const result = await circuitBreakers.gemini.execute(async () => {
      const retryResult = await withRetry(
        async () => {
          const response = await axios.post(
            `${url}/chat/completions`,
            {
              model,
              messages: request.messages,
              temperature: Math.min(Math.max(request.temperature || 0.7, 0), 2),
              max_tokens: Math.min(request.maxTokens || 2048, 8192),
            },
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://openflow-builder.app',
                'X-Title': 'OpenFlow Builder',
              },
              timeout: MAX_API_TIMEOUT,
              validateStatus: (status) => status >= 200 && status < 300,
            }
          );

          return response.data;
        },
        defaultRetryOptions
      );

      if (!retryResult.success) {
        const errorMsg = retryResult.error?.message || 'Unknown error';
        throw new Error(`OpenRouter API failed after ${retryResult.attempts} attempts: ${errorMsg}`);
      }

      const responseData = retryResult.data!;
      const content = responseData.choices?.[0]?.message?.content || '';

      if (!content) {
        throw new Error('OpenRouter API returned empty content');
      }

      const usage = responseData.usage;

      return {
        content,
        usage: usage ? {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        } : undefined
      };
    });

    return result;
  }

  /**
   * Ollama Cloud API integration with retry logic
   */
  private async generateOllamaCloud(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    validateAIMessages(request.messages);

    // Default to Ollama Cloud API
    const url = this.baseUrl || 'https://ollama.com';
    // Best cloud models: qwen3-coder:480b-cloud (coding), qwen3-vl:235b-cloud (vision)
    const model = this.model || 'qwen3-coder:480b-cloud';

    const result = await circuitBreakers.gemini.execute(async () => {
      const retryResult = await withRetry(
        async () => {
          const response = await axios.post(
            `${url}/api/chat`,
            {
              model,
              messages: request.messages,
              stream: false,
              options: {
                temperature: Math.min(Math.max(request.temperature || 0.7, 0), 2),
                num_predict: Math.min(request.maxTokens || 2048, 8192),
              }
            },
            {
              headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
              },
              timeout: MAX_API_TIMEOUT,
              validateStatus: (status) => status >= 200 && status < 300,
            }
          );

          return response.data;
        },
        defaultRetryOptions
      );

      if (!retryResult.success) {
        const errorMsg = retryResult.error?.message || 'Unknown error';
        throw new Error(`Ollama Cloud API failed after ${retryResult.attempts} attempts: ${errorMsg}`);
      }

      const responseData = retryResult.data!;
      const content = responseData.message?.content || '';

      if (!content) {
        throw new Error('Ollama Cloud API returned empty content');
      }

      return {
        content,
        usage: responseData.prompt_eval_count ? {
          promptTokens: responseData.prompt_eval_count || 0,
          completionTokens: responseData.eval_count || 0,
          totalTokens: (responseData.prompt_eval_count || 0) + (responseData.eval_count || 0),
        } : undefined
      };
    });

    return result;
  }

  /**
   * Generate website structure from natural language prompt with schema validation
   */
  async generateWebsiteStructure(prompt: string): Promise<any> {
    if (!prompt || prompt.length > MAX_CONTENT_LENGTH) {
      throw new Error(
        `Prompt must be between 1 and ${MAX_CONTENT_LENGTH} characters`
      );
    }

    const systemPrompt = `You are an expert web designer and developer. Generate a complete website structure based on user requirements.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "pages": [
    {
      "name": "Home",
      "slug": "index",
      "elements": [
        {
          "elementType": "container",
          "order": 0,
          "content": null,
          "styles": { "display": "flex", "flexDirection": "column", "minHeight": "100vh" },
          "attributes": { "class": "page-container" },
          "children": [...]
        }
      ]
    }
  ]
}

Available element types: container, text, heading, image, button, link, form, input, textarea, select, grid, flexbox

For each element include:
- elementType: the type of element
- order: position among siblings
- content: text content or image URL (null for containers)
- styles: CSS properties as key-value pairs
- attributes: HTML attributes (class, id, href, etc.)
- children: nested elements (optional)

Create a modern, responsive design with proper spacing, colors, and typography.
IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`;

    const response = await this.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      maxTokens: 4096,
    });

    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.content.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7); // Remove ```json
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3); // Remove ```
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3); // Remove trailing ```
      }

      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);

      // Validate against schema
      const validated = WebsiteStructureSchema.parse(parsed);

      return validated;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[AIService] Failed to parse/validate website structure:', {
        responseContent: response.content.slice(0, 500),
        error: errorMsg,
      });
      throw new Error(
        `AI generated invalid structure: ${errorMsg}. Please try again with a clearer description.`
      );
    }
  }

  /**
   * Generate component suggestions based on context with schema validation
   */
  async suggestComponents(context: string): Promise<string[]> {
    if (!context || context.length > MAX_CONTENT_LENGTH) {
      console.warn('[AIService] Invalid context for component suggestions');
      return [];
    }

    const response = await this.generate({
      messages: [
        {
          role: 'system',
          content: 'You are a web design assistant. Suggest 5-10 relevant UI components based on the context. Return ONLY a JSON array of component names, no markdown, no explanation.'
        },
        { role: 'user', content: `Context: ${context}\n\nReturn only a valid JSON array of component names.` }
      ],
      temperature: 0.5,
      maxTokens: 256,
    });

    try {
      let jsonStr = response.content.trim();

      // Remove markdown code blocks
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

      // Validate against schema
      const validated = ComponentSuggestionsSchema.parse(parsed);

      return validated;
    } catch (error) {
      console.error('[AIService] Failed to parse component suggestions:', {
        responseContent: response.content.slice(0, 200),
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Detect UI library from pasted HTML code with schema validation
   */
  async detectUILibrary(
    htmlCode: string
  ): Promise<{ library: string; confidence: number; components: string[] } | null> {
    if (!htmlCode || htmlCode.length > MAX_CONTENT_LENGTH) {
      console.warn('[AIService] Invalid HTML code for library detection');
      return null;
    }

    const response = await this.generate({
      messages: [
        {
          role: 'system',
          content: `You are a web development expert. Analyze HTML code and detect which UI library/framework it uses.

Return ONLY valid JSON with this structure (or null), no markdown, no explanation:
{
  "library": "library-name",
  "confidence": 0.95,
  "components": ["component1", "component2"]
}

Common libraries: shadcn/ui, Tailwind UI, Bootstrap, Material UI, Ant Design, Chakra UI, Mantine, DaisyUI

If no library detected, return null (just the word null).`
        },
        { role: 'user', content: `Analyze this HTML and return only valid JSON:\n\n${htmlCode.slice(0, 2000)}` }
      ],
      temperature: 0.3,
      maxTokens: 512,
    });

    try {
      let jsonStr = response.content.trim();

      // Handle null response
      if (jsonStr === 'null') return null;

      // Remove markdown code blocks
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }

      jsonStr = jsonStr.trim();

      if (jsonStr === 'null') return null;

      const parsed = JSON.parse(jsonStr);

      // Validate against schema
      const validated = LibraryDetectionSchema.parse(parsed);

      return validated;
    } catch (error) {
      console.error('[AIService] Failed to parse library detection:', {
        responseContent: response.content.slice(0, 300),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

/**
 * Create AI service instance from provider config
 */
export function createAIService(config: AiProviderConfig): AIService {
  return new AIService(config);
}
