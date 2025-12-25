import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash"), // For local auth (bcrypt)
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table - stores website projects created by users
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"), // S3 URL for project preview image
  settings: json("settings").$type<{
    favicon?: string;
    title?: string;
    meta?: any;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Pages table - stores individual pages within projects
 */
export const pages = mysqlTable("pages", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  isHomePage: boolean("isHomePage").default(false).notNull(),
  settings: json("settings").$type<{
    title?: string;
    meta?: any;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Page = typeof pages.$inferSelect;
export type InsertPage = typeof pages.$inferInsert;

/**
 * Elements table - stores canvas elements and their properties
 */
export const elements = mysqlTable("elements", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull(),
  parentId: int("parentId"), // null for root elements, references another element for nested
  elementType: varchar("elementType", { length: 50 }).notNull(), // 'container', 'text', 'image', 'button', etc.
  order: int("order").notNull().default(0), // for ordering siblings
  content: text("content"), // text content, image URL, etc.
  styles: json("styles").$type<any>(), // CSS properties as key-value pairs
  attributes: json("attributes").$type<any>(), // HTML attributes (id, class, href, etc.)
  responsiveStyles: json("responsiveStyles").$type<any>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Element = typeof elements.$inferSelect;
export type InsertElement = typeof elements.$inferInsert;

/**
 * Templates table - stores user-created reusable page templates
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"), // S3 URL for template preview
  structure: json("structure").$type<{
    elements: Array<Omit<Element, 'id' | 'pageId' | 'createdAt' | 'updatedAt'>>;
  }>(), // Complete page structure
  category: varchar("category", { length: 100 }), // 'landing', 'portfolio', 'blog', etc.
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/**
 * Components table - stores user-created reusable components
 */
export const components = mysqlTable("components", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"), // S3 URL for component preview
  structure: json("structure").$type<{
    elements: Array<Omit<Element, 'id' | 'pageId' | 'createdAt' | 'updatedAt'>>;
  }>(), // Component element tree
  category: varchar("category", { length: 100 }), // 'navigation', 'hero', 'footer', etc.
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Component = typeof components.$inferSelect;
export type InsertComponent = typeof components.$inferInsert;

/**
 * Assets table - stores uploaded files (images, fonts, etc.)
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"), // null for global assets, specific project otherwise
  name: varchar("name", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(), // S3 key
  url: text("url").notNull(), // S3 public URL
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(), // bytes
  width: int("width"), // for images
  height: int("height"), // for images
  thumbnailUrl: text("thumbnailUrl"), // for image previews
  folder: varchar("folder", { length: 255 }), // for organization
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

/**
 * AI Conversations table - stores multi-step AI chat history
 */
export const aiConversations = mysqlTable("ai_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"), // null for standalone conversations
  pageId: int("pageId"), // null if not page-specific
  provider: varchar("provider", { length: 50 }).notNull(), // 'gemini', 'grok', 'openrouter', 'ollama-cloud'
  model: varchar("model", { length: 100 }),
  messages: json("messages").$type<Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>>(),
  context: json("context").$type<{
    intent?: string;
    generatedElements?: number[];
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = typeof aiConversations.$inferInsert;

/**
 * AI Provider Configs table - stores user AI provider API keys and settings
 */
export const aiProviderConfigs = mysqlTable("ai_provider_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // 'gemini', 'grok', 'openrouter', 'ollama-cloud'
  apiKey: text("apiKey"), // encrypted or stored securely
  baseUrl: text("baseUrl"), // for custom endpoints
  model: varchar("model", { length: 100 }), // default model for this provider
  settings: json("settings").$type<any>(), // provider-specific settings
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiProviderConfig = typeof aiProviderConfigs.$inferSelect;
export type InsertAiProviderConfig = typeof aiProviderConfigs.$inferInsert;
