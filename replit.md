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
- **AI Command Bar**: A conversational `Cmd+K` interface powered by GPT-4 for multi-step campaign orchestration, NLP intent recognition, and dynamic context gathering.
- **Autonomous Agents**: Including a Content Agent (DALL-E for images, Sora 2 placeholder for video) and a Task Orchestrator, designed for automated content creation and workflow management.
- **Token Economy System**: Implements a tiered subscription model with a 3x markup on API costs, ensuring cost transparency and user consent for token usage.
- **Workspace Intelligence System**: Provides task completeness and dependency analysis using GPT-4, offering actionable insights and smart badge indicators.
- **Enterprise Security**: Strict multi-tenant isolation enforced via Firebase Admin SDK for server-side authentication, ensuring data integrity and preventing cross-tenant data leaks across all AI and core functionalities.
- **RAG Query Planning System**: A multi-step AI system designed for 90% token savings by intelligently planning Firestore queries, retrieving only relevant data, and then generating contextual responses.

## External Dependencies
- **Firebase**: Used for Authentication (Firebase Auth) and Database (Firestore).
- **OpenAI**: Integrated for AI capabilities (GPT-4 for NLP, DALL-E 3 for image generation, Sora 2 as a placeholder for video generation).
- **Stripe**: Utilized for subscription management, payment processing, and webhooks for lifecycle events.
- **Nodemailer**: For sending automated email notifications related to subscription lifecycle events.
- **Framer Motion**: For advanced animations and microinteractions.
- **Radix UI**: Provides unstyled, accessible components used as primitives for custom UI.