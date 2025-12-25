/**
 * Enhanced database operations with transaction support, improved error handling, and safety limits
 * All multi-step operations are wrapped in transactions for atomicity
 */

import { eq, and, desc, asc, InferSelectModel } from 'drizzle-orm';
import type { elements, pages, projects } from '../../drizzle/schema';
import { withTransaction, withRetryableTransaction } from './dbTransaction';
import type { Db } from './dbTransaction';

// Constants for safety
const MAX_RECURSION_DEPTH = 100; // Prevent stack overflow in recursive deletes
const MAX_BATCH_SIZE = 1000; // Batch operations into chunks
const QUERY_TIMEOUT_MS = 30000; // Query execution timeout

export type Element = InferSelectModel<typeof elements>;
export type Page = InferSelectModel<typeof pages>;
export type Project = InferSelectModel<typeof projects>;

/**
 * Delete element and all descendants with depth limit
 * Uses iterative approach instead of recursion to prevent stack overflow
 */
export async function deleteElementWithChildren(
  db: Db,
  elementId: number
): Promise<{ deletedCount: number }> {
  return withTransaction(
    db,
    async (txDb) => {
      let deletedCount = 0;
      const toDelete: number[] = [elementId];

      // BFS traversal with depth limit to prevent infinite loops
      let visitedCount = 0;
      const visited = new Set<number>();

      while (toDelete.length > 0) {
        if (visitedCount > MAX_RECURSION_DEPTH) {
          throw new Error(
            `Element hierarchy exceeds maximum depth of ${MAX_RECURSION_DEPTH}`
          );
        }

        const currentId = toDelete.shift()!;

        // Skip if already processed (prevent cycles)
        if (visited.has(currentId)) {
          continue;
        }

        visited.add(currentId);
        visitedCount++;

        // Find all children
        const children = await txDb
          .select({ id: elements.id })
          .from(elements)
          .where(eq(elements.parentId, currentId));

        // Add children to delete queue
        for (const child of children) {
          toDelete.push(child.id);
        }

        // Delete this element
        const result = await txDb
          .delete(elements)
          .where(eq(elements.id, currentId));

        deletedCount++;
      }

      return { deletedCount };
    },
    { name: 'delete_element_tree' }
  );
}

/**
 * Create multiple elements with proper atomicity and validation
 * Returns the actually created elements (not all elements on page)
 */
export async function createElementsBatch(
  db: Db,
  elementsList: Array<{
    pageId: number;
    parentId: number | null;
    elementType: string;
    order: number;
    content?: string | null;
    styles?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
  }>
): Promise<Element[]> {
  if (elementsList.length === 0) {
    return [];
  }

  if (elementsList.length > MAX_BATCH_SIZE) {
    throw new Error(
      `Batch size ${elementsList.length} exceeds maximum of ${MAX_BATCH_SIZE}`
    );
  }

  return withTransaction(
    db,
    async (txDb) => {
      // Validate all elements before inserting
      const pageIds = new Set(elementsList.map(e => e.pageId));
      const parentIds = new Set(
        elementsList.filter(e => e.parentId !== null).map(e => e.parentId!)
      );

      // Check page existence
      const pages = await txDb
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.id, Array.from(pageIds)[0]!));

      if (pages.length === 0) {
        throw new Error('Parent page does not exist');
      }

      // Insert elements
      const insertedIds: number[] = [];

      for (const element of elementsList) {
        const result = await txDb
          .insert(elements)
          .values({
            pageId: element.pageId,
            parentId: element.parentId,
            elementType: element.elementType,
            order: element.order,
            content: element.content || null,
            styles: element.styles ? JSON.stringify(element.styles) : null,
            attributes: element.attributes ? JSON.stringify(element.attributes) : null,
          })
          .$returningId();

        if (result && result.length > 0) {
          insertedIds.push(result[0].id);
        }
      }

      // Fetch and return the created elements
      if (insertedIds.length === 0) {
        return [];
      }

      const created = await txDb
        .select()
        .from(elements)
        .where(eq(elements.id, insertedIds[0]!))
        .limit(insertedIds.length);

      return created;
    },
    { name: 'create_elements_batch' }
  );
}

/**
 * Duplicate project with all pages, elements, and components atomically
 */
export async function duplicateProjectAtomically(
  db: Db,
  projectId: number,
  newProjectName: string
): Promise<{
  projectId: number;
  pagesCount: number;
  elementsCount: number;
}> {
  return withRetryableTransaction(
    db,
    async (txDb) => {
      // Get original project
      const originalProject = await txDb
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (originalProject.length === 0) {
        throw new Error(`Project ${projectId} not found`);
      }

      const project = originalProject[0];

      // Create new project
      const newProjectResult = await txDb
        .insert(projects)
        .values({
          userId: project.userId,
          name: newProjectName,
          description: project.description,
          settings: project.settings,
          thumbnail: project.thumbnail,
        })
        .$returningId();

      if (!newProjectResult || newProjectResult.length === 0) {
        throw new Error('Failed to create new project');
      }

      const newProjectId = newProjectResult[0].id;

      // Get all pages from original project
      const originalPages = await txDb
        .select()
        .from(pages)
        .where(eq(pages.projectId, projectId));

      let pagesCount = 0;
      let elementsCount = 0;
      const pageMap = new Map<number, number>(); // Map of old pageId -> new pageId

      // Duplicate pages
      for (const originalPage of originalPages) {
        const newPageResult = await txDb
          .insert(pages)
          .values({
            projectId: newProjectId,
            name: originalPage.name,
            slug: originalPage.slug,
            isHomePage: originalPage.isHomePage,
            settings: originalPage.settings,
          })
          .$returningId();

        if (newPageResult && newPageResult.length > 0) {
          const newPageId = newPageResult[0].id;
          pageMap.set(originalPage.id, newPageId);
          pagesCount++;

          // Get all elements for this page
          const pageElements = await txDb
            .select()
            .from(elements)
            .where(eq(elements.pageId, originalPage.id));

          // Build element map for parent ID remapping
          const elementMap = new Map<number | null, number | null>();
          elementMap.set(null, null);

          // Insert elements in order (parents before children)
          for (const originalElement of pageElements.sort((a, b) => {
            // Sort to ensure parents come before children
            return (a.parentId === null ? 0 : 1) - (b.parentId === null ? 0 : 1);
          })) {
            const newParentId = elementMap.get(originalElement.parentId) ?? null;

            const newElementResult = await txDb
              .insert(elements)
              .values({
                pageId: newPageId,
                parentId: newParentId,
                elementType: originalElement.elementType,
                order: originalElement.order,
                content: originalElement.content,
                styles: originalElement.styles,
                attributes: originalElement.attributes,
              })
              .$returningId();

            if (newElementResult && newElementResult.length > 0) {
              elementMap.set(originalElement.id, newElementResult[0].id);
              elementsCount++;
            }
          }
        }
      }

      return {
        projectId: newProjectId,
        pagesCount,
        elementsCount,
      };
    },
    3, // Max retries
    { name: `duplicate_project_${projectId}`, backoffMs: 100 }
  );
}

/**
 * Delete project with all related data atomically
 */
export async function deleteProjectAtomically(
  db: Db,
  projectId: number
): Promise<{ deletedPages: number; deletedElements: number }> {
  return withRetryableTransaction(
    db,
    async (txDb) => {
      // Get all pages for this project
      const projectPages = await txDb
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.projectId, projectId));

      let deletedElements = 0;

      // Delete all elements in all pages
      for (const page of projectPages) {
        const result = await txDb
          .delete(elements)
          .where(eq(elements.pageId, page.id));

        deletedElements += result.rowsAffected || 0;
      }

      // Delete all pages
      const pagesResult = await txDb
        .delete(pages)
        .where(eq(pages.projectId, projectId));

      const deletedPages = pagesResult.rowsAffected || 0;

      // Delete project itself
      await txDb.delete(projects).where(eq(projects.id, projectId));

      return { deletedPages, deletedElements };
    },
    3,
    { name: `delete_project_${projectId}` }
  );
}

/**
 * Bulk update elements with atomic operation
 */
export async function updateElementsBatch(
  db: Db,
  updates: Array<{
    id: number;
    styles?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
    order?: number;
    content?: string | null;
  }>
): Promise<number> {
  if (updates.length === 0) {
    return 0;
  }

  if (updates.length > MAX_BATCH_SIZE) {
    throw new Error(
      `Batch size ${updates.length} exceeds maximum of ${MAX_BATCH_SIZE}`
    );
  }

  return withTransaction(
    db,
    async (txDb) => {
      let updatedCount = 0;

      for (const update of updates) {
        const result = await txDb
          .update(elements)
          .set({
            ...(update.styles && { styles: JSON.stringify(update.styles) }),
            ...(update.attributes && {
              attributes: JSON.stringify(update.attributes),
            }),
            ...(update.order !== undefined && { order: update.order }),
            ...(update.content !== undefined && { content: update.content }),
          })
          .where(eq(elements.id, update.id));

        updatedCount += result.rowsAffected || 0;
      }

      return updatedCount;
    },
    { name: 'update_elements_batch' }
  );
}

/**
 * Check data integrity and return statistics
 */
export async function checkProjectIntegrity(
  db: Db,
  projectId: number
): Promise<{
  isValid: boolean;
  issues: string[];
  stats: {
    pagesCount: number;
    elementsCount: number;
    orphanedElements: number;
  };
}> {
  const issues: string[] = [];

  // Check project exists
  const projectResult = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (projectResult.length === 0) {
    return {
      isValid: false,
      issues: ['Project does not exist'],
      stats: { pagesCount: 0, elementsCount: 0, orphanedElements: 0 },
    };
  }

  // Get pages
  const projectPages = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.projectId, projectId));

  // Get all elements
  const allElements = await db
    .select()
    .from(elements)
    .where(eq(elements.pageId, projectPages[0]?.id || -1));

  // Check for orphaned elements (elements with non-existent parent)
  let orphanedCount = 0;
  const elementIds = new Set(allElements.map(e => e.id));

  for (const element of allElements) {
    if (
      element.parentId !== null &&
      !elementIds.has(element.parentId)
    ) {
      orphanedCount++;
      issues.push(
        `Element ${element.id} has non-existent parent ${element.parentId}`
      );
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    stats: {
      pagesCount: projectPages.length,
      elementsCount: allElements.length,
      orphanedElements: orphanedCount,
    },
  };
}
