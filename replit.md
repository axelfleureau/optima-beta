# Optima - Marketing Intelligence Platform

## Overview
Optima is an AI Operations Platform designed for international service businesses, evolving from a marketing intelligence SaaS. It provides an intelligent, efficient, and secure solution for managing and automating operational tasks. Key features include autonomous AI agents, a conversational Command Bar interface, multi-tenant architecture, automated quote-to-payment workflows via Stripe, and content generation using DALL-E/Sora 2. The platform targets agencies and SMEs globally, offering a disruptive glassmorphic/liquid glass design aesthetic.

## User Preferences
- Language: Italian (UI and content)
- Theme: Dark mode with pink accent colors
- Brand: Righello company branding

## System Architecture
Optima is built on Next.js 15.2.4 with TypeScript, Tailwind CSS, and a custom Liquid Glass Design System. It uses Radix UI primitives and Framer Motion for UI components. Authentication is handled by Firebase Auth with Google integration, and data is stored in Firebase Firestore, ensuring multi-tenant isolation. AI functionalities leverage OpenAI GPT-4o with `ai-sdk` for NLP intent recognition and a RAG system. State management is handled with Redux Toolkit and Zustand.

**Key Architectural Decisions:**
-   **Liquid Glass Design System**: Custom glassmorphic aesthetic with specific gradients, backdrop blur, and liquid animations, designed for a modern look.
-   **AI Command Bar**: A conversational `Cmd+K` interface powered by GPT-4 for multi-step campaign orchestration, NLP intent recognition, and dynamic context gathering, featuring an Arke-inspired glassmorphic aesthetic.
-   **Autonomous Agents**: Includes a Content Agent (DALL-E for images, Sora 2 placeholder for video) and a Task Orchestrator for automated content creation and workflow management.
-   **Token Economy System**: Implements a tiered subscription model with a markup on API costs for cost transparency.
-   **Workspace Intelligence System**: Provides task completeness and dependency analysis using GPT-4 for actionable insights.
-   **Enterprise Security**: Strict multi-tenant isolation via Firebase Admin SDK, preventing cross-tenant data leaks.
-   **RAG Query Planning System**: A multi-step AI system for efficient Firestore querying and contextual response generation, supporting "all clients" queries while maintaining tenant isolation.
-   **Intent Recognition System**: Uses GPT-4o for improved NLP accuracy, supporting confidence scoring, entity extraction, and missing parameter detection. Expanded to include 5 business workflow intents (CREATE_WEBSITE, CREATE_GRAPHIC_DESIGN, CREATE_VIDEO_PRODUCTION, CREATE_SOFTWARE_DEV, CREATE_CAMPAIGN_PROJECT) to automate business operations.
-   **Technical Architect Integration**: Pre-execution AI dialog for complex tasks, decomposing them into phases with dependencies and effort estimates, presented in a glassmorphic roadmap tree view.
-   **Auto-Generation Hooks**: Calendar task cards feature "Genera copy" (AI caption) and "Genera visual" (DALL-E) buttons with a preview dialog and persistence via Firestore.
-   **Instagram 2025 Formats Support**: Server-side image processing with the Sharp library for Instagram format compliance (Feed Grid 3:4, Feed Portrait 4:5, Reels/Stories 9:16) with automatic cropping/resizing.
-   **Workspace Deep Linking**: Command Bar commands trigger workspace navigation with context preservation, using URL params and Zustand state.
-   **Asset Lifecycle Management**: Complete DALL-E → Firebase Storage → Firestore pipeline for persistent visual asset management, including auto-resizing, tenant-scoped storage, and real-time UI updates.
-   **Liquid Animation System**: Framer Motion-powered microinteractions with accessibility compliance, using specific animations for GlassCard hover and LiquidButton.
-   **Corporate Design System**: Transformed from a playful to a professional aesthetic, preserving glassmorphic identity with attenuated motion, a corporate color palette (Righello brand colors), and refined component elegance.
-   **Stripe Connect Multi-Tenant Payment Architecture**: Implements a three-tier payment hierarchy (Platform ← Tenant ← Client) with extended user and client schemas for Stripe integration, handling tenant onboarding and status mirroring via webhooks.
-   **Unified UX Pattern Library**: Consolidated AI experience system with standardized loading states, contextual feedback, and prompt enrichment. Features `useAIActionState` for loading management, `useAIFeedback` for unified notifications, a Context Injection System, and an Intent Confirmation Flow for consistent AI interaction.

## External Dependencies
-   **Firebase**: Used for Authentication (Firebase Auth), Database (Firestore), and Storage (asset persistence).
-   **OpenAI**: Integrated for AI capabilities (GPT-4o for NLP, DALL-E 3 for image generation, Sora 2 as a placeholder for video generation).
-   **Stripe**: Utilized for subscription management, payment processing, and webhooks.
-   **Nodemailer**: For sending automated email notifications.
-   **Framer Motion**: For advanced animations and microinteractions.
-   **Radix UI**: Provides unstyled, accessible components used as primitives.