/**
 * Preview Server
 * Renders multi-page previews with navigation
 */

import type { Application, Request, Response } from 'express';
import * as db from './db';
import type { Element } from '../drizzle/schema';

// Recursive HTML renderer (shared with export)
function renderElementHTML(element: Element, allElements: Element[], indent = ''): string {
    const styles = element.styles || {};
    const styleStr = Object.entries(styles)
        .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`)
        .join('; ');
    const content = element.content || '';
    const attrs = element.attributes || {};
    const attrStr = Object.entries(attrs)
        .filter(([k]) => k !== 'class')
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
    const className = attrs.class || '';

    // Find children recursively
    const children = allElements
        .filter(el => el.parentId === element.id)
        .sort((a, b) => a.order - b.order);

    const childrenHTML = children.length > 0
        ? '\n' + children.map(child => renderElementHTML(child, allElements, indent + '  ')).join('\n') + '\n' + indent
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
        case 'video':
            return `${indent}<video src="${content}" class="${className}" style="${styleStr}" ${attrStr} controls></video>`;
        case 'input':
            return `${indent}<input type="${attrs.type || 'text'}" placeholder="${attrs.placeholder || ''}" class="${className}" style="${styleStr}" ${attrStr} />`;
        case 'textarea':
            return `${indent}<textarea placeholder="${attrs.placeholder || ''}" class="${className}" style="${styleStr}" ${attrStr}></textarea>`;
        case 'select':
            return `${indent}<select class="${className}" style="${styleStr}" ${attrStr}><option>Option 1</option><option>Option 2</option></select>`;
        default:
            return `${indent}<div class="${className}" style="${styleStr}" ${attrStr}>${childrenHTML}</div>`;
    }
}

// Generate navigation menu for multi-page previews
function generateNav(pages: any[], currentSlug: string, projectId: number): string {
    return `
    <nav style="background: #f8f9fa; border-bottom: 1px solid #dee2e6; padding: 16px 24px; position: sticky; top: 0; z-index: 1000;">
      <div style="max-width: 1200px; margin: 0 auto; display: flex; gap: 24px; align-items: center;">
        <span style="font-weight: 600; color: #495057; margin-right: auto;">Preview Mode</span>
        ${pages.map(p => `
          <a href="/preview/${projectId}/${p.slug}" 
             style="text-decoration: none; color: ${p.slug === currentSlug ? '#007bff' : '#6c757d'}; 
                    font-weight: ${p.slug === currentSlug ? '600' : '400'}; 
                    padding: 8px 12px; border-radius: 4px; 
                    background: ${p.slug === currentSlug ? '#e7f3ff' : 'transparent'};">
            ${p.name}
          </a>
        `).join('')}
        <a href="/builder/${projectId}" style="text-decoration: none; color: #fff; background: #007bff; padding: 8px 16px; border-radius: 4px; font-weight: 500;">
          Back to Editor
        </a>
      </div>
    </nav>
  `;
}

export function registerPreviewRoutes(app: Application) {
    // Preview specific page
    app.get('/preview/:projectId/:pageSlug', async (req: Request, res: Response) => {
        try {
            const { projectId, pageSlug } = req.params;

            const project = await db.getProjectById(parseInt(projectId));
            if (!project) {
                return res.status(404).send('Project not found');
            }

            const pages = await db.getProjectPages(parseInt(projectId));
            const page = pages.find(p => p.slug === pageSlug);

            if (!page) {
                return res.status(404).send('Page not found');
            }

            const elements = await db.getPageElements(page.id);
            const rootElements = elements.filter(el => !el.parentId).sort((a, b) => a.order - b.order);
            const bodyHTML = rootElements.map(el => renderElementHTML(el, elements, '    ')).join('\n');

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.name} - ${project.name}</title>
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
  ${generateNav(pages, pageSlug, parseInt(projectId))}
  <main>
${bodyHTML}
  </main>
  <!-- UIkit JS -->
  <script src="https://cdn.jsdelivr.net/npm/uikit@3.17.11/dist/js/uikit.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/uikit@3.17.11/dist/js/uikit-icons.min.js"></script>
</body>
</html>`;

            res.send(html);
        } catch (error) {
            console.error('[Preview] Error:', error);
            res.status(500).send('Preview failed');
        }
    });

    // Preview project (redirect to index or first page)
    app.get('/preview/:projectId', async (req: Request, res: Response) => {
        try {
            const { projectId } = req.params;

            const pages = await db.getProjectPages(parseInt(projectId));
            if (pages.length === 0) {
                return res.status(404).send('No pages in project');
            }

            const indexPage = pages.find(p => p.slug === 'index') || pages[0];
            res.redirect(`/preview/${projectId}/${indexPage.slug}`);
        } catch (error) {
            console.error('[Preview] Error:', error);
            res.status(500).send('Preview failed');
        }
    });
}
