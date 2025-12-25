
import { nanoid } from 'nanoid';

/**
 * Nano Agent - Image Generation Middleware
 * Detects <nano:prompt> syntax and resolves it to an image URL.
 * Currently uses Pollinations.ai for zero-config generation.
 */
export async function processNanoCommands(content: string): Promise<string> {
    if (!content || typeof content !== 'string') return content;

    // Regex to find <nano:prompt> (tolerant of spaces)
    const nanoRegex = /<\s*nano:([^>]+)>/g;

    // Replace all occurrences
    const processedContent = content.replace(nanoRegex, (match, prompt) => {
        console.log(`[Nano Agent] Generating image for: "${prompt}"`);

        // Encode prompt for URL
        const encodedPrompt = encodeURIComponent(prompt.trim());

        // Use Pollinations.ai for instant, keyless generation
        // We add a random seed to ensure uniqueness if the same prompt is used twice
        const seed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=600&nologo=true`;

        return imageUrl;
    });

    return processedContent;
}

/**
 * Determines if text content should be converted to an image element
 * or if it should remain text with the URL embedded.
 */
export function isNanoImageOnly(content: string): boolean {
    return content.trim().startsWith('<nano:') && content.trim().endsWith('>');
}
