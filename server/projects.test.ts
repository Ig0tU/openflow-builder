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

describe("projects router", () => {
  it("creates a new project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Test Project",
      description: "A test project",
    });

    expect(project).toBeDefined();
    expect(project.name).toBe("Test Project");
    expect(project.description).toBe("A test project");
    expect(project.userId).toBe(ctx.user!.id);
  });

  it("lists user projects", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project first
    await caller.projects.create({
      name: "Test Project 1",
    });

    const projects = await caller.projects.list();

    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
  });

  it("gets a specific project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.projects.create({
      name: "Test Project",
    });

    const fetched = await caller.projects.get({ id: created.id });

    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.name).toBe("Test Project");
  });

  it("updates a project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.projects.create({
      name: "Original Name",
    });

    const updated = await caller.projects.update({
      id: created.id,
      name: "Updated Name",
      description: "New description",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.description).toBe("New description");
  });

  it("deletes a project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.projects.create({
      name: "To Delete",
    });

    const result = await caller.projects.delete({ id: created.id });

    expect(result.success).toBe(true);

    // Attempting to get deleted project should throw NOT_FOUND
    await expect(caller.projects.get({ id: created.id })).rejects.toThrow();
  });
});
