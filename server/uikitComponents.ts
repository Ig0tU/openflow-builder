/**
 * UIkit Component Library
 * 40+ premium components for OpenFlow Builder
 */

export const UIKIT_COMPONENTS = {
    // ============ LAYOUT ============
    'uk-container': {
        name: 'Container',
        category: 'layout',
        description: 'Centered content container with max-width',
        classes: 'uk-container',
        variants: ['default', 'xsmall', 'small', 'large', 'xlarge', 'expand'],
        defaultProps: { size: 'default' },
    },
    'uk-section': {
        name: 'Section',
        category: 'layout',
        description: 'Full-width section with padding',
        classes: 'uk-section',
        variants: ['default', 'muted', 'primary', 'secondary'],
        defaultProps: { style: 'default', padding: 'default' },
    },
    'uk-grid': {
        name: 'Grid',
        category: 'layout',
        description: 'Responsive grid system',
        classes: 'uk-grid',
        variants: ['small', 'medium', 'large', 'collapse', 'match'],
        defaultProps: { gutter: 'default', childWidth: '1-3' },
    },
    'uk-flex': {
        name: 'Flex Container',
        category: 'layout',
        description: 'Flexbox layout container',
        classes: 'uk-flex',
        variants: ['center', 'middle', 'between', 'around', 'wrap'],
        defaultProps: { justify: 'start', align: 'stretch' },
    },
    'uk-width': {
        name: 'Width Container',
        category: 'layout',
        description: 'Responsive width control',
        classes: 'uk-width-1-1',
        variants: ['1-1', '1-2', '1-3', '2-3', '1-4', '3-4', '1-5', '2-5', '3-5', '4-5'],
        defaultProps: { width: '1-1' },
    },

    // ============ NAVIGATION ============
    'uk-navbar': {
        name: 'Navbar',
        category: 'navigation',
        description: 'Horizontal navigation bar',
        classes: 'uk-navbar-container',
        variants: ['transparent', 'sticky'],
        defaultProps: { transparent: false, sticky: false },
        template: `<nav class="uk-navbar-container" uk-navbar>
      <div class="uk-navbar-left"><a class="uk-navbar-item uk-logo" href="#">{logo}</a></div>
      <div class="uk-navbar-right"><ul class="uk-navbar-nav">{navItems}</ul></div>
    </nav>`,
    },
    'uk-nav': {
        name: 'Nav Menu',
        category: 'navigation',
        description: 'Vertical navigation menu',
        classes: 'uk-nav uk-nav-default',
        variants: ['default', 'primary', 'center', 'divider'],
        defaultProps: { style: 'default' },
    },
    'uk-breadcrumb': {
        name: 'Breadcrumb',
        category: 'navigation',
        description: 'Breadcrumb navigation',
        classes: 'uk-breadcrumb',
        defaultProps: {},
    },
    'uk-pagination': {
        name: 'Pagination',
        category: 'navigation',
        description: 'Page navigation',
        classes: 'uk-pagination',
        defaultProps: { currentPage: 1, totalPages: 5 },
    },
    'uk-dropdown': {
        name: 'Dropdown',
        category: 'navigation',
        description: 'Dropdown menu',
        classes: 'uk-dropdown',
        variants: ['bottom-left', 'bottom-center', 'bottom-right', 'top-left'],
        defaultProps: { position: 'bottom-left' },
    },
    'uk-tab': {
        name: 'Tabs',
        category: 'navigation',
        description: 'Tab navigation',
        classes: 'uk-tab',
        variants: ['left', 'right', 'bottom'],
        defaultProps: { position: 'top' },
    },

    // ============ CONTENT ============
    'uk-card': {
        name: 'Card',
        category: 'content',
        description: 'Content card with header, body, footer',
        classes: 'uk-card uk-card-default',
        variants: ['default', 'primary', 'secondary', 'hover'],
        defaultProps: { style: 'default', padding: 'default', hover: false },
        template: `<div class="uk-card uk-card-{style} uk-card-body">
      <h3 class="uk-card-title">{title}</h3>
      <p>{content}</p>
    </div>`,
    },
    'uk-article': {
        name: 'Article',
        category: 'content',
        description: 'Blog/article content',
        classes: 'uk-article',
        defaultProps: {},
        template: `<article class="uk-article">
      <h1 class="uk-article-title">{title}</h1>
      <p class="uk-article-meta">{meta}</p>
      <p class="uk-text-lead">{lead}</p>
      {content}
    </article>`,
    },
    'uk-comment': {
        name: 'Comment',
        category: 'content',
        description: 'Comment/review block',
        classes: 'uk-comment',
        defaultProps: {},
    },
    'uk-table': {
        name: 'Table',
        category: 'content',
        description: 'Data table',
        classes: 'uk-table',
        variants: ['divider', 'striped', 'hover', 'small', 'large', 'justify', 'middle'],
        defaultProps: { style: 'divider' },
    },
    'uk-list': {
        name: 'List',
        category: 'content',
        description: 'Styled list',
        classes: 'uk-list',
        variants: ['disc', 'circle', 'square', 'decimal', 'hyphen', 'divider', 'striped'],
        defaultProps: { style: 'disc' },
    },
    'uk-description-list': {
        name: 'Description List',
        category: 'content',
        description: 'Term and description pairs',
        classes: 'uk-description-list',
        variants: ['divider'],
        defaultProps: {},
    },

    // ============ MEDIA ============
    'uk-lightbox': {
        name: 'Lightbox',
        category: 'media',
        description: 'Image gallery lightbox',
        classes: '',
        attribute: 'uk-lightbox',
        defaultProps: {},
    },
    'uk-slideshow': {
        name: 'Slideshow',
        category: 'media',
        description: 'Image/content slideshow',
        classes: 'uk-slideshow',
        attribute: 'uk-slideshow',
        defaultProps: { autoplay: false, ratio: '16:9' },
    },
    'uk-slider': {
        name: 'Slider',
        category: 'media',
        description: 'Content slider/carousel',
        classes: 'uk-slider',
        attribute: 'uk-slider',
        defaultProps: { autoplay: false, center: false },
    },

    // ============ INTERACTIVE ============
    'uk-accordion': {
        name: 'Accordion',
        category: 'interactive',
        description: 'Collapsible content panels',
        classes: 'uk-accordion',
        attribute: 'uk-accordion',
        defaultProps: { multiple: false, collapsible: true },
    },
    'uk-modal': {
        name: 'Modal',
        category: 'interactive',
        description: 'Modal dialog',
        classes: 'uk-modal',
        variants: ['full', 'container', 'center'],
        defaultProps: { center: true },
    },
    'uk-offcanvas': {
        name: 'Offcanvas',
        category: 'interactive',
        description: 'Slide-out panel',
        classes: 'uk-offcanvas',
        variants: ['push', 'reveal', 'none'],
        defaultProps: { mode: 'slide', overlay: true },
    },
    'uk-switcher': {
        name: 'Switcher',
        category: 'interactive',
        description: 'Content switcher (tabs content)',
        classes: 'uk-switcher',
        defaultProps: {},
    },
    'uk-toggle': {
        name: 'Toggle',
        category: 'interactive',
        description: 'Toggle visibility',
        attribute: 'uk-toggle',
        defaultProps: {},
    },
    'uk-scroll': {
        name: 'Smooth Scroll',
        category: 'interactive',
        description: 'Smooth scroll to anchor',
        attribute: 'uk-scroll',
        defaultProps: {},
    },
    'uk-scrollspy': {
        name: 'Scrollspy',
        category: 'interactive',
        description: 'Animate on scroll into view',
        attribute: 'uk-scrollspy',
        defaultProps: { animation: 'fade' },
    },
    'uk-tooltip': {
        name: 'Tooltip',
        category: 'interactive',
        description: 'Hover tooltip',
        attribute: 'uk-tooltip',
        variants: ['top', 'bottom', 'left', 'right'],
        defaultProps: { position: 'top' },
    },

    // ============ FORM ============
    'uk-form': {
        name: 'Form',
        category: 'form',
        description: 'Form container',
        classes: 'uk-form-stacked',
        variants: ['stacked', 'horizontal'],
        defaultProps: { layout: 'stacked' },
    },
    'uk-input': {
        name: 'Input',
        category: 'form',
        description: 'Text input',
        classes: 'uk-input',
        variants: ['default', 'blank', 'danger', 'success'],
        defaultProps: { type: 'text', size: 'default' },
    },
    'uk-textarea': {
        name: 'Textarea',
        category: 'form',
        description: 'Multi-line text input',
        classes: 'uk-textarea',
        defaultProps: { rows: 4 },
    },
    'uk-select': {
        name: 'Select',
        category: 'form',
        description: 'Dropdown select',
        classes: 'uk-select',
        defaultProps: {},
    },
    'uk-checkbox': {
        name: 'Checkbox',
        category: 'form',
        description: 'Checkbox input',
        classes: 'uk-checkbox',
        defaultProps: {},
    },
    'uk-radio': {
        name: 'Radio',
        category: 'form',
        description: 'Radio button',
        classes: 'uk-radio',
        defaultProps: {},
    },
    'uk-range': {
        name: 'Range Slider',
        category: 'form',
        description: 'Range input',
        classes: 'uk-range',
        defaultProps: { min: 0, max: 100 },
    },

    // ============ BUTTONS ============
    'uk-button': {
        name: 'Button',
        category: 'buttons',
        description: 'Styled button',
        classes: 'uk-button uk-button-default',
        variants: ['default', 'primary', 'secondary', 'danger', 'text', 'link'],
        sizes: ['small', 'default', 'large'],
        defaultProps: { style: 'primary', size: 'default' },
    },
    'uk-button-group': {
        name: 'Button Group',
        category: 'buttons',
        description: 'Grouped buttons',
        classes: 'uk-button-group',
        defaultProps: {},
    },
    'uk-icon-button': {
        name: 'Icon Button',
        category: 'buttons',
        description: 'Button with icon',
        classes: 'uk-icon-button',
        defaultProps: { icon: 'heart' },
    },

    // ============ INDICATORS ============
    'uk-alert': {
        name: 'Alert',
        category: 'indicators',
        description: 'Alert/notification message',
        classes: 'uk-alert',
        variants: ['primary', 'success', 'warning', 'danger'],
        defaultProps: { style: 'primary', closable: true },
    },
    'uk-badge': {
        name: 'Badge',
        category: 'indicators',
        description: 'Small badge/label',
        classes: 'uk-badge',
        defaultProps: {},
    },
    'uk-label': {
        name: 'Label',
        category: 'indicators',
        description: 'Status label',
        classes: 'uk-label',
        variants: ['default', 'success', 'warning', 'danger'],
        defaultProps: { style: 'default' },
    },
    'uk-progress': {
        name: 'Progress Bar',
        category: 'indicators',
        description: 'Progress indicator',
        classes: 'uk-progress',
        defaultProps: { value: 50, max: 100 },
    },
    'uk-spinner': {
        name: 'Spinner',
        category: 'indicators',
        description: 'Loading spinner',
        attribute: 'uk-spinner',
        defaultProps: { ratio: 1 },
    },

    // ============ SECTIONS ============
    'uk-hero': {
        name: 'Hero Section',
        category: 'sections',
        description: 'Full-width hero banner',
        classes: 'uk-section uk-section-large uk-flex uk-flex-middle',
        defaultProps: { height: 'large', overlay: false },
        template: `<section class="uk-section uk-section-{height} uk-flex uk-flex-middle uk-background-cover" style="background-image: url({backgroundImage})">
      <div class="uk-container uk-text-center">
        <h1 class="uk-heading-large">{title}</h1>
        <p class="uk-text-lead">{subtitle}</p>
        <a class="uk-button uk-button-primary uk-button-large" href="#">{ctaText}</a>
      </div>
    </section>`,
    },
    'uk-cover': {
        name: 'Cover',
        category: 'sections',
        description: 'Full-screen cover image/video',
        classes: 'uk-cover-container',
        attribute: 'uk-cover',
        defaultProps: {},
    },
    'uk-parallax': {
        name: 'Parallax Section',
        category: 'sections',
        description: 'Parallax scrolling effect',
        attribute: 'uk-parallax',
        defaultProps: { bgy: -200 },
    },

    // ============ UTILITIES ============
    'uk-icon': {
        name: 'Icon',
        category: 'utilities',
        description: 'SVG icon',
        attribute: 'uk-icon',
        variants: ['home', 'heart', 'star', 'check', 'close', 'menu', 'search', 'user', 'settings', 'mail', 'phone', 'location', 'calendar', 'clock', 'cart', 'download', 'upload', 'play', 'pause', 'forward', 'backward', 'refresh', 'link', 'image', 'video', 'file', 'folder', 'trash', 'pencil', 'plus', 'minus', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down', 'chevron-left', 'chevron-right', 'chevron-up', 'chevron-down', 'facebook', 'twitter', 'instagram', 'youtube', 'linkedin', 'github'],
        defaultProps: { icon: 'star', ratio: 1 },
    },
    'uk-divider': {
        name: 'Divider',
        category: 'utilities',
        description: 'Horizontal divider',
        classes: 'uk-divider-icon',
        variants: ['icon', 'small', 'vertical'],
        defaultProps: { style: 'icon' },
    },
    'uk-countdown': {
        name: 'Countdown',
        category: 'utilities',
        description: 'Countdown timer',
        attribute: 'uk-countdown',
        defaultProps: { date: '2025-12-31' },
    },
} as const;

// Component categories for UI organization
export const UIKIT_CATEGORIES = [
    { id: 'layout', name: 'Layout', icon: 'grid' },
    { id: 'navigation', name: 'Navigation', icon: 'menu' },
    { id: 'content', name: 'Content', icon: 'file-text' },
    { id: 'media', name: 'Media', icon: 'image' },
    { id: 'interactive', name: 'Interactive', icon: 'mouse-pointer' },
    { id: 'form', name: 'Form', icon: 'edit' },
    { id: 'buttons', name: 'Buttons', icon: 'square' },
    { id: 'indicators', name: 'Indicators', icon: 'alert-circle' },
    { id: 'sections', name: 'Sections', icon: 'layout' },
    { id: 'utilities', name: 'Utilities', icon: 'tool' },
];

// Tech Space theme color tokens
export const TECH_SPACE_THEME = {
    primaryColor: '#564AEB',
    secondaryColor: '#111',
    backgroundColor: '#FFF',
    mutedBackground: '#F8F8F8',
    successColor: '#42C65C',
    warningColor: '#FFAD4F',
    dangerColor: '#FB3F3F',
    textColor: '#2C2C2C',
    mutedColor: '#868686',
    borderColor: '#EDEDED',
    fontFamily: "'Nunito Sans', sans-serif",
    headingFont: 'Heebo, sans-serif',
};

export type UIkitComponentType = keyof typeof UIKIT_COMPONENTS;
export type UIkitCategory = typeof UIKIT_CATEGORIES[number]['id'];
