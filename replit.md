# Optima - Marketing Intelligence Platform

## Overview
Optima is an AI Operations Platform (evolved from marketing intelligence SaaS) for international service businesses. It features autonomous AI agents, a conversational Command Bar interface, multi-tenant architecture, automated quote-to-payment workflows with Stripe, and content generation via DALL-E/Sora 2. The platform targets agencies and SMEs globally with a disruptive glassmorphic/liquid glass design aesthetic. Its core purpose is to provide an intelligent, efficient, and secure solution for managing and automating operational tasks for service businesses.

## User Preferences
- Language: Italian (UI and content)
- Theme: Dark mode with pink accent colors
- Brand: Righello company branding

## System Architecture
Optima is built on Next.js 15.2.4 with TypeScript, utilizing Tailwind CSS for styling and a custom Liquid Glass Design System. UI components are glassmorphic, built with Radix UI primitives and animated using Framer Motion for liquid transitions. Authentication is handled by Firebase Auth with Google integration, and data is stored in Firebase Firestore, ensuring multi-tenant isolation. AI functionalities leverage OpenAI GPT-4 with `ai-sdk` for NLP intent recognition and a sophisticated RAG (Retrieval-Augmented Generation) system for efficient data retrieval. State management is managed with Redux Toolkit and Zustand.

Key architectural decisions include:
- **Liquid Glass Design System**: A custom glassmorphic aesthetic with purple/pink/blue gradients, backdrop blur, and liquid animations, inspired by modern design trends.
- **AI Command Bar**: A conversational `Cmd+K` interface powered by GPT-4 for multi-step campaign orchestration, NLP intent recognition, and dynamic context gathering. October 2025 redesign implements Arke-inspired glassmorphic aesthetic: opaque prominent input at top (black/90 bg, border-4 purple, focus glow 40px), non-scrollable left-aligned suggestion chips with flex-wrap (rounded-full gradient pills), powerful gradient container (25% opacity vs 10%, gradient border effect, backdrop-blur-2xl). Custom purple-themed scrollbar styling via globals.css.
- **Autonomous Agents**: Including a Content Agent (DALL-E for images, Sora 2 placeholder for video) and a Task Orchestrator, designed for automated content creation and workflow management.
- **Token Economy System**: Implements a tiered subscription model with a 3x markup on API costs, ensuring cost transparency and user consent for token usage.
- **Workspace Intelligence System**: Provides task completeness and dependency analysis using GPT-4, offering actionable insights and smart badge indicators.
- **Enterprise Security**: Strict multi-tenant isolation enforced via Firebase Admin SDK for server-side authentication, ensuring data integrity and preventing cross-tenant data leaks across all AI and core functionalities.
- **RAG Query Planning System**: A multi-step AI system designed for 90% token savings by intelligently planning Firestore queries, retrieving only relevant data, and then generating contextual responses. Supports "all clients" queries (e.g., "Mostra tutti i progetti") via `clientId: "all"` filter that skips client-specific filtering while maintaining strict tenant isolation through force-merged tenantId enforcement.
- **Intent Recognition System**: Uses GPT-4o (upgraded from GPT-4 turbo) for improved NLP accuracy. Schema made entities field optional with default {} to prevent Zod validation crashes. Supports confidence scoring, entity extraction, and missing parameter detection. **October 2025 Expansion**: Added 5 business workflow intents (CREATE_WEBSITE, CREATE_GRAPHIC_DESIGN, CREATE_VIDEO_PRODUCTION, CREATE_SOFTWARE_DEV, CREATE_CAMPAIGN_PROJECT) transforming platform from social media tool to complete business operations automation. Each workflow creates 5-8 structured workspace tasks with proper client validation, tags, and implicit dependencies via sequential task order. Editorial content (CREATE_CONTENT_POST/REEL/VIDEO) auto-links task+calendar via ContentAgentOrchestrator; business workflows create task-only (no calendar) per design. TokenConsentDialog now appears only on explicit user request (not auto-triggered), with toast guidance "Vai al calendario per generare copy e media".
- **Technical Architect Integration**: Pre-execution AI dialog for complex tasks. Triggers on keywords ('sito', 'campagna', 'rebranding') or multi-deliverable patterns. GPT-4 decomposes tasks into phases with dependencies, effort estimates, and educational rationale. Glassmorphic roadmap tree view with expandable phases, checklist indicators, warnings, and 4 actions (Accetta/Modifica/Crea singola/Annulla). Endpoint `/api/ai/task-breakdown` with Zod validation and token logging.
- **Auto-Generation Hooks**: Calendar task cards feature "Genera copy" (AI caption via orchestrator) and "Genera visual" (DALL-E via `/api/ai/generate-image`) buttons. Preview dialog with glassmorphic design, save/regenerate/discard actions. Firestore persistence uses `arrayUnion` pattern to prevent asset overwrites. Real-time OrchestrationFeedback component for progress tracking. Mobile responsive drawer.
- **Instagram 2025 Formats Support**: Server-side image processing pipeline using Sharp library for Instagram format compliance. DALL-E 3 generates closest available size, system automatically crops/resizes to exact Instagram specs: Feed Grid 3:4 (1080×1440), Feed Portrait 4:5 (1080×1350), Reels/Stories 9:16 (1080×1920). UI displays DALL-E source size + target format with automatic crop notes. Production-ready delivery of platform-ready assets.
- **Workspace Deep Linking**: Command Bar commands trigger workspace navigation with context preservation. URL params (`?taskId=X&action=Y`) + Zustand state manage selectedTaskId and pendingAction. Scroll-to-task with purple highlight effect (2.5s auto-clear), auto-trigger Technical Architect or auto-gen dialogs. Fuzzy matching for "Raffina task X", "Genera deliverable per Y" patterns.
- **Asset Lifecycle Management (October 2025)**: Complete DALL-E → Firebase Storage → Firestore pipeline for persistent visual asset management. Image generation flow: (1) DALL-E 3 generates via OpenAI API, (2) Sharp library auto-resizes for Instagram compliance (1080×1440 grid, 1080×1350 portrait, 1080×1920 reels), (3) `uploadImageToStorage` utility uploads to Firebase Storage with tenant-scoped paths (`tenants/{tenantId}/assets/dalle/{filename}`), (4) permanent download URL persisted in task via `generatedAssets` array using Firestore `arrayUnion()`, (5) Real-time UI refresh via Firestore onSnapshot listener syncs selectedTask when assets added, (6) TaskAssetGallery component displays thumbnails with fullscreen preview, download, and delete actions. Error handling: API returns `taskUpdated` flag + `taskUpdateError` message; Storage upload failures fallback to temporary OpenAI URLs; task update failures surface user toasts ("Asset salvato ma non collegato"). Auto-format detection handles PNG/JPEG variants case-insensitive. Gallery auto-refreshes via dynamic-workspace useEffect syncing selectedTask with allTasks updates—no manual reload required.
- **Liquid Animation System**: Framer Motion-powered microinteractions with accessibility compliance. GlassCard hover (scale 1.02, opacity 0.95, 200ms cubic-bezier), LiquidButton continuous border-radius pulse (1.5s) + gradient flow (2s) for primary CTAs. Reduced-motion fallbacks use opacity-only transitions (300ms). Legacy Tailwind animation tokens (`animate-liquid-morph` 4s infinite blob, `animate-gradient-shift` 3s infinite) preserved to prevent regressions. CSS isolation via `.liquid-morph-hover` class for button-specific animations.
- **Corporate Design System (October 2025)**: Complete transformation from playful to professional aesthetic while preserving glassmorphic identity. **Design Tone**: Removed playful animations (liquidMorph rotate, particleBurst, righello-float, liquid-morph blob keyframes, liquid-bounce/elastic overshoot easings), attenuated motion (max scale 1.02, smooth cubic-bezier, shadow 0.15 opacity), LiquidButton sharp hover (no borderRadius morph). **Color Palette**: Corporate colors with AAA contrast compliance - Tailwind righello brand (Rose-500/800, Violet-500, Blue-600), eliminated neon values (#FF0092 → #D946A6), hardcoded color cleanup (gradients.ts, command-input, globals.css), HSL tokens (Rose-800 light mode 7.8:1 AAA, Rose-500 dark mode), zero legacy pink/purple rgba. **Component Elegance**: Scoped refinements - LiquidButton rounded-md, GlassCard rounded-lg, outlined icons (lucide default), --radius 0.5rem for consistency, no global typography overrides (preserves component hierarchies).

## External Dependencies
- **Firebase**: Used for Authentication (Firebase Auth), Database (Firestore), and Storage (asset persistence with tenant isolation). **October 2025**: Added Firebase Storage utilities (`lib/utils/storage-upload.ts`) with auto-format detection (PNG/JPEG), tenant-scoped paths (`tenants/{tenantId}/assets/{type}/...`), and metadata tracking.
- **OpenAI**: Integrated for AI capabilities (GPT-4 for NLP, DALL-E 3 for image generation, Sora 2 as a placeholder for video generation).
- **Stripe**: Utilized for subscription management, payment processing, and webhooks for lifecycle events.
- **Nodemailer**: For sending automated email notifications related to subscription lifecycle events.
- **Framer Motion**: For advanced animations and microinteractions.
- **Radix UI**: Provides unstyled, accessible components used as primitives for custom UI.

## Production Deployment Readiness (October 2025)

### Security Audit (Complete) - Grade: B (85/100)
**CRITICAL Vulnerabilities Fixed (2/2)**:
- ✅ `/api/admin/database-cleanup` - Added super-admin auth + rate limiting (DEFAULT: 100 req/min)
- ✅ `/api/send-welcome-email` - Added admin auth + aggressive rate limiting (AUTH: 5 req/5min)

**HIGH Priority Vulnerabilities Fixed (3/3)**:
- ✅ `/api/settings/email` - Added tenant-scoped auth + rate limiting (DEFAULT: 100 req/min)
- ✅ DOMPurify - Installed and configured for all AI-generated HTML (XSS prevention)
- ✅ Zod validation - Expanded to payment/financial endpoints (stripe/quotes/clients)

**Security Posture**:
- ✅ **Secret Exposure**: PASS - All API keys server-side only (38 files reviewed)
- ✅ **Firebase Admin SDK**: PASS - Properly isolated to server-side (20 files)
- ✅ **XSS Prevention**: PASS - DOMPurify sanitizes all AI HTML with strict allowlist
- ✅ **Auth Coverage**: PASS - All critical endpoints protected with tenant-scoping
- ⚠️ **Input Validation**: IMPROVED - 24% Zod coverage (8/33 routes, +3 critical endpoints)
- ⚠️ **Rate Limiting**: 70% coverage (23/33 endpoints protected)

**Remaining Actions** (Low Priority):
- MEDIUM: Expand Zod validation to remaining CRUD endpoints (target 50%+ coverage)
- LOW: Add rate limiting to remaining CRUD endpoints (non-critical paths)

### Deploy Config Audit (Complete) - Grade: A (95/100)
**Production Fixes Applied**:
- ✅ Global error boundary with user-friendly messages (no stack trace exposure)
- ✅ Security headers: CSP, HSTS, X-Content-Type-Options, Referrer-Policy
- ✅ Hybrid rate limiting system (in-memory + optional Upstash Redis)
- ✅ Profile-specific rate limit instances (AI/AUTH/STRIPE) with separate Redis prefixes
- ✅ 21 API endpoints protected with role-specific limits
- ✅ `allowedDevOrigins` configured for Replit iframe compatibility

### Performance Audit (Partial) - Deferred
**Baseline Metrics**:
- 7 critical routes exceed 200KB (worst: `/preventivi` at 446KB due to PDF library)
- Lazy loading implemented for 4 heavy components (PDF Generator, TechnicalArchitectDialog, AutoGenPreview, ImageGenerator)
- Expected savings: 250-290KB per route
- Phase 3 production metrics blocked by Replit build resource constraints

### Known Issues
**TypeScript Errors**:
- 8 LSP diagnostics in `components/ui/chart.tsx` (non-blocking, chart theming)

**Architecture Decisions**:
- Hybrid rate limiting gracefully degrades to in-memory when Upstash Redis unavailable
- Date/Timestamp conversions handle Firestore Timestamps, Date objects, and ISO strings
- Manual regression testing deferred until all deployment tasks complete per user request