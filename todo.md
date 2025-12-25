# OpenFlow Builder - Project TODO

## Database & Schema
- [x] Design projects table for storing website projects
- [x] Design pages table for storing individual pages within projects
- [x] Design elements table for storing canvas elements and their properties
- [x] Design templates table for user-created reusable templates
- [x] Design components table for user-created reusable components
- [x] Design assets table for uploaded images, fonts, and files
- [x] Design ai_conversations table for storing multi-step AI chat history
- [x] Design ai_provider_configs table for storing user AI provider settings
- [x] Push database schema migrations

## Core Architecture
- [x] Set up tRPC routers for projects, pages, elements, templates, components, assets
- [x] Create database query helpers for all entities
- [x] Implement AI provider abstraction layer supporting Gemini, Grok, OpenRouter, Ollama-cloud
- [x] Create unified AI generation service with provider switching
- [x] Set up S3 storage integration for asset uploads
- [x] Implement voice transcription integration for voice commands

## Visual Canvas Editor
- [ ] Build canvas workspace component with zoom and pan controls
- [ ] Implement drag-and-drop system for elements from library to canvas
- [ ] Create element selection and highlighting system
- [ ] Build element positioning and resizing handles
- [ ] Implement nested element support (containers with children)
- [ ] Add grid and alignment guides for precise positioning
- [ ] Create undo/redo system for canvas operations
- [ ] Implement canvas state management with history tracking

## Element Library
- [ ] Create element library sidebar with categorized components
- [ ] Implement intelligent library detection when pasting HTML (shadcn/ui, Tailwind UI, Bootstrap, Material UI, etc.)
- [ ] Build library import dialog with preview of detected components
- [ ] Create library parser for extracting component definitions from pasted code
- [ ] Implement full library import with all components and dependencies
- [ ] Store imported libraries in user's component library for reuse
- [ ] Implement container/div element with layout options
- [ ] Implement text element with rich text editing
- [ ] Implement image element with upload and URL options
- [ ] Implement button element with customizable styles
- [ ] Implement form elements (input, textarea, select, checkbox, radio)
- [ ] Implement grid/flexbox layout components
- [ ] Implement heading elements (h1-h6)
- [ ] Implement link/anchor element
- [ ] Implement video/iframe embed element

## Property Editing Panel
- [ ] Build property panel that shows selected element properties
- [ ] Implement style editor (colors, fonts, spacing, borders, shadows)
- [ ] Implement layout editor (position, size, display, flexbox/grid)
- [ ] Implement content editor for text and media elements
- [ ] Implement responsive breakpoint editor
- [ ] Add CSS class and ID management
- [ ] Add custom CSS input for advanced users

## AI Generation System
- [x] Build AI provider selection interface with API key configuration
- [ ] Implement AI-driven builder operations (AI operates the builder interface)
- [ ] Create AI actions system for element creation, modification, deletion
- [ ] Build AI canvas manipulation (select, drag, resize elements)
- [ ] Implement AI style editing (colors, fonts, spacing, layout)
- [ ] Add real-time AI operation visualization on canvas
- [ ] Create AI chat interface for multi-step conversations with streaming responses
- [ ] Add step-by-step AI visualization (thinking, tool execution, actions)
- [ ] Implement conversation history storage and retrieval
- [ ] Build task history panel to track all AI generation sessions
- [ ] Build AI component suggestion system based on user intent
- [ ] Implement AI layout recommendation engine
- [ ] Create AI prompt templates for common website types
- [ ] Implement streaming responses for real-time AI feedback with SSE

## Project Management
- [ ] Build project dashboard showing all user projects
- [ ] Implement create new project workflow
- [ ] Implement open existing project functionality
- [ ] Implement duplicate project feature
- [ ] Implement delete project with confirmation
- [ ] Build page management within projects (add, delete, rename pages)
- [ ] Implement project settings (name, description, metadata)
- [ ] Add project thumbnail generation from canvas preview

## Asset Management
- [ ] Build asset library interface showing uploaded files
- [ ] Implement file upload with drag-and-drop support
- [ ] Add image optimization and thumbnail generation
- [ ] Implement asset organization with folders/tags
- [ ] Add asset search and filtering
- [ ] Implement asset deletion and management
- [ ] Add font file upload and management
- [ ] Create asset picker component for element properties

## Template & Component System
- [ ] Build template library showing saved templates
- [ ] Implement save current page as template
- [ ] Implement load template into new project
- [ ] Build component library for reusable elements
- [ ] Implement save selection as reusable component
- [ ] Implement component insertion into canvas
- [ ] Add template and component preview thumbnails

## Export Functionality
- [ ] Implement HTML export with inline styles
- [ ] Implement CSS export as separate stylesheet
- [ ] Add JavaScript export for interactive elements
- [ ] Create ZIP file generation for complete website download
- [ ] Implement export settings (minification, optimization)
- [ ] Add export preview before download

## Responsive Design
- [ ] Build device preview mode switcher (desktop, tablet, mobile)
- [ ] Implement responsive breakpoint system
- [ ] Add breakpoint-specific style overrides
- [ ] Create responsive preview frame with accurate dimensions
- [ ] Implement responsive layout warnings and suggestions

## Voice Recognition
- [ ] Integrate voice transcription service
- [ ] Build voice command interface with microphone button
- [ ] Implement voice-to-text for AI prompts
- [ ] Add voice commands for canvas operations (add element, delete, move)
- [ ] Create voice command help and documentation
- [ ] Add voice feedback for command confirmation

## UI/UX Polish
- [ ] Design clean, functional editor layout with sidebars
- [ ] Implement keyboard shortcuts for common operations
- [ ] Add loading states for AI generation and file operations
- [ ] Create error handling and user feedback (toasts, alerts)
- [ ] Add tooltips and help text throughout interface
- [ ] Implement dark mode support for editor
- [ ] Add onboarding tutorial for first-time users

## Testing & Deployment
- [ ] Write vitest tests for tRPC procedures
- [ ] Test AI provider integrations
- [ ] Test file upload and asset management
- [ ] Test export functionality with sample projects
- [ ] Test voice recognition features
- [ ] Test responsive preview modes
- [ ] Create project checkpoint for deployment


## Critical Bug Fixes
- [x] Fix drag-and-drop not working on canvas
- [x] Fix chat scroll not working in AI Assistant
- [ ] Fix element selection and highlighting on canvas
- [ ] Fix property panel updates not reflecting on canvas

## API Key Configuration
- [x] Create API keys settings page accessible from main navigation
- [x] Add form for Gemini API key configuration
- [x] Add form for Grok API key configuration
- [x] Add form for OpenRouter API key configuration
- [x] Add form for Ollama-cloud API key configuration
- [x] Store API keys securely in database per user
- [ ] Validate API keys before saving
- [x] Show API key status (configured/not configured) in UI

## YooTheme Library Integration
- [ ] Fetch and parse YooTheme style library
- [ ] Fetch and parse YooTheme layout library
- [ ] Fetch and parse YooTheme element library
- [ ] Create UI for browsing YooTheme components
- [ ] Implement YooTheme component import to canvas
- [ ] Add YooTheme component search and filtering
- [ ] Cache YooTheme components locally for performance

## Complete AI-to-Builder Integration
- [ ] Build AI action system for element creation (createElement action)
- [ ] Build AI action system for element modification (updateElement action)
- [ ] Build AI action system for element deletion (deleteElement action)
- [ ] Build AI action system for element selection (selectElement action)
- [ ] Build AI action system for style changes (updateStyle action)
- [ ] Build AI action system for content changes (updateContent action)
- [ ] Build AI action system for layout changes (updateLayout action)
- [ ] Implement AI function calling to execute builder actions
- [ ] Create AI context with current page state and selected elements
- [ ] Implement real-time canvas updates when AI executes actions
- [ ] Add visual feedback showing what AI is doing on canvas
- [ ] Implement AI understanding of element hierarchy and relationships
- [ ] Add AI ability to select elements by description ("the blue button", "the heading")
- [ ] Implement AI multi-step operations (create container, add children, style all)
- [ ] Add AI ability to modify individual characters/words in text elements
- [ ] Implement AI undo/redo for all operations
- [ ] Add AI conversation memory to maintain context across messages
- [ ] Implement AI error handling and recovery
- [ ] Add AI suggestions based on current page state


## Premium UI Redesign
- [x] Change theme from dark to light with clean white backgrounds
- [x] Update color palette to sophisticated, muted tones (grays, soft blues)
- [x] Redesign landing page with elegant, spacious layout
- [x] Redesign dashboard with premium professional feel
- [ ] Redesign builder interface with clean, minimal aesthetic
- [x] Update typography to refined, professional fonts
- [x] Replace heavy borders with subtle shadows
- [x] Add generous whitespace and breathing room
- [x] Update all buttons and inputs to premium style
- [x] Ensure consistent professional design language across all pages


## AI-to-Builder Integration (Priority)
- [x] Update AIAssistant component to use aiBuilder.chat endpoint
- [x] Implement real-time element creation from AI responses
- [ ] Add element selection and highlighting when AI modifies elements
- [x] Implement style updates from AI commands
- [x] Add content editing from AI commands
- [x] Implement element deletion from AI commands
- [x] Add visual feedback when AI is operating the builder
- [ ] Test AI can change single character colors
- [ ] Test AI can build complete pages from description

## Builder Interface Premium Redesign
- [x] Redesign Builder page with premium aesthetic
- [ ] Redesign CanvasEditor with clean, minimal style
- [x] Redesign ElementLibrary with refined icons and layout
- [x] Redesign PropertyPanel with elegant controls
- [x] Redesign PagesPanel with premium styling
- [x] Redesign AIAssistant panel with clean chat interface
- [x] Update all builder icons to refined style
- [ ] Add subtle animations and transitions

## Voice Command System
- [x] Integrate Web Speech API for voice recognition
- [x] Add microphone button to AI Assistant
- [x] Implement voice-to-text transcription
- [x] Add visual feedback during voice recording
- [ ] Implement continuous listening mode
- [x] Add voice command shortcuts (e.g., "add button", "change color")
- [ ] Test hands-free building workflow


## Critical Bug Fixes (New)
- [ ] Fix React Hooks error in CanvasEditor - "Rendered more hooks than during the previous render"
- [ ] Ensure all hooks are called unconditionally at the top level of the component
- [ ] Fix hook order consistency between renders
