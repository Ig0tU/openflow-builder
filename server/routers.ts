import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { aiBuilderRouter } from "./aiBuilderRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { createAIService } from "./aiService";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { transcribeAudio } from "./_core/voiceTranscription";
import bcrypt from "bcryptjs";
import { sdk } from "./_core/sdk";

export const appRouter = router({
  system: systemRouter,
  aiBuilder: aiBuilderRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if user already exists
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An account with this email already exists',
          });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 10);

        // Create user
        const user = await db.createLocalUser({
          email: input.email,
          name: input.name,
          passwordHash,
        });

        if (!user) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user',
          });
        }

        // Create session
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || '',
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user: { id: user.id, name: user.name, email: user.email } };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Find user
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        // Verify password
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        // Update last signed in
        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });

        // Create session
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || '',
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user: { id: user.id, name: user.name, email: user.email } };
      }),
  }),

  // ============================================================================
  // Projects
  // ============================================================================
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserProjects(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.id);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        return project;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.createProject({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          settings: {},
        });

        // Create default home page
        await db.createPage({
          projectId: project.id,
          name: 'Home',
          slug: 'index',
          isHomePage: true,
          settings: {},
        });

        return project;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        thumbnail: z.string().optional(),
        settings: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.id);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const { id, ...updates } = input;
        await db.updateProject(id, updates);
        const updated = await db.getProjectById(id);
        return updated!;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.id);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        await db.deleteProject(input.id);
        return { success: true };
      }),

    duplicate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const original = await db.getProjectById(input.id);
        if (!original) throw new TRPCError({ code: 'NOT_FOUND' });
        if (original.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const newProject = await db.createProject({
          userId: ctx.user.id,
          name: `${original.name} (Copy)`,
          description: original.description,
          settings: original.settings,
        });

        // Copy all pages and elements
        const pages = await db.getProjectPages(original.id);
        for (const page of pages) {
          const newPage = await db.createPage({
            projectId: newProject.id,
            name: page.name,
            slug: page.slug,
            isHomePage: page.isHomePage,
            settings: page.settings,
          });

          const elements = await db.getPageElements(page.id);
          if (elements.length > 0) {
            const newElements = elements.map(el => ({
              pageId: newPage.id,
              parentId: el.parentId,
              elementType: el.elementType,
              order: el.order,
              content: el.content,
              styles: el.styles,
              attributes: el.attributes,
              responsiveStyles: el.responsiveStyles,
            }));
            await db.bulkCreateElements(newElements);
          }
        }

        return newProject;
      }),

    export: protectedProcedure
      .input(z.object({
        id: z.number(),
        format: z.enum(['html', 'nextjs', 'wordpress', 'hostinger', 'vercel', 'netlify']).default('html'),
      }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.id);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const pages = await db.getProjectPages(input.id);
        const exportedFiles: Array<{ path: string; content: string; type: string }> = [];

        // Recursive HTML generation with proper hierarchy
        const generateElementHTML = (element: any, allElements: any[], indent = ''): string => {
          const styles = element.styles || {};
          const styleStr = Object.entries(styles)
            .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`)
            .join('; ');
          const content = element.content || '';
          const attrs = element.attributes || {};
          const attrStr = Object.entries(attrs).filter(([k]) => k !== 'class').map(([k, v]) => `${k}="${v}"`).join(' ');
          const className = attrs.class || '';

          // Find and render children recursively
          const children = allElements
            .filter(el => el.parentId === element.id)
            .sort((a, b) => a.order - b.order);

          const childrenHTML = children.length > 0
            ? '\n' + children.map(child => generateElementHTML(child, allElements, indent + '  ')).join('\n') + '\n' + indent
            : content;

          switch (element.elementType) {
            case 'container':
            case 'div':
              return `${indent}<div class="${className}" style="${styleStr}" ${attrStr}>${childrenHTML}</div>`;
            case 'heading':
              return `${indent}<h${attrs.level || '1'} class="${className}" style="${styleStr}" ${attrStr}>${childrenHTML}</h${attrs.level || '1'}>`;
            case 'text':
            case 'paragraph':
              return `${indent}<p class="${className}" style="${styleStr}" ${attrStr}>${childrenHTML}</p>`;
            case 'button':
              return `${indent}<button class="${className}" style="${styleStr}" ${attrStr}>${childrenHTML}</button>`;
            case 'link':
              return `${indent}<a href="${attrs.href || '#'}" class="${className}" style="${styleStr}" ${attrStr}>${childrenHTML}</a>`;
            case 'image':
              return `${indent}<img src="${content}" alt="${attrs.alt || ''}" class="${className}" style="${styleStr}" ${attrStr} />`;
            case 'input':
              return `${indent}<input type="${attrs.type || 'text'}" placeholder="${attrs.placeholder || ''}" class="${className}" style="${styleStr}" ${attrStr} />`;
            default:
              return `${indent}<div class="${className}" style="${styleStr}" ${attrStr}>${childrenHTML}</div>`;
          }
        };

        for (const page of pages) {
          const elements = await db.getPageElements(page.id);
          // Only render root elements - children are rendered recursively
          const rootElements = elements.filter(el => !el.parentId).sort((a, b) => a.order - b.order);
          const elementsHTML = rootElements.map(el => generateElementHTML(el, elements, '  ')).join('\n');
          const slug = page.slug === 'index' ? 'index' : page.slug;

          if (input.format === 'nextjs' || input.format === 'vercel') {
            const jsxContent = elementsHTML.replace(/class=\"/g, 'className=\"').replace(/style=\"([^\"]*)\"/g, (_, s) => {
              const obj = s.split(';').filter((x: string) => x.trim()).map((x: string) => {
                const [k, v] = x.split(':').map((y: string) => y.trim());
                return `${k.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())}: "${v}"`;
              }).join(', ');
              return `style={{${obj}}}`;
            });
            exportedFiles.push({ path: `app/${slug === 'index' ? '' : slug + '/'}page.tsx`, content: `export default function Page() {\n  return (\n    <main>\n${jsxContent}\n    </main>\n  );\n}`, type: 'tsx' });
          } else if (input.format === 'wordpress') {
            exportedFiles.push({ path: `theme/${slug === 'index' ? 'index' : 'page-' + slug}.php`, content: `<?php get_header(); ?>\n<main>\n${elementsHTML}\n</main>\n<?php get_footer(); ?>`, type: 'php' });
          } else {
            const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.name}</title>
  <!-- UIkit CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/uikit@3.17.11/dist/css/uikit.min.css" />
  <!-- Google Fonts (Tech Space Theme) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@500;700&family=Nunito+Sans:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
    h1, h2, h3, h4, h5, h6 { font-family: 'Heebo', sans-serif; }
  </style>
</head>
<body>
${elementsHTML}
  <!-- UIkit JS -->
  <script src="https://cdn.jsdelivr.net/npm/uikit@3.17.11/dist/js/uikit.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/uikit@3.17.11/dist/js/uikit-icons.min.js"></script>
</body>
</html>`;
            const folder = input.format === 'hostinger' ? 'public_html/' : '';
            exportedFiles.push({ path: `${folder}${slug}.html`, content: htmlDoc, type: 'html' });
          }
        }

        // Platform config files
        if (input.format === 'nextjs' || input.format === 'vercel') {
          exportedFiles.push({ path: 'package.json', content: JSON.stringify({ name: project.name.toLowerCase().replace(/[^a-z0-9]/g, '-'), scripts: { dev: 'next dev', build: 'next build', start: 'next start' }, dependencies: { next: '^14.0.0', react: '^18.2.0', 'react-dom': '^18.2.0' } }, null, 2), type: 'json' });
          exportedFiles.push({ path: 'app/layout.tsx', content: `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html lang="en"><body>{children}</body></html>;\n}`, type: 'tsx' });
        }
        if (input.format === 'vercel') exportedFiles.push({ path: 'vercel.json', content: '{"framework":"nextjs"}', type: 'json' });
        if (input.format === 'netlify') exportedFiles.push({ path: 'netlify.toml', content: '[build]\n  publish = "."', type: 'toml' });
        if (input.format === 'wordpress') {
          exportedFiles.push({ path: 'theme/style.css', content: `/*\nTheme Name: ${project.name}\nVersion: 1.0\n*/`, type: 'css' });
          exportedFiles.push({ path: 'theme/functions.php', content: `<?php\nadd_action('after_setup_theme', function() { add_theme_support('title-tag'); });\n?>`, type: 'php' });
        }

        return { project: { name: project.name }, format: input.format, files: exportedFiles };
      }),

    // YOOtheme Pro export for Joomla
    exportYOOtheme: protectedProcedure
      .input(z.object({
        id: z.number(),
        pageId: z.number().optional(), // Export single page or all pages
      }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.id);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const { exportToYOOtheme, exportProjectToYOOtheme } = await import('./yoothemeExporter');

        if (input.pageId) {
          // Export single page
          const page = await db.getPageById(input.pageId);
          if (!page || page.projectId !== project.id) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });
          }
          const elements = await db.getPageElements(input.pageId);
          const layout = exportToYOOtheme(page, elements, project);
          return {
            layout,
            filename: `${page.slug || 'page'}-yootheme.json`,
            project: { name: project.name },
            page: { name: page.name },
          };
        } else {
          // Export all pages
          const pages = await db.getProjectPages(input.id);
          const pagesWithElements = await Promise.all(
            pages.map(async (page) => ({
              page,
              elements: await db.getPageElements(page.id),
            }))
          );
          const layout = exportProjectToYOOtheme(project, pagesWithElements);
          return {
            layout,
            filename: `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-yootheme.json`,
            project: { name: project.name },
          };
        }
      }),

    // YOOtheme Pro import from Joomla
    importYOOtheme: protectedProcedure
      .input(z.object({
        pageId: z.number(),
        layout: z.any(), // YOOtheme JSON layout
        replace: z.boolean().default(false), // Replace existing elements or append
      }))
      .mutation(async ({ input, ctx }) => {
        const page = await db.getPageById(input.pageId);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });

        const project = await db.getProjectById(page.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const { importFromYOOtheme, validateYOOthemeLayout } = await import('./yoothemeImporter');

        if (!validateYOOthemeLayout(input.layout)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid YOOtheme layout format. Expected { type: "layout", children: [...] }'
          });
        }

        // Clear existing elements if replacing
        if (input.replace) {
          const existing = await db.getPageElements(input.pageId);
          for (const el of existing) {
            await db.deleteElement(el.id);
          }
        }

        // Import elements
        const elements = importFromYOOtheme(input.layout);
        const existingCount = input.replace ? 0 : (await db.getPageElements(input.pageId)).length;

        const createdElements = [];
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          const created = await db.createElement({
            pageId: input.pageId,
            elementType: el.elementType,
            content: el.content,
            styles: el.styles,
            attributes: el.attributes,
            order: existingCount + i,
          });
          createdElements.push(created);
        }

        return {
          success: true,
          imported: createdElements.length,
          message: `Imported ${createdElements.length} element(s) from YOOtheme layout`,
        };
      }),
  }),

  // ============================================================================
  // Pages
  // ============================================================================
  pages: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        return db.getProjectPages(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const page = await db.getPageById(input.id);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

        const project = await db.getProjectById(page.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        return page;
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string(),
        slug: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        return db.createPage({
          projectId: input.projectId,
          name: input.name,
          slug: input.slug,
          isHomePage: false,
          settings: {},
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        settings: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const page = await db.getPageById(input.id);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

        const project = await db.getProjectById(page.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const { id, ...updates } = input;
        await db.updatePage(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const page = await db.getPageById(input.id);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

        const project = await db.getProjectById(page.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        await db.deletePage(input.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // Elements
  // ============================================================================
  elements: router({
    list: protectedProcedure
      .input(z.object({ pageId: z.number() }))
      .query(async ({ input, ctx }) => {
        const page = await db.getPageById(input.pageId);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

        const project = await db.getProjectById(page.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        return db.getPageElements(input.pageId);
      }),

    create: protectedProcedure
      .input(z.object({
        pageId: z.number(),
        parentId: z.number().optional(),
        elementType: z.string(),
        order: z.number(),
        content: z.string().optional(),
        styles: z.any().optional(),
        attributes: z.any().optional(),
        responsiveStyles: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const page = await db.getPageById(input.pageId);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

        const project = await db.getProjectById(page.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        return db.createElement(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        parentId: z.number().optional().nullable(),
        order: z.number().optional(),
        content: z.string().optional().nullable(),
        styles: z.any().optional(),
        attributes: z.any().optional(),
        responsiveStyles: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const element = await db.getElementById(input.id);
        if (!element) throw new TRPCError({ code: 'NOT_FOUND' });

        const page = await db.getPageById(element.pageId);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

        const project = await db.getProjectById(page.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const { id, ...updates } = input;
        await db.updateElement(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const element = await db.getElementById(input.id);
        if (!element) throw new TRPCError({ code: 'NOT_FOUND' });

        const page = await db.getPageById(element.pageId);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

        const project = await db.getProjectById(page.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        await db.deleteElement(input.id);
        return { success: true };
      }),

    bulkCreate: protectedProcedure
      .input(z.object({
        pageId: z.number(),
        elements: z.array(z.object({
          parentId: z.number().optional(),
          elementType: z.string(),
          order: z.number(),
          content: z.string().optional(),
          styles: z.any().optional(),
          attributes: z.any().optional(),
          responsiveStyles: z.any().optional(),
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        const page = await db.getPageById(input.pageId);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

        const project = await db.getProjectById(page.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const elementsToCreate = input.elements.map(el => ({
          ...el,
          pageId: input.pageId,
        }));

        return db.bulkCreateElements(elementsToCreate);
      }),
  }),

  // ============================================================================
  // Templates
  // ============================================================================
  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserTemplates(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const template = await db.getTemplateById(input.id);
        if (!template) throw new TRPCError({ code: 'NOT_FOUND' });
        if (template.userId !== ctx.user.id && !template.isPublic) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        return template;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        pageId: z.number(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const page = await db.getPageById(input.pageId);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

        const project = await db.getProjectById(page.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const elements = await db.getPageElements(input.pageId);

        return db.createTemplate({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          category: input.category,
          structure: { elements },
          isPublic: false,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const template = await db.getTemplateById(input.id);
        if (!template) throw new TRPCError({ code: 'NOT_FOUND' });
        if (template.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        await db.deleteTemplate(input.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // Components
  // ============================================================================
  components: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserComponents(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const component = await db.getComponentById(input.id);
        if (!component) throw new TRPCError({ code: 'NOT_FOUND' });
        if (component.userId !== ctx.user.id && !component.isPublic) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        return component;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        elementIds: z.array(z.number()),
        category: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get elements and verify ownership
        const elements = await Promise.all(
          input.elementIds.map(id => db.getElementById(id))
        );

        if (elements.some(el => !el)) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Some elements not found' });
        }

        // Verify ownership through page/project
        const firstElement = elements[0]!;
        const page = await db.getPageById(firstElement.pageId);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

        const project = await db.getProjectById(page.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        return db.createComponent({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          category: input.category || undefined,
          structure: { elements: elements as any },
          isPublic: false,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const component = await db.getComponentById(input.id);
        if (!component) throw new TRPCError({ code: 'NOT_FOUND' });
        if (component.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        await db.deleteComponent(input.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // Assets
  // ============================================================================
  assets: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        if (input.projectId) {
          const project = await db.getProjectById(input.projectId);
          if (!project || project.userId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        return db.getUserAssets(ctx.user.id, input.projectId);
      }),

    upload: protectedProcedure
      .input(z.object({
        name: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
        projectId: z.number().optional(),
        folder: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.projectId) {
          const project = await db.getProjectById(input.projectId);
          if (!project || project.userId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }

        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `users/${ctx.user.id}/assets/${nanoid()}-${input.name}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType || 'application/octet-stream');

        return db.createAsset({
          userId: ctx.user.id,
          projectId: input.projectId,
          name: input.name,
          fileKey,
          url,
          mimeType: input.mimeType,
          fileSize: buffer.length,
          folder: input.folder,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const asset = await db.getAssetById(input.id);
        if (!asset) throw new TRPCError({ code: 'NOT_FOUND' });
        if (asset.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        await db.deleteAsset(input.id);
        return { success: true };
      }),

    // Upload file for AI chat attachment (temporary, not saved to assets table)
    uploadForAI: protectedProcedure
      .input(z.object({
        name: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
        fileType: z.enum(['image', 'code']),
      }))
      .mutation(async ({ input, ctx }) => {
        // Validate file type
        const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        const validCodeTypes = ['text/html', 'text/css', 'text/javascript', 'application/javascript', 'text/plain'];

        if (input.fileType === 'image' && !validImageTypes.includes(input.mimeType)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid image type. Supported: PNG, JPG, WEBP'
          });
        }

        if (input.fileType === 'code' && !validCodeTypes.includes(input.mimeType)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid code file type. Supported: HTML, CSS, JS'
          });
        }

        // Decode base64 and upload to temporary storage
        const buffer = Buffer.from(input.fileData, 'base64');

        // 5MB limit for attachments
        if (buffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'File too large. Maximum size: 5MB'
          });
        }

        const fileKey = `users/${ctx.user.id}/ai-temp/${nanoid()}-${input.name}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        return {
          url,
          fileKey,
          fileType: input.fileType,
          mimeType: input.mimeType,
        };
      }),
  }),

  // ============================================================================
  // AI Provider Configs
  // ============================================================================
  aiProviders: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserAiProviderConfigs(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ provider: z.string() }))
      .query(async ({ input, ctx }) => {
        return db.getAiProviderConfig(ctx.user.id, input.provider);
      }),

    save: protectedProcedure
      .input(z.object({
        provider: z.enum(['gemini', 'grok', 'openrouter', 'ollama-cloud']),
        apiKey: z.string().optional(),
        baseUrl: z.string().optional(),
        model: z.string().optional(),
        settings: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await db.getAiProviderConfig(ctx.user.id, input.provider);

        if (existing) {
          await db.updateAiProviderConfig(existing.id, input as any);
          return { success: true };
        } else {
          await db.createAiProviderConfig({
            userId: ctx.user.id,
            ...input,
            isActive: true,
          } as any);
          return { success: true };
        }
      }),

    delete: protectedProcedure
      .input(z.object({ provider: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const config = await db.getAiProviderConfig(ctx.user.id, input.provider);
        if (!config) throw new TRPCError({ code: 'NOT_FOUND' });

        await db.deleteAiProviderConfig(config.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // AI Generation
  // ============================================================================
  ai: router({
    generateWebsite: protectedProcedure
      .input(z.object({
        prompt: z.string(),
        provider: z.enum(['gemini', 'grok', 'openrouter', 'ollama-cloud']),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const config = await db.getAiProviderConfig(ctx.user.id, input.provider);
        if (!config) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Please configure ${input.provider} API key first`
          });
        }

        const aiService = createAIService(config);
        const structure = await aiService.generateWebsiteStructure(input.prompt);

        // Save conversation
        const conversation = await db.createAiConversation({
          userId: ctx.user.id,
          projectId: input.projectId,
          provider: input.provider,
          model: config.model,
          messages: [
            { role: 'user', content: input.prompt, timestamp: Date.now() },
            { role: 'assistant', content: JSON.stringify(structure), timestamp: Date.now() },
          ],
          context: { intent: 'website_generation' },
        });

        return { structure, conversationId: conversation.id };
      }),

    chat: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        message: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const conversation = await db.getConversationById(input.conversationId);
        if (!conversation) throw new TRPCError({ code: 'NOT_FOUND' });
        if (conversation.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        const config = await db.getAiProviderConfig(ctx.user.id, conversation.provider);
        if (!config) throw new TRPCError({ code: 'PRECONDITION_FAILED' });

        const aiService = createAIService(config);

        const messages = [
          ...(conversation.messages || []),
          { role: 'user' as const, content: input.message, timestamp: Date.now() },
        ];

        const response = await aiService.generate({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        });

        const updatedMessages = [
          ...messages,
          { role: 'assistant' as const, content: response.content, timestamp: Date.now() },
        ];

        await db.updateAiConversation(input.conversationId, {
          messages: updatedMessages,
        });

        return { response: response.content };
      }),

    detectLibrary: protectedProcedure
      .input(z.object({
        htmlCode: z.string(),
        provider: z.enum(['gemini', 'grok', 'openrouter', 'ollama-cloud']),
      }))
      .mutation(async ({ input, ctx }) => {
        const config = await db.getAiProviderConfig(ctx.user.id, input.provider);
        if (!config) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Please configure ${input.provider} API key first`
          });
        }

        const aiService = createAIService(config);
        return aiService.detectUILibrary(input.htmlCode);
      }),

    suggestComponents: protectedProcedure
      .input(z.object({
        context: z.string(),
        provider: z.enum(['gemini', 'grok', 'openrouter', 'ollama-cloud']),
      }))
      .mutation(async ({ input, ctx }) => {
        const config = await db.getAiProviderConfig(ctx.user.id, input.provider);
        if (!config) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Please configure ${input.provider} API key first`
          });
        }

        const aiService = createAIService(config);
        return aiService.suggestComponents(input.context);
      }),
  }),

  // ============================================================================
  // Voice Transcription
  // ============================================================================
  voice: router({
    transcribe: protectedProcedure
      .input(z.object({
        audioData: z.string(), // base64
        language: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Upload audio to S3 first
        const buffer = Buffer.from(input.audioData, 'base64');
        const fileKey = `users/${ctx.user.id}/voice/${nanoid()}.webm`;
        const { url } = await storagePut(fileKey, buffer, 'audio/webm');

        // Transcribe
        const result = await transcribeAudio({
          audioUrl: url,
          language: input.language,
        });

        if ('error' in result) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error });
        }

        return { text: result.text };
      }),
  }),
});

export type AppRouter = typeof appRouter;
