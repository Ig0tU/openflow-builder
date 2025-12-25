import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("aiBuilder.executeAction", () => {
  it("should execute createElement action", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a project and page for testing
    const project = await caller.projects.create({
      name: "Test Project",
      description: "Test",
    });

    const page = await caller.pages.create({
      projectId: project.id,
      name: "Home",
      slug: "home",
    });

    const action = {
      type: "createElement" as const,
      data: {
        pageId: page.id,
        elementType: "heading",
        content: "Hello World",
        styles: { fontSize: "24px", color: "#000000" },
      },
    };

    const result = await caller.aiBuilder.executeAction({ action });

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.result.elementType).toBe("heading");
    expect(result.result.content).toBe("Hello World");
  });

  it("should execute updateElement action", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create project, page, and element
    const project = await caller.projects.create({
      name: "Test Project",
      description: "Test",
    });

    const page = await caller.pages.create({
      projectId: project.id,
      name: "Home",
      slug: "home",
    });

    const element = await caller.elements.create({
      pageId: page.id,
      elementType: "button",
      content: "Click Me",
      styles: {},
      order: 0,
    });

    const action = {
      type: "updateElement" as const,
      data: {
        elementId: element.id,
        content: "Updated Button",
        styles: { backgroundColor: "blue" },
      },
    };

    const result = await caller.aiBuilder.executeAction({ action });

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    // Update action returns void, just check success
  });

  it("should execute deleteElement action", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create project, page, and element
    const project = await caller.projects.create({
      name: "Test Project",
      description: "Test",
    });

    const page = await caller.pages.create({
      projectId: project.id,
      name: "Home",
      slug: "home",
    });

    const element = await caller.elements.create({
      pageId: page.id,
      elementType: "text",
      content: "Delete me",
      styles: {},
      order: 0,
    });

    const action = {
      type: "deleteElement" as const,
      data: {
        elementId: element.id,
      },
    };

    const result = await caller.aiBuilder.executeAction({ action });

    expect(result.success).toBe(true);

    // Verify element is deleted
    const elements = await caller.elements.list({ pageId: page.id });
    expect(elements.find(e => e.id === element.id)).toBeUndefined();
  });
});

describe("aiBuilder.chat", () => {
  it("should handle chat message and return response", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create project and page
    const project = await caller.projects.create({
      name: "Test Project",
      description: "Test",
    });

    const page = await caller.pages.create({
      projectId: project.id,
      name: "Home",
      slug: "home",
    });

    // Note: This test will fail if no API keys are configured
    // In a real test environment, you would mock the AI service
    try {
      const result = await caller.aiBuilder.chat({
        pageId: page.id,
        message: "Add a heading that says Welcome",
        provider: "gemini",
      });

      expect(result.conversationId).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response.message).toBeDefined();
    } catch (error: any) {
      // Expected to fail without API keys configured
      expect(error.message).toContain("API key");
    }
  });
});
