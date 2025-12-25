/**
 * YOOtheme Pro Importer
 * Transforms YOOtheme Pro JSON layouts to OpenFlow Builder format
 */

// YOOtheme element structure
interface YOOthemeElement {
    type: string;
    props?: Record<string, any>;
    children?: YOOthemeElement[];
}

interface YOOthemeLayout {
    type: 'layout';
    children: YOOthemeElement[];
}

// OpenFlow element data for creation
export interface ImportedElement {
    elementType: string;
    content: string;
    styles: Record<string, string>;
    attributes: Record<string, any>;
    order: number;
    children?: ImportedElement[];
}

/**
 * Map YOOtheme element type to OpenFlow element type
 */
function mapElementType(yooType: string): string {
    const typeMap: Record<string, string> = {
        'headline': 'heading',
        'text': 'text',
        'button': 'button',
        'image': 'image',
        'section': 'container',
        'row': 'container',
        'column': 'container',
        'grid': 'container',
        'gallery': 'container',
        'list': 'container',
        'accordion': 'container',
        'switcher': 'container',
        'divider': 'container',
        'video': 'video',
        'icon': 'text',
        'panel': 'container',
        'card': 'container',
        'overlay': 'container',
        'slider': 'container',
        'table': 'container',
        'map': 'container',
        'countdown': 'text',
        'code': 'text',
        'description_list': 'container',
        'nav': 'container',
        'social': 'container',
        'totop': 'button',
    };
    return typeMap[yooType] || 'container';
}

/**
 * Convert YOOtheme props to CSS styles
 */
function mapPropsToStyles(props: Record<string, any>): Record<string, string> {
    const styles: Record<string, string> = {};

    // Title/text styling
    if (props.title_style) {
        const sizeMap: Record<string, string> = {
            'heading-2xlarge': '72px',
            'heading-xlarge': '48px',
            'heading-large': '36px',
            'heading-medium': '28px',
            'heading-small': '24px',
            'h1': '48px',
            'h2': '36px',
            'h3': '28px',
            'h4': '24px',
            'h5': '20px',
            'h6': '18px',
        };
        styles.fontSize = sizeMap[props.title_style] || '24px';
    }

    // Text alignment
    if (props.text_align) {
        styles.textAlign = props.text_align;
    }

    // Colors
    if (props.title_color) styles.color = props.title_color;
    if (props.background_color) styles.backgroundColor = props.background_color;

    // Margins
    if (props.margin === 'default') {
        styles.marginTop = '20px';
        styles.marginBottom = '20px';
    } else if (props.margin === 'small') {
        styles.marginTop = '10px';
        styles.marginBottom = '10px';
    } else if (props.margin === 'large') {
        styles.marginTop = '40px';
        styles.marginBottom = '40px';
    }

    // Padding
    if (props.padding === 'default') {
        styles.padding = '20px';
    } else if (props.padding === 'small') {
        styles.padding = '10px';
    } else if (props.padding === 'large') {
        styles.padding = '40px';
    }

    // Width
    if (props.width_default) {
        const widthMap: Record<string, string> = {
            '1-1': '100%',
            '1-2': '50%',
            '1-3': '33.333%',
            '2-3': '66.666%',
            '1-4': '25%',
            '3-4': '75%',
            '1-5': '20%',
            '2-5': '40%',
            '3-5': '60%',
            '4-5': '80%',
            '1-6': '16.666%',
            '5-6': '83.333%',
        };
        styles.width = widthMap[props.width_default] || '100%';
    }

    // Position for absolute elements
    if (props.position_sticky) {
        styles.position = 'sticky';
        styles.top = '0';
    }

    return styles;
}

/**
 * Extract content from YOOtheme element props
 */
function extractContent(type: string, props: Record<string, any>): string {
    switch (type) {
        case 'headline':
        case 'text':
        case 'code':
            return props.content || '';
        case 'button':
            return props.text || 'Button';
        case 'image':
            return props.src || '';
        case 'icon':
            return props.icon || '';
        default:
            return props.content || props.text || '';
    }
}

/**
 * Extract attributes from YOOtheme element props
 */
function extractAttributes(type: string, props: Record<string, any>): Record<string, any> {
    const attrs: Record<string, any> = {};

    if (type === 'headline' && props.title_element) {
        const levelMatch = props.title_element.match(/h(\d)/);
        if (levelMatch) attrs.level = parseInt(levelMatch[1]);
    }

    if (type === 'button' || type === 'link') {
        if (props.link) attrs.href = props.link;
        if (props.link_target === '_blank') attrs.target = '_blank';
    }

    if (type === 'image') {
        if (props.alt) attrs.alt = props.alt;
    }

    return attrs;
}

/**
 * Recursively transform YOOtheme element to OpenFlow format
 */
function transformElement(element: YOOthemeElement, order: number): ImportedElement {
    const props = element.props || {};

    const result: ImportedElement = {
        elementType: mapElementType(element.type),
        content: extractContent(element.type, props),
        styles: mapPropsToStyles(props),
        attributes: extractAttributes(element.type, props),
        order,
    };

    // Handle children
    if (element.children && element.children.length > 0) {
        result.children = element.children.map((child, i) => transformElement(child, i));
    }

    return result;
}

/**
 * Flatten nested structure for OpenFlow (which uses parentId references)
 */
function flattenElements(
    elements: ImportedElement[],
    parentId: number | null = null
): Array<Omit<ImportedElement, 'children'> & { parentId: number | null }> {
    const flattened: Array<Omit<ImportedElement, 'children'> & { parentId: number | null }> = [];

    for (const element of elements) {
        const { children, ...rest } = element;
        flattened.push({ ...rest, parentId });

        if (children && children.length > 0) {
            // Use negative temporary IDs that will be replaced on insert
            const tempId = -(flattened.length);
            const childElements = flattenElements(children, tempId);
            flattened.push(...childElements);
        }
    }

    return flattened;
}

/**
 * Skip container wrappers (section/row/column) and extract actual content elements
 */
function extractContentElements(element: YOOthemeElement, order: number): ImportedElement[] {
    const wrapperTypes = ['layout', 'section', 'row', 'column'];

    if (wrapperTypes.includes(element.type)) {
        // Recurse into children
        if (element.children) {
            return element.children.flatMap((child, i) => extractContentElements(child, i));
        }
        return [];
    }

    // This is a content element, transform it
    return [transformElement(element, order)];
}

/**
 * Main import function: Transform YOOtheme layout JSON to OpenFlow elements
 */
export function importFromYOOtheme(layout: YOOthemeLayout): ImportedElement[] {
    if (!layout || layout.type !== 'layout' || !layout.children) {
        throw new Error('Invalid YOOtheme layout format');
    }

    // Extract content elements, skipping layout wrappers
    const elements = layout.children.flatMap((child, i) => extractContentElements(child, i));

    return elements;
}

/**
 * Import with flattened structure (for direct DB insertion)
 */
export function importFromYOOthemeFlat(layout: YOOthemeLayout) {
    const elements = importFromYOOtheme(layout);
    return flattenElements(elements);
}

/**
 * Validate YOOtheme JSON structure
 */
export function validateYOOthemeLayout(json: any): json is YOOthemeLayout {
    return (
        json &&
        typeof json === 'object' &&
        json.type === 'layout' &&
        Array.isArray(json.children)
    );
}
