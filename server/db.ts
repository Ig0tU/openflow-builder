import { eq, and, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  projects,
  pages,
  elements,
  templates,
  components,
  assets,
  aiConversations,
  aiProviderConfigs,
  type Project,
  type InsertProject,
  type Page,
  type InsertPage,
  type Element,
  type InsertElement,
  type Template,
  type InsertTemplate,
  type Component,
  type InsertComponent,
  type Asset,
  type InsertAsset,
  type AiConversation,
  type InsertAiConversation,
  type AiProviderConfig,
  type InsertAiProviderConfig,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// User Helpers
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(user: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<typeof users.$inferSelect | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create user: database not available");
    return null;
  }

  // Generate a unique openId for local users
  const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    await db.insert(users).values({
      openId,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      loginMethod: 'local',
      lastSignedIn: new Date(),
    });

    const createdUser = await getUserByEmail(user.email);
    return createdUser ?? null;
  } catch (error) {
    console.error("[Database] Failed to create local user:", error);
    throw error;
  }
}

// ============================================================================
// Project Helpers
// ============================================================================

export async function createProject(project: InsertProject): Promise<Project> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values(project);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(projects).where(eq(projects.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted project");

  return inserted[0];
}

export async function getUserProjects(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
}

export async function getProjectById(projectId: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result[0];
}

export async function updateProject(projectId: number, updates: Partial<InsertProject>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projects).set(updates).where(eq(projects.id, projectId));
}

export async function deleteProject(projectId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete related pages and elements first
  const projectPages = await db.select().from(pages).where(eq(pages.projectId, projectId));
  for (const page of projectPages) {
    await db.delete(elements).where(eq(elements.pageId, page.id));
  }
  await db.delete(pages).where(eq(pages.projectId, projectId));

  // Delete project assets
  await db.delete(assets).where(eq(assets.projectId, projectId));

  // Delete project
  await db.delete(projects).where(eq(projects.id, projectId));
}

// ============================================================================
// Page Helpers
// ============================================================================

export async function createPage(page: InsertPage): Promise<Page> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(pages).values(page);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(pages).where(eq(pages.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted page");

  return inserted[0];
}

export async function getProjectPages(projectId: number): Promise<Page[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(pages).where(eq(pages.projectId, projectId)).orderBy(asc(pages.createdAt));
}

export async function getPageById(pageId: number): Promise<Page | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  return result[0];
}

export async function updatePage(pageId: number, updates: Partial<InsertPage>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(pages).set(updates).where(eq(pages.id, pageId));
}

export async function deletePage(pageId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(elements).where(eq(elements.pageId, pageId));
  await db.delete(pages).where(eq(pages.id, pageId));
}

// ============================================================================
// Element Helpers
// ============================================================================

export async function createElement(element: InsertElement): Promise<Element> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(elements).values(element);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(elements).where(eq(elements.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted element");

  return inserted[0];
}

export async function getPageElements(pageId: number): Promise<Element[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(elements).where(eq(elements.pageId, pageId)).orderBy(asc(elements.order));
}

export async function getElementById(elementId: number): Promise<Element | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(elements).where(eq(elements.id, elementId)).limit(1);
  return result[0];
}

export async function updateElement(elementId: number, updates: Partial<InsertElement>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(elements).set(updates).where(eq(elements.id, elementId));
}

export async function deleteElement(elementId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete child elements recursively
  const children = await db.select().from(elements).where(eq(elements.parentId, elementId));
  for (const child of children) {
    await deleteElement(child.id);
  }

  await db.delete(elements).where(eq(elements.id, elementId));
}

export async function bulkCreateElements(elementsList: InsertElement[]): Promise<Element[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (elementsList.length === 0) return [];

  await db.insert(elements).values(elementsList);

  // Return created elements
  return db.select().from(elements).where(eq(elements.pageId, elementsList[0]!.pageId)).orderBy(asc(elements.order));
}

// ============================================================================
// Template Helpers
// ============================================================================

export async function createTemplate(template: InsertTemplate): Promise<Template> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(templates).values(template);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(templates).where(eq(templates.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted template");

  return inserted[0];
}

export async function getUserTemplates(userId: number): Promise<Template[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(templates).where(eq(templates.userId, userId)).orderBy(desc(templates.createdAt));
}

export async function getTemplateById(templateId: number): Promise<Template | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
  return result[0];
}

export async function deleteTemplate(templateId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(templates).where(eq(templates.id, templateId));
}

// ============================================================================
// Component Helpers
// ============================================================================

export async function createComponent(component: InsertComponent): Promise<Component> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(components).values(component);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(components).where(eq(components.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted component");

  return inserted[0];
}

export async function getUserComponents(userId: number): Promise<Component[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(components).where(eq(components.userId, userId)).orderBy(desc(components.createdAt));
}

export async function getComponentById(componentId: number): Promise<Component | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(components).where(eq(components.id, componentId)).limit(1);
  return result[0];
}

export async function deleteComponent(componentId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(components).where(eq(components.id, componentId));
}

// ============================================================================
// Asset Helpers
// ============================================================================

export async function createAsset(asset: InsertAsset): Promise<Asset> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(assets).values(asset);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(assets).where(eq(assets.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted asset");

  return inserted[0];
}

export async function getUserAssets(userId: number, projectId?: number): Promise<Asset[]> {
  const db = await getDb();
  if (!db) return [];

  if (projectId !== undefined) {
    return db.select().from(assets).where(
      and(eq(assets.userId, userId), eq(assets.projectId, projectId))
    ).orderBy(desc(assets.createdAt));
  }

  return db.select().from(assets).where(eq(assets.userId, userId)).orderBy(desc(assets.createdAt));
}

export async function getAssetById(assetId: number): Promise<Asset | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  return result[0];
}

export async function deleteAsset(assetId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(assets).where(eq(assets.id, assetId));
}

// ============================================================================
// AI Conversation Helpers
// ============================================================================

export async function createAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiConversations).values(conversation);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(aiConversations).where(eq(aiConversations.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted conversation");

  return inserted[0];
}

export async function getConversationById(conversationId: number): Promise<AiConversation | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(aiConversations).where(eq(aiConversations.id, conversationId)).limit(1);
  return result[0];
}

// Alias for consistency
export const getAiConversation = getConversationById;

export async function updateAiConversation(conversationId: number, updates: Partial<InsertAiConversation>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(aiConversations).set(updates).where(eq(aiConversations.id, conversationId));
}

export async function getUserConversations(userId: number, projectId?: number): Promise<AiConversation[]> {
  const db = await getDb();
  if (!db) return [];

  if (projectId !== undefined) {
    return db.select().from(aiConversations).where(
      and(eq(aiConversations.userId, userId), eq(aiConversations.projectId, projectId))
    ).orderBy(desc(aiConversations.updatedAt));
  }

  return db.select().from(aiConversations).where(eq(aiConversations.userId, userId)).orderBy(desc(aiConversations.updatedAt));
}

// ============================================================================
// AI Provider Config Helpers
// ============================================================================

export async function createAiProviderConfig(config: InsertAiProviderConfig): Promise<AiProviderConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiProviderConfigs).values(config);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(aiProviderConfigs).where(eq(aiProviderConfigs.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted config");

  return inserted[0];
}

export async function getUserAiProviderConfigs(userId: number): Promise<AiProviderConfig[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(aiProviderConfigs).where(eq(aiProviderConfigs.userId, userId));
}

export async function getAiProviderConfig(userId: number, provider: string): Promise<AiProviderConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(aiProviderConfigs).where(
    and(eq(aiProviderConfigs.userId, userId), eq(aiProviderConfigs.provider, provider))
  ).limit(1);

  return result[0];
}

export async function updateAiProviderConfig(configId: number, updates: Partial<InsertAiProviderConfig>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(aiProviderConfigs).set(updates).where(eq(aiProviderConfigs.id, configId));
}

export async function deleteAiProviderConfig(configId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(aiProviderConfigs).where(eq(aiProviderConfigs.id, configId));
}
