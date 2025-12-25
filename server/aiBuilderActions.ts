import * as db from './db';
import type { Element } from '../drizzle/schema';

/**
 * AI Builder Actions Service
 * This service provides functions that the AI can call to operate the builder interface
 */

export type BuilderAction =
  | { type: 'createElement'; data: CreateElementAction }
  | { type: 'updateElement'; data: UpdateElementAction }
  | { type: 'deleteElement'; data: DeleteElementAction }
  | { type: 'selectElement'; data: SelectElementAction }
  | { type: 'updateStyle'; data: UpdateStyleAction }
  | { type: 'updateContent'; data: UpdateContentAction };

export type CreateElementAction = {
  pageId: number;
  elementType: string;
  content?: string;
  styles?: Record<string, string>;
  attributes?: Record<string, any>;
  parentId?: number;
  position?: { x: number; y: number };
};

export type UpdateElementAction = {
  elementId: number;
  content?: string;
  styles?: Record<string, string>;
  attributes?: Record<string, any>;
};

export type DeleteElementAction = {
  elementId: number;
};

export type SelectElementAction = {
  elementId: number;
  description?: string; // e.g., "the blue button", "the main heading"
};

export type UpdateStyleAction = {
  elementId: number;
  property: string;
  value: string;
};

export type UpdateContentAction = {
  elementId: number;
  content: string;
  range?: { start: number; end: number }; // For modifying specific characters
};

/**
 * Execute a builder action
 */
export async function executeBuilderAction(action: BuilderAction, userId: number): Promise<any> {
  switch (action.type) {
    case 'createElement':
      return await createElementAction(action.data, userId);
    case 'updateElement':
      return await updateElementAction(action.data, userId);
    case 'deleteElement':
      return await deleteElementAction(action.data, userId);
    case 'selectElement':
      return await selectElementAction(action.data, userId);
    case 'updateStyle':
      return await updateStyleAction(action.data, userId);
    case 'updateContent':
      return await updateContentAction(action.data, userId);
    default:
      throw new Error(`Unknown action type`);
  }
}

/**
 * Create a new element on the canvas
 */
async function createElementAction(data: CreateElementAction, userId: number): Promise<Element> {
  // Verify user has access to the page
  const page = await db.getPageById(data.pageId);
  if (!page) throw new Error('Page not found');

  const project = await db.getProjectById(page.projectId);
  if (!project || project.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Get current elements to determine order
  const elements = await db.getPageElements(data.pageId);

  // Default styles based on element type
  const defaultStyles = getDefaultStyles(data.elementType, data.position);
  const mergedStyles = { ...defaultStyles, ...(data.styles || {}) };

  // Create the element
  const element = await db.createElement({
    pageId: data.pageId,
    elementType: data.elementType,
    order: elements.length,
    parentId: data.parentId,
    content: data.content || getDefaultContent(data.elementType),
    styles: mergedStyles,
    attributes: data.attributes || {},
  });

  return element;
}

/**
 * Update an existing element
 */
async function updateElementAction(data: UpdateElementAction, userId: number): Promise<Element> {
  const element = await db.getElementById(data.elementId);
  if (!element) throw new Error('Element not found');

  // Verify user has access
  const page = await db.getPageById(element.pageId);
  if (!page) throw new Error('Page not found');

  const project = await db.getProjectById(page.projectId);
  if (!project || project.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Update the element
  await db.updateElement(data.elementId, {
    content: data.content,
    styles: data.styles,
    attributes: data.attributes,
  });

  return await db.getElementById(data.elementId) as Element;
}

/**
 * Delete an element
 */
async function deleteElementAction(data: DeleteElementAction, userId: number): Promise<{ success: boolean }> {
  const element = await db.getElementById(data.elementId);
  if (!element) throw new Error('Element not found');

  // Verify user has access
  const page = await db.getPageById(element.pageId);
  if (!page) throw new Error('Page not found');

  const project = await db.getProjectById(page.projectId);
  if (!project || project.userId !== userId) {
    throw new Error('Unauthorized');
  }

  await db.deleteElement(data.elementId);
  return { success: true };
}

/**
 * Select an element (returns element info for AI context)
 */
async function selectElementAction(data: SelectElementAction, userId: number): Promise<Element> {
  const element = await db.getElementById(data.elementId);
  if (!element) throw new Error('Element not found');

  // Verify user has access
  const page = await db.getPageById(element.pageId);
  if (!page) throw new Error('Page not found');

  const project = await db.getProjectById(page.projectId);
  if (!project || project.userId !== userId) {
    throw new Error('Unauthorized');
  }

  return element;
}

/**
 * Update a specific style property
 */
async function updateStyleAction(data: UpdateStyleAction, userId: number): Promise<Element> {
  const element = await db.getElementById(data.elementId);
  if (!element) throw new Error('Element not found');

  // Verify user has access
  const page = await db.getPageById(element.pageId);
  if (!page) throw new Error('Page not found');

  const project = await db.getProjectById(page.projectId);
  if (!project || project.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Merge new style with existing styles
  const currentStyles = (element.styles as Record<string, string>) || {};
  const updatedStyles = {
    ...currentStyles,
    [data.property]: data.value,
  };

  await db.updateElement(data.elementId, {
    styles: updatedStyles,
  });

  return await db.getElementById(data.elementId) as Element;
}

/**
 * Update element content (with optional range for character-level edits)
 */
async function updateContentAction(data: UpdateContentAction, userId: number): Promise<Element> {
  const element = await db.getElementById(data.elementId);
  if (!element) throw new Error('Element not found');

  // Verify user has access
  const page = await db.getPageById(element.pageId);
  if (!page) throw new Error('Page not found');

  const project = await db.getProjectById(page.projectId);
  if (!project || project.userId !== userId) {
    throw new Error('Unauthorized');
  }

  let newContent = data.content;

  // If range is specified, modify only that portion
  if (data.range && element.content) {
    const before = element.content.substring(0, data.range.start);
    const after = element.content.substring(data.range.end);
    newContent = before + data.content + after;
  }

  await db.updateElement(data.elementId, {
    content: newContent,
  });

  return await db.getElementById(data.elementId) as Element;
}

/**
 * Get default styles for an element type
 */
function getDefaultStyles(type: string, position?: { x: number; y: number }): Record<string, string> {
  // Use flow layout by default for AI-generated elements - they should stack vertically
  const base: Record<string, string> = {
    display: 'block',
    width: '100%',
    marginBottom: '16px',
    boxSizing: 'border-box',
  };

  // Only use absolute positioning if explicit position provided (drag-and-drop)
  if (position) {
    return {
      position: 'absolute',
      left: `${position.x}px`,
      top: `${position.y}px`,
    };
  }

  switch (type) {
    case 'container':
    case 'section':
      return { ...base, padding: '48px 24px', backgroundColor: '#f8fafc' };
    case 'heading':
      return { ...base, fontSize: '36px', fontWeight: 'bold', color: '#1a1a2e', textAlign: 'center', padding: '24px 0' };
    case 'text':
      return { ...base, fontSize: '18px', color: '#4b5563', lineHeight: '1.7', padding: '0 24px', textAlign: 'center' };
    case 'button':
      return { ...base, width: 'auto', display: 'inline-block', backgroundColor: '#3b82f6', color: 'white', padding: '14px 32px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', margin: '16px auto' };
    case 'image':
      return { ...base, maxWidth: '100%', height: 'auto', margin: '24px auto', display: 'block' };
    case 'input':
      return { ...base, width: '300px', maxWidth: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '6px', margin: '8px auto' };
    default:
      return base;
  }
}

/**
 * Get default content for an element type
 */
function getDefaultContent(type: string): string {
  switch (type) {
    case 'heading': return 'Heading';
    case 'text': return 'Text content';
    case 'button': return 'Button';
    case 'link': return 'Link';
    case 'image': return 'https://via.placeholder.com/400x300';
    default: return '';
  }
}

/**
 * Find elements by description (for AI to select elements by natural language)
 */
export async function findElementsByDescription(
  pageId: number,
  description: string,
  userId: number
): Promise<Element[]> {
  // Verify user has access
  const page = await db.getPageById(pageId);
  if (!page) throw new Error('Page not found');

  const project = await db.getProjectById(page.projectId);
  if (!project || project.userId !== userId) {
    throw new Error('Unauthorized');
  }

  const elements = await db.getPageElements(pageId);

  // Simple matching logic - can be enhanced with ML
  const keywords = description.toLowerCase().split(' ');

  return elements.filter((element: Element) => {
    const content = (element.content || '').toLowerCase();
    const type = element.elementType.toLowerCase();
    const styles = element.styles as Record<string, string> || {};

    // Check if description matches content, type, or style properties
    return keywords.some(keyword =>
      content.includes(keyword) ||
      type.includes(keyword) ||
      Object.values(styles).some(v => String(v).toLowerCase().includes(keyword))
    );
  });
}
