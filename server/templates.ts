/**
 * Starter Templates using UIkit Components
 */

import { TECH_SPACE_THEME } from './uikitComponents';

export const STARTER_TEMPLATES = {
    'tech-landing': {
        name: 'Tech Landing Page',
        description: 'Modern SaaS/tech product landing page',
        thumbnail: 'https://via.placeholder.com/400x300/564AEB/ffffff?text=Tech+Landing',
        pages: [
            {
                name: 'Home',
                slug: 'index',
                elements: [
                    // Hero Section
                    {
                        elementType: 'uk-section',
                        order: 0,
                        styles: {
                            backgroundColor: TECH_SPACE_THEME.secondaryColor,
                            minHeight: '80vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        },
                        attributes: { class: 'uk-section uk-section-large uk-light' },
                        children: [
                            {
                                elementType: 'uk-container',
                                attributes: { class: 'uk-container uk-text-center' },
                                children: [
                                    {
                                        elementType: 'heading',
                                        content: 'Build Something Amazing',
                                        styles: { fontSize: '56px', fontWeight: '700', marginBottom: '24px', color: '#fff' },
                                        attributes: { class: 'uk-heading-large', level: '1' },
                                    },
                                    {
                                        elementType: 'paragraph',
                                        content: 'The next-generation platform for modern teams. Ship faster, scale easier.',
                                        styles: { fontSize: '20px', color: '#a0a0a0', maxWidth: '600px', margin: '0 auto 32px' },
                                        attributes: { class: 'uk-text-lead' },
                                    },
                                    {
                                        elementType: 'uk-button',
                                        content: 'Get Started Free',
                                        styles: { backgroundColor: TECH_SPACE_THEME.primaryColor, color: '#fff', padding: '16px 32px', borderRadius: '4px', fontSize: '16px', fontWeight: '600' },
                                        attributes: { class: 'uk-button uk-button-primary uk-button-large' },
                                    },
                                ],
                            },
                        ],
                    },
                    // Features Grid
                    {
                        elementType: 'uk-section',
                        order: 1,
                        styles: { backgroundColor: '#fff', padding: '80px 0' },
                        attributes: { class: 'uk-section' },
                        children: [
                            {
                                elementType: 'uk-container',
                                attributes: { class: 'uk-container' },
                                children: [
                                    {
                                        elementType: 'heading',
                                        content: 'Why Choose Us',
                                        styles: { textAlign: 'center', marginBottom: '48px', fontSize: '36px', fontWeight: '700' },
                                        attributes: { class: 'uk-heading-medium', level: '2' },
                                    },
                                    {
                                        elementType: 'uk-grid',
                                        attributes: { class: 'uk-grid uk-child-width-1-3@m', 'uk-grid': '' },
                                        children: [
                                            { elementType: 'uk-card', content: 'Lightning Fast', styles: { padding: '32px', backgroundColor: '#f8f8f8', borderRadius: '8px' } },
                                            { elementType: 'uk-card', content: 'Secure by Default', styles: { padding: '32px', backgroundColor: '#f8f8f8', borderRadius: '8px' } },
                                            { elementType: 'uk-card', content: 'Scale Infinitely', styles: { padding: '32px', backgroundColor: '#f8f8f8', borderRadius: '8px' } },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                    // CTA Section
                    {
                        elementType: 'uk-section',
                        order: 2,
                        styles: { backgroundColor: TECH_SPACE_THEME.primaryColor, padding: '60px 0', textAlign: 'center' },
                        attributes: { class: 'uk-section uk-light' },
                        children: [
                            {
                                elementType: 'heading',
                                content: 'Ready to Get Started?',
                                styles: { color: '#fff', marginBottom: '24px', fontSize: '32px' },
                            },
                            {
                                elementType: 'uk-button',
                                content: 'Start Free Trial',
                                styles: { backgroundColor: '#fff', color: TECH_SPACE_THEME.primaryColor, padding: '14px 28px', borderRadius: '4px', fontWeight: '600' },
                            },
                        ],
                    },
                ],
            },
        ],
    },

    'portfolio': {
        name: 'Portfolio',
        description: 'Creative portfolio for designers and developers',
        thumbnail: 'https://via.placeholder.com/400x300/111111/ffffff?text=Portfolio',
        pages: [
            {
                name: 'Home',
                slug: 'index',
                elements: [
                    // Hero
                    {
                        elementType: 'uk-section',
                        order: 0,
                        styles: { backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center' },
                        attributes: { class: 'uk-section uk-section-large uk-light' },
                        children: [
                            {
                                elementType: 'uk-container',
                                children: [
                                    { elementType: 'paragraph', content: 'Hello, I am', styles: { color: '#888', marginBottom: '8px' } },
                                    { elementType: 'heading', content: 'John Designer', styles: { fontSize: '72px', fontWeight: '700', color: '#fff', marginBottom: '16px' } },
                                    { elementType: 'paragraph', content: 'Product Designer & Creative Director', styles: { fontSize: '24px', color: TECH_SPACE_THEME.primaryColor } },
                                ],
                            },
                        ],
                    },
                    // Work Grid
                    {
                        elementType: 'uk-section',
                        order: 1,
                        styles: { backgroundColor: '#fff', padding: '80px 0' },
                        children: [
                            {
                                elementType: 'uk-container',
                                children: [
                                    { elementType: 'heading', content: 'Selected Work', styles: { marginBottom: '48px', fontSize: '32px' } },
                                    {
                                        elementType: 'uk-grid',
                                        attributes: { class: 'uk-grid uk-child-width-1-2@m', 'uk-grid': '' },
                                        children: [
                                            { elementType: 'image', content: 'https://via.placeholder.com/600x400/564AEB/ffffff?text=Project+1', styles: { width: '100%', borderRadius: '8px' } },
                                            { elementType: 'image', content: 'https://via.placeholder.com/600x400/111111/ffffff?text=Project+2', styles: { width: '100%', borderRadius: '8px' } },
                                            { elementType: 'image', content: 'https://via.placeholder.com/600x400/42C65C/ffffff?text=Project+3', styles: { width: '100%', borderRadius: '8px' } },
                                            { elementType: 'image', content: 'https://via.placeholder.com/600x400/FFAD4F/ffffff?text=Project+4', styles: { width: '100%', borderRadius: '8px' } },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                name: 'About',
                slug: 'about',
                elements: [
                    {
                        elementType: 'uk-section',
                        order: 0,
                        styles: { padding: '80px 0' },
                        children: [
                            {
                                elementType: 'uk-container',
                                children: [
                                    { elementType: 'heading', content: 'About Me', styles: { fontSize: '48px', marginBottom: '32px' } },
                                    { elementType: 'paragraph', content: "I'm a product designer with 10+ years of experience creating digital experiences for startups and Fortune 500 companies.", styles: { fontSize: '20px', lineHeight: '1.7', maxWidth: '700px' } },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                name: 'Contact',
                slug: 'contact',
                elements: [
                    {
                        elementType: 'uk-section',
                        order: 0,
                        styles: { padding: '80px 0' },
                        children: [
                            {
                                elementType: 'uk-container',
                                attributes: { class: 'uk-container uk-container-small' },
                                children: [
                                    { elementType: 'heading', content: "Let's Work Together", styles: { fontSize: '48px', marginBottom: '32px', textAlign: 'center' } },
                                    { elementType: 'uk-input', attributes: { placeholder: 'Your Name', class: 'uk-input uk-margin' }, styles: { marginBottom: '16px' } },
                                    { elementType: 'uk-input', attributes: { placeholder: 'Your Email', class: 'uk-input uk-margin' }, styles: { marginBottom: '16px' } },
                                    { elementType: 'uk-textarea', attributes: { placeholder: 'Message', class: 'uk-textarea' }, styles: { marginBottom: '24px' } },
                                    { elementType: 'uk-button', content: 'Send Message', styles: { backgroundColor: TECH_SPACE_THEME.primaryColor, color: '#fff', padding: '14px 32px', width: '100%' } },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },

    'saas-marketing': {
        name: 'SaaS Marketing',
        description: 'Product marketing page with pricing',
        thumbnail: 'https://via.placeholder.com/400x300/42C65C/ffffff?text=SaaS',
        pages: [
            {
                name: 'Home',
                slug: 'index',
                elements: [
                    // Navbar
                    {
                        elementType: 'uk-navbar',
                        order: 0,
                        styles: { padding: '16px 24px', backgroundColor: '#fff', borderBottom: '1px solid #eee' },
                        children: [
                            { elementType: 'link', content: 'ProductName', styles: { fontWeight: '700', fontSize: '20px', color: TECH_SPACE_THEME.primaryColor } },
                            { elementType: 'uk-button', content: 'Sign Up', styles: { backgroundColor: TECH_SPACE_THEME.primaryColor, color: '#fff', padding: '10px 20px', borderRadius: '4px' } },
                        ],
                    },
                    // Hero
                    {
                        elementType: 'uk-section',
                        order: 1,
                        styles: { backgroundColor: '#fff', padding: '120px 0', textAlign: 'center' },
                        children: [
                            { elementType: 'heading', content: 'The Only Tool You Need', styles: { fontSize: '52px', fontWeight: '700', marginBottom: '24px' } },
                            { elementType: 'paragraph', content: 'Streamline your workflow with our all-in-one platform.', styles: { fontSize: '20px', color: '#666', marginBottom: '32px' } },
                            { elementType: 'image', content: 'https://via.placeholder.com/1000x600/f8f8f8/564AEB?text=Product+Screenshot', styles: { maxWidth: '900px', width: '100%', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' } },
                        ],
                    },
                    // Pricing
                    {
                        elementType: 'uk-section',
                        order: 2,
                        styles: { backgroundColor: '#f8f8f8', padding: '80px 0' },
                        children: [
                            { elementType: 'heading', content: 'Simple Pricing', styles: { textAlign: 'center', marginBottom: '48px', fontSize: '36px' } },
                            {
                                elementType: 'uk-grid',
                                attributes: { class: 'uk-grid uk-child-width-1-3@m uk-grid-match', 'uk-grid': '' },
                                styles: { maxWidth: '1000px', margin: '0 auto' },
                                children: [
                                    { elementType: 'uk-card', content: '<h3>Starter</h3><p style="font-size:36px;font-weight:700">$9<span style="font-size:16px">/mo</span></p><p>For individuals</p>', styles: { backgroundColor: '#fff', padding: '40px', borderRadius: '8px', textAlign: 'center' } },
                                    { elementType: 'uk-card', content: '<h3>Pro</h3><p style="font-size:36px;font-weight:700">$29<span style="font-size:16px">/mo</span></p><p>For teams</p>', styles: { backgroundColor: TECH_SPACE_THEME.primaryColor, color: '#fff', padding: '40px', borderRadius: '8px', textAlign: 'center' } },
                                    { elementType: 'uk-card', content: '<h3>Enterprise</h3><p style="font-size:36px;font-weight:700">$99<span style="font-size:16px">/mo</span></p><p>For large orgs</p>', styles: { backgroundColor: '#fff', padding: '40px', borderRadius: '8px', textAlign: 'center' } },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },

    'blog': {
        name: 'Blog',
        description: 'Personal or company blog layout',
        thumbnail: 'https://via.placeholder.com/400x300/FFAD4F/ffffff?text=Blog',
        pages: [
            {
                name: 'Home',
                slug: 'index',
                elements: [
                    // Header
                    {
                        elementType: 'uk-section',
                        order: 0,
                        styles: { padding: '60px 0', textAlign: 'center', backgroundColor: '#fff' },
                        children: [
                            { elementType: 'heading', content: 'The Daily Blog', styles: { fontSize: '48px', fontWeight: '700' } },
                            { elementType: 'paragraph', content: 'Thoughts on design, development, and life', styles: { color: '#666', fontSize: '18px' } },
                        ],
                    },
                    // Articles
                    {
                        elementType: 'uk-section',
                        order: 1,
                        styles: { padding: '40px 0' },
                        children: [
                            {
                                elementType: 'uk-container',
                                attributes: { class: 'uk-container uk-container-small' },
                                children: [
                                    { elementType: 'uk-article', content: '<h2><a href="#">Getting Started with UIkit</a></h2><p class="uk-article-meta">Written by Admin on Jan 1, 2025</p><p>UIkit is a lightweight and modular front-end framework...</p>', styles: { marginBottom: '40px', paddingBottom: '40px', borderBottom: '1px solid #eee' } },
                                    { elementType: 'uk-article', content: '<h2><a href="#">Design Systems 101</a></h2><p class="uk-article-meta">Written by Admin on Dec 28, 2024</p><p>A design system is a collection of reusable components...</p>', styles: { marginBottom: '40px', paddingBottom: '40px', borderBottom: '1px solid #eee' } },
                                    { elementType: 'uk-article', content: '<h2><a href="#">The Future of Web Development</a></h2><p class="uk-article-meta">Written by Admin on Dec 25, 2024</p><p>Web development continues to evolve at a rapid pace...</p>', styles: { marginBottom: '40px' } },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },

    'dashboard': {
        name: 'Dashboard',
        description: 'Admin dashboard layout',
        thumbnail: 'https://via.placeholder.com/400x300/111111/564AEB?text=Dashboard',
        pages: [
            {
                name: 'Dashboard',
                slug: 'index',
                elements: [
                    // Sidebar + Main
                    {
                        elementType: 'uk-grid',
                        order: 0,
                        styles: { minHeight: '100vh' },
                        attributes: { class: 'uk-grid-collapse', 'uk-grid': '' },
                        children: [
                            // Sidebar
                            {
                                elementType: 'container',
                                styles: { width: '250px', backgroundColor: '#111', color: '#fff', padding: '24px' },
                                children: [
                                    { elementType: 'heading', content: 'Dashboard', styles: { color: TECH_SPACE_THEME.primaryColor, fontSize: '24px', marginBottom: '32px' } },
                                    { elementType: 'uk-nav', content: '<li class="uk-active"><a href="#">Overview</a></li><li><a href="#">Analytics</a></li><li><a href="#">Reports</a></li><li><a href="#">Settings</a></li>', styles: {} },
                                ],
                            },
                            // Main Content
                            {
                                elementType: 'container',
                                styles: { flex: '1', padding: '32px', backgroundColor: '#f8f8f8' },
                                children: [
                                    { elementType: 'heading', content: 'Overview', styles: { fontSize: '32px', marginBottom: '24px' } },
                                    {
                                        elementType: 'uk-grid',
                                        attributes: { class: 'uk-child-width-1-4@m', 'uk-grid': '' },
                                        children: [
                                            { elementType: 'uk-card', content: '<p>Total Users</p><h3 style="font-size:36px">12,345</h3>', styles: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px' } },
                                            { elementType: 'uk-card', content: '<p>Revenue</p><h3 style="font-size:36px">$54,321</h3>', styles: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px' } },
                                            { elementType: 'uk-card', content: '<p>Orders</p><h3 style="font-size:36px">1,234</h3>', styles: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px' } },
                                            { elementType: 'uk-card', content: '<p>Growth</p><h3 style="font-size:36px;color:#42C65C">+24%</h3>', styles: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px' } },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
};

export type TemplateId = keyof typeof STARTER_TEMPLATES;
