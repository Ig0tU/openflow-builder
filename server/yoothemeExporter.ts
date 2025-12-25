/**
 * YOOtheme Pro Exporter
 * Transforms OpenFlow Builder layouts to YOOtheme Pro format for Joomla
 */

import type { Element, Page, Project } from '../drizzle/schema';

// YOOtheme Pro element types
type YOOthemeElementType =
    | 'layout' | 'section' | 'row' | 'column'
    | 'headline' | 'text' | 'button' | 'image' | 'divider'
    | 'grid' | 'gallery' | 'list' | 'accordion' | 'switcher';

interface YOOthemeProps {
    [key: string]: any;
}

interface YOOthemeElement {
    type: YOOthemeElementType | string;
    props?: YOOthemeProps;
    children?: YOOthemeElement[];
}

interface YOOthemeLayout {
    type: 'layout';
    children: YOOthemeElement[];
}

/**
 * Map OpenFlow element type to YOOtheme element type
 */
function mapElementType(openflowType: string): YOOthemeElementType | string {
    const typeMap: Record<string, YOOthemeElementType> = {
        'heading': 'headline',
        'text': 'text',
        'button': 'button',
        'image': 'image',
        'container': 'section',
        'link': 'button',
        'input': 'text',
        'textarea': 'text',
        'select': 'list',
        'grid': 'grid',
        'video': 'video',
    };
    return typeMap[openflowType] || 'text';
}

/**
 * Convert CSS styles to YOOtheme props
 */
function mapStyles(styles: Record<string, string>): YOOthemeProps {
    const props: YOOthemeProps = {};

    // Text alignment
    if (styles.textAlign) {
        props.text_align = styles.textAlign;
    }

    // Font size -> title_style or text_size
    if (styles.fontSize) {
        const size = parseInt(styles.fontSize);
        if (size >= 48) props.title_style = 'heading-2xlarge';
        else if (size >= 36) props.title_style = 'heading-xlarge';
        else if (size >= 28) props.title_style = 'heading-large';
        else if (size >= 24) props.title_style = 'heading-medium';
        else if (size >= 20) props.title_style = 'heading-small';
    }

    // Colors
    if (styles.color) props.title_color = styles.color;
    if (styles.backgroundColor) props.background_color = styles.backgroundColor;

    // Margin
    if (styles.marginTop) props.margin = 'default';
    if (styles.marginBottom) props.margin = 'default';

    // Padding
    if (styles.padding) props.padding = 'default';

    return props;
}

/**
 * Transform a single OpenFlow element to YOOtheme element
 */
function transformElement(element: Element): YOOthemeElement {
    const yooType = mapElementType(element.elementType);
    const styles = (element.styles as Record<string, string>) || {};
    const styleProps = mapStyles(styles);

    const yooElement: YOOthemeElement = {
        type: yooType,
        props: {
            ...styleProps,
        },
    };

    // Content mapping based on element type
    switch (element.elementType) {
        case 'heading':
            yooElement.props!.content = element.content || 'Heading';
            yooElement.props!.title_element = 'h2';
            break;

        case 'text':
            yooElement.props!.content = element.content || '';
            break;

        case 'button':
            yooElement.props!.text = element.content || 'Button';
            yooElement.props!.style = 'primary';
            const attrs = element.attributes as Record<string, any> || {};
            if (attrs.href) yooElement.props!.link = attrs.href;
            break;

        case 'image':
            yooElement.props!.src = element.content || '';
            yooElement.props!.alt = '';
            break;

        case 'link':
            yooElement.props!.text = element.content || 'Link';
            yooElement.props!.style = 'text';
            break;

        default:
            yooElement.props!.content = element.content || '';
    }

    return yooElement;
}

/**
 * Wrap elements in YOOtheme Section/Row/Column structure
 */
function wrapInLayout(elements: YOOthemeElement[]): YOOthemeLayout {
    // Group elements into a single section with one row and one column
    const column: YOOthemeElement = {
        type: 'column',
        props: {
            width_default: '1-1',
        },
        children: elements,
    };

    const row: YOOthemeElement = {
        type: 'row',
        props: {
            column_gap: 'default',
            row_gap: 'default',
        },
        children: [column],
    };

    const section: YOOthemeElement = {
        type: 'section',
        props: {
            style: 'default',
            width: 'default',
            padding: 'default',
        },
        children: [row],
    };

    return {
        type: 'layout',
        children: [section],
    };
}

/**
 * Group elements by parent to create nested structure
 */
function groupByParent(elements: Element[]): Map<number | null, Element[]> {
    const groups = new Map<number | null, Element[]>();

    for (const element of elements) {
        const parentId = element.parentId || null;
        if (!groups.has(parentId)) {
            groups.set(parentId, []);
        }
        groups.get(parentId)!.push(element);
    }

    return groups;
}

/**
 * Build hierarchical YOOtheme elements from flat OpenFlow elements
 */
function buildHierarchy(
    elements: Element[],
    parentId: number | null,
    groups: Map<number | null, Element[]>
): YOOthemeElement[] {
    const children = groups.get(parentId) || [];

    return children
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(element => {
            const yooElement = transformElement(element);
            const nestedChildren = buildHierarchy(elements, element.id, groups);

            if (nestedChildren.length > 0) {
                yooElement.children = nestedChildren;
            }

            return yooElement;
        });
}

/**
 * Main export function: Transform OpenFlow page to YOOtheme layout JSON
 */
export function exportToYOOtheme(
    page: Page,
    elements: Element[],
    project?: Project
): YOOthemeLayout {
    // Build element hierarchy
    const groups = groupByParent(elements);
    const rootElements = buildHierarchy(elements, null, groups);

    // Transform to YOOtheme format
    const yooElements = rootElements.length > 0
        ? rootElements
        : [{ type: 'text', props: { content: 'Empty page' } } as YOOthemeElement];

    // Wrap in layout structure
    return wrapInLayout(yooElements);
}

/**
 * Export multiple pages as a full YOOtheme layout
 */
export function exportProjectToYOOtheme(
    project: Project,
    pages: Array<{ page: Page; elements: Element[] }>
): YOOthemeLayout {
    const allSections: YOOthemeElement[] = [];

    for (const { page, elements } of pages) {
        const pageLayout = exportToYOOtheme(page, elements, project);
        allSections.push(...pageLayout.children);
    }

    return {
        type: 'layout',
        children: allSections,
    };
}
