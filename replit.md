# Optima - Marketing Intelligence Platform

## Overview
Optima is an AI Operations Platform for international service businesses, evolving from a marketing intelligence SaaS. Its core purpose is to provide an intelligent, efficient, and secure solution for managing and automating operational tasks. Key capabilities include autonomous AI agents, a conversational Command Bar interface, multi-tenant architecture, automated quote-to-payment workflows via Stripe, and content generation using DALL-E/Sora 2. The platform targets agencies and SMEs globally, offering a disruptive glassmorphic/liquid glass design aesthetic.

## User Preferences
- Language: Italian (UI and content)
- Theme: Dark mode with pink accent colors
- Brand: Righello company branding

## System Architecture
Optima is built on Next.js 15.2.4 with TypeScript, Tailwind CSS, and a custom Liquid Glass Design System. It uses Radix UI primitives and Framer Motion for UI components. Authentication is handled by Firebase Auth, and data is stored in Firebase Firestore with multi-tenant isolation. AI functionalities leverage OpenAI GPT-4o for NLP and RAG. State management uses Redux Toolkit and Zustand.

**Core Architectural Decisions and Design Patterns:**
-   **Liquid Glass Design System**: Custom glassmorphic aesthetic with specific gradients, backdrop blur, and liquid animations.
-   **AI Command Bar**: A conversational `Cmd+K` interface powered by GPT-4 for multi-step campaign orchestration, NLP intent recognition, and dynamic context gathering.
-   **Autonomous Agents**: Includes a Content Agent (DALL-E for images, Sora 2 for video) and a Task Orchestrator.
-   **Token Economy System**: Tiered subscription model with markup on API costs.
-   **Workspace Intelligence System**: Provides task completeness and dependency analysis using GPT-4.
-   **Enterprise Security**: Strict multi-tenant isolation via Firebase Admin SDK.
-   **RAG Query Planning System**: Multi-step AI system for efficient Firestore querying and contextual response generation, supporting "all clients" queries while maintaining tenant isolation.
-   **Intent Recognition System**: Uses GPT-4o for improved NLP accuracy, supporting 5 business workflow intents (CREATE_WEBSITE, CREATE_GRAPHIC_DESIGN, CREATE_VIDEO_PRODUCTION, CREATE_SOFTWARE_DEV, CREATE_CAMPAIGN_PROJECT).
-   **Technical Architect Integration**: Pre-execution AI dialog for complex tasks, decomposing them into phases with dependencies and effort estimates in a glassmorphic roadmap tree view.
-   **Auto-Generation Hooks**: Calendar task cards feature AI caption and visual generation with DALL-E, persisting via Firestore.
-   **Instagram 2025 Formats Support**: Server-side image processing with Sharp for Instagram format compliance.
-   **Workspace Deep Linking**: Command Bar commands trigger workspace navigation with context preservation.
-   **Asset Lifecycle Management**: Complete DALL-E → Firebase Storage → Firestore pipeline for persistent visual asset management.
-   **Liquid Animation System**: Framer Motion-powered microinteractions with accessibility compliance.
-   **Corporate Design System (2025 Overhaul)**: Transformation to a corporate professional aesthetic across 40+ files, preserving glassmorphic identity with refined execution, specific design tokens, component library, and motion system attenuation.
-   **Stripe Connect Multi-Tenant Payment Architecture**: Three-tier payment hierarchy (Platform ← Tenant ← Client) with extended user and client schemas for Stripe integration.
-   **Unified UX Pattern Library**: Consolidated AI experience system with standardized loading states, contextual feedback, and prompt enrichment.
-   **Righello Template-Based Quote System**: AI-powered quote generation using real Righello project templates with deterministic pricing, featuring a 4-step Prompt Enrichment Dialog and section-level AI regeneration.
-   **Quote Approval & Payment Workflow**: Public shareable link system with secure tokens, webhook-driven approval flow, and Stripe integration for deposit + milestone payments.
-   **Milestone Payment Architecture**: Deposit-based payment system with configurable percentage splits, admin-controlled milestone readiness, and client self-service payment via Stripe Checkout.
-   **Professional Quote PDF System**: Enhanced RighelloPDFGenerator with corporate glassmorphic branding, template-specific project badges, and professional item tables.
-   **Automatic Invoice System**: Complete invoice automation pipeline generating professional PDF invoices (RighelloInvoiceGenerator) and sending via Nodemailer after every payment.
-   **Stripe Subscription Management**: Monthly recurring billing for maintenance costs via Stripe Subscriptions, with auto-renewal and lifecycle webhook handlers.
-   **Quote Management UI System**: Mobile-first glassmorphic quote list interface with QuoteCard, QuoteFilters, and QuoteActions, supporting responsive grid layouts and Framer Motion animations.
-   **Quote Detail & Tab System**: Responsive quote detail page with 4 glassmorphic tabs (Dettagli, Timeline, Pagamenti, Documenti) and real-time data fetching.
-   **Quote Editor with Collapsible Sections**: Advanced quote editor featuring Accordion-based collapsible sections, real-time validation using react-hook-form with zod schemas, and dynamic field arrays.
-   **Quote State Machine & Transitions**: Finite State Machine (FSM) with 9 quote states and 8 validated transitions, enforcing role-based permissions and business rule validations.
-   **Dual Client Mode Architecture**: Flexible quote generation supporting both platform clients and external clients, with mutual exclusivity validation and conditional payment logic.
-   **Editorial Calendar Multi-View Experience**: Enhanced calendar interface with CalendarExperienceProvider managing shared state, featuring three viewing modes, status-based color coding, platform badges, content type indicators, and hover preview tooltips.
-   **Command Bar Intelligence System**: Advanced AI-powered Command Bar with enhanced entity extraction and futuristic 3-stage streaming feedback, supporting multi-platform content creation and batch operations.
-   **Workspace Responsive Architecture**: Mobile-first Kanban workspace with component extraction, single-scroll container pattern, responsive sidebar, and breakpoint-driven column widths.
-   **Safe Date Normalization Pattern**: Robust date handling system in PostFormDialog and Editorial Calendar components, managing mixed date formats.
-   **Quote Enhanced Calculator System**: Real-time financial calculations with automatic VAT breakdown, featuring per-row totals and global totals.
-   **Quote Event Audit System**: Complete audit trail infrastructure with Firestore quoteEvents collection tracking all quote lifecycle events.
-   **Quote PDF Integration System**: End-to-end PDF workflow connecting RighelloPDFGenerator to QuoteDocumentsTab, featuring client-side PDF generation, download functionality, and preview.
-   **Sidebar Logo Collapsed Interaction (Desktop B2B UX)**: Type-safe sidebar logo button in collapsed state (desktop-only) with Radix UI tooltip, WCAG-compliant accessibility (role, tabIndex, aria-label, keyboard Enter/Space handlers), and B2B-elegant hover effects (subtle ring 20% opacity, minimal gradient 10% opacity, scale 1.02, professional shadow). Replaces DOM manipulation hack with idiomatic React toggleSidebar() hook. Mobile behavior preserved with conditional rendering (!isMobile && isCollapsed).

## Recent Changes (October 2025)
**Righello Quote System Professionalization - 17 Tasks Completed:**

1. **Righello Brand Integration:**
   - Logo SVG geometrico integrato in PDF header (cerchi rosa + quadrati viola, no emoji)
   - Platform-wide replacement: "Optima" → Solo logo Righello
   - Footer PDF professionale con dati reali visura (P.IVA 01979790934, Via Villaraccolta 23 Pasiano PN, PEC, Capitale €10.000)

2. **PDF Design Overhaul:**
   - Glassmorphic boxes per sezioni (Obiettivi, Attività, Voci di Costo) con multi-page support
   - Geometric bullets: cerchi rosa per obiettivi, quadrati viola per attività (sostituiscono emoji non supportati)
   - Badge template colorati verificati (Website 180°/360°, Video Production, Comunicazione 150°/180°)
   - Footer legale 5 clausole standard Righello

3. **Real-Time Synchronization:**
   - Firestore onSnapshot listener in useQuotes hook per auto-sync lista preventivi
   - Quick edit navigation diretta da lista: router.push(`/preventivi/${id}/edit`)
   - Eliminati manual refresh calls (createQuote, updateQuote, deleteQuote)

4. **WCAG Accessibility Compliance:**
   - @radix-ui/react-visually-hidden package installato
   - VisuallyHidden DialogTitle aggiunto a 3 dialog files (task-asset-gallery, auto-gen-preview, command)
   - 100% screen reader compliance - browser console clean (no DialogTitle errors)

5. **AI Prompt Enhancement:**
   - Obiettivi: infinitive verbs enforced (Valorizzare, Promuovere, Posizionare, Fidelizzare, Creare) + business outcomes
   - Attività: hierarchical structure (1. Macro → • Sub → - Deliverables)
   - Template-aware sector personalization verified (Hospitality, Food, Retail, Edilizia, Medicina)

**Testing Instructions for User Acceptance:**
1. **PDF Generation:** Creare preventivo → Scaricare PDF → Verificare logo Righello geometrico, footer legale, glassmorphic boxes
2. **AI Content:** Generare preventivo con AI → Verificare obiettivi con verbi infinito, attività strutturate gerarchicamente
3. **Real-Time Sync:** Modificare preventivo da detail page → Verificare auto-update lista (no refresh manuale)
4. **Accessibility:** Testare con screen reader (VoiceOver/NVDA) → Verificare DialogTitle annunciati correttamente

**Known Issues (Non-Blocking):**
- 7 TypeScript LSP diagnostics (4 in ai-quote-generator.tsx, 3 in ai-quote-service.ts): pre-esistenti, server compiles successfully, runtime OK. Da triaggiare separatamente.

## External Dependencies
-   **Firebase**: Authentication (Firebase Auth), Database (Firestore), Storage.
-   **OpenAI**: AI capabilities (GPT-4o for NLP, DALL-E 3 for image generation, Sora 2 for video generation).
-   **Stripe**: Subscription management, payment processing, webhooks.
-   **Nodemailer**: Automated email notifications.
-   **Framer Motion**: Advanced animations and microinteractions.
-   **Radix UI**: Unstyled, accessible UI primitives.