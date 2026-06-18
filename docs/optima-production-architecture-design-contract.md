# Optima Production Architecture and Design Contract

Date: 2026-06-18

This document consolidates the historical product, architecture and design constraints for Optima. It is the source of truth for future implementation work: if a feature conflicts with this contract, the implementation is wrong, even when the build passes.

## Product Definition

Optima is Righello's multi-tenant company operating system. It is not a generic task board, a demo AI chat or a catalog of integrations.

The system must connect:

- people, roles, customers, projects, tasks and deliverables;
- presence, workday reviews, time entries and daily reports;
- quotes, client knowledge, historical commercial data and public share links;
- agentic jobs, review rooms, artifacts, GitHub repositories and deployments;
- graph memory, know-how, external sources and MCP connectors;
- chat, command bar, Telegram and browser/VPS workflows through the same operational context.

Every page should answer one question quickly: "What can I do here, with which context, and what will happen next?"

## Operating Principles

- No fake data: if information is missing, Optima asks for it, marks it as missing, or creates a reviewable job.
- No decorative buttons: every primary action either mutates backend state, opens a concrete wizard, starts a reviewable job, or explains why it is disabled.
- No hidden automation: code changes, deploys, external sends and destructive changes require explicit review or owner-controlled approval.
- No context split: chat, command bar, Telegram, MCP and runner must resolve context from the same tenant-scoped graph and operational snapshot.
- No secrets in D1, graph nodes, job output, logs or docs. Store only `secret_ref`, subject, scopes, health and non-sensitive metadata.
- No role leakage: junior collaborators see their assigned work and permitted customers, not private direction tasks unless explicitly assigned.
- No API-key-first design: OAuth/installation flows are preferred where available; API keys are fallback and must be optional, scoped and auditable.

## Multi-Tenant Boundary

All operational records must be scoped by organization:

- clients, projects, tasks, time entries and reports;
- AI memories, conversations and graph memory;
- provider installations, MCP connectors and subagents;
- repository links, agent jobs, artifacts and review state;
- quote data, public share tokens and financial visibility policy.

Tenant isolation is a production requirement, not a later hardening step.

## User Roles

- Axel/direction/admin: can see all company operations, run agentic jobs, approve deploys and manage connectors.
- Direction: can review reports, manage presence and inspect operational workload.
- Team/junior: sees assigned tasks, permitted customers and simple daily reporting flows.
- Client surfaces: only curated deliverables, quote links, approvals and requests, never internal graph/debug data.

## Agentic System

Optima must behave as an agentic operating layer:

- agent jobs have clear lifecycle: queued, running, needs review, approved, rejected, failed, cancelled;
- runner heartbeat and stale state are visible and actionable;
- job output is reviewable with artifacts, timeline and revision requests;
- repository inference should come from graph context when possible, with manual override only when needed;
- approved code work can connect to GitHub and deploy only through owner policy;
- self-improvement jobs must create auditable patches, not silently rewrite production behavior.

Codex CLI with ChatGPT auth is an operator/runtime capability. It must use a dedicated profile such as `/root/.codex-chatgpt` or a wrapper such as `codex-chatgpt`; the API-key profile is not the default runtime for cost-sensitive workflows.

## MCP and OAuth

Provider and MCP setup must be wizard-driven:

- show what the connector can do;
- show auth method: OAuth, GitHub App, browser session, local install, service token or API key fallback;
- show required scopes and owner policy;
- open the real OAuth/installation page when supported;
- otherwise explain the concrete setup path and health check;
- save status, scope, subject, health and `secret_ref`, not tokens.

Browser MCP is a special case. It is not OAuth. It uses an isolated Chromium profile on the VPS through Tailscale for tools where API cost or API limits make browser operation preferable. The UI must not present this as a normal OAuth consent screen.

Nano Banana is treated as a Gemini capability, not as `nanobanana.ai`.

## Graph Memory

Graphify is the graph engine/pipeline pattern. Obsidian is the visual vault/exploration workspace. Optima remains the source of operational truth.

Graph rules:

- nodes and edges are tenant-scoped;
- node types, source types, edge types and tags are normalized;
- every node has source, confidence, summary and actionable connections;
- confidence values are `manual`, `extracted`, `inferred` or `ambiguous`;
- ambiguous relations never drive automatic business actions without review;
- the graph needs index views: hubs, orphan nodes, source groups, edge groups and quality score;
- manual insertion from form/chat must be available;
- external sources are imported as redacted indexes, not full dumps.

The global know-how folder is a graph source, but not a replacement for reviewed Optima records. Know-how should become searchable nodes connected to project, client, skill, source and workflow nodes.

## Obsidian

Obsidian is used for the native graph/vault experience. The web graph inside Optima is an operational preview, not a promise to recreate Obsidian pixel-for-pixel.

Correct behavior:

- Optima exports the vault from graph memory and know-how;
- desktop users can open the local vault in Obsidian;
- mobile users get an explanation if the vault cannot open on the device;
- Optima keeps an internal graph preview for quick inspection and actions;
- edits returning from Obsidian must be reviewed before becoming operational truth.

## Tasks and Workspace

Tasks are the daily operating unit. A good task has:

- title, owner, client or project, status, priority and due date when relevant;
- deliverable and attachment support;
- tags and source when imported from GitHub, Notion, chat or reports;
- role-aware visibility;
- audit trail for assignment and status changes.

Creating work must be easy from:

- workspace;
- client page;
- report page;
- command bar;
- AI Assistant;
- graph node;
- agent job output.

The system must prevent duplicates by searching existing tasks before importing or creating new ones.

## Presence and Reports

Presence is not just a calendar. It explains operational capacity.

Required behavior:

- day header click opens aggregate day dialog;
- person-day cell click opens contextual panel below the heatmap, not the aggregate dialog;
- the contextual panel supports correcting entry, exit and absence for that person-day;
- holidays and weekdays are explicit for non-owner employees;
- low activity, missing time, absence, holiday and operational work have distinct visual language;
- checkout can be undone;
- daily report submission is easy, reviewable and produces an ordered summary email for administration when submitted by non-direction staff.

No impossible time totals: imported GitHub work must be estimated and distributed across realistic workdays.

## Quotes and PDF

Quotes must be commercial documents, not AI-looking drafts.

Rules:

- budget max is a hard cap unless explicitly overridden;
- no mock client data in final PDF;
- if client email, VAT, address or legal data is missing, mark it as missing or ask for it;
- prices and totals must be consistent across card, editor, public link and PDF;
- ReportLab/studio generator is the final-print path for serious quotes;
- browser PDF can remain a quick draft only;
- PDF QA must catch overflow, empty pages and mostly blank internal pages;
- Righello brand kit is default; client palette is used only with high confidence.

## Command Bar and Chat

Command bar is the fast operator surface. AI Assistant is conversational and asynchronous. They must share context.

Command bar requirements:

- opens near the top of viewport and feels immediate;
- works on mobile without horizontal overflow or trapped scroll;
- primary input stays focused;
- suggestions are real supported workflows, not decorative examples;
- deterministic/local actions run without waiting for LLM when possible;
- AI fallback is used only when useful;
- long-running work becomes a reviewable agent job.

Chat requirements:

- submit button visible on mobile;
- empty AI output becomes explicit fallback;
- async replies are traceable;
- "save to graph" is guided and reviewed;
- Telegram uses the same memory and permission model.

## Design Rules

- Operational pages are dense, clear and action-oriented, not landing pages.
- Cards are for repeated items or dialogs, not nested decorative page sections.
- Buttons use familiar icons when possible and labels only where action clarity needs them.
- Mobile Safari must have no horizontal overflow, clipped text or blocked native scroll.
- Text must not rely on viewport-width font scaling.
- Color language must map to meaning: success, warning, absence, holiday, low activity, focus and sprint cannot be visually ambiguous.
- Long pages need progressive disclosure, tabs or sections with clear anchors.
- Every disabled or blocked action explains the next step.

## Production Gates

Before claiming production-ready:

- `npm run build` passes;
- `npm run check:production` passes;
- production `/api/health` reports `coreReady=true` and `agenticReady=true`;
- Cloudflare deploy is verified on the official domain;
- D1 migrations are applied remotely when needed;
- mobile primary flows are manually checked;
- GitHub has the latest commit pushed;
- remaining gaps are documented with owner and next action.

This contract does not mean every ambitious feature is complete today. It defines what "correct" means so Optima can move toward production readiness without accumulating misleading UI or incoherent architecture.
