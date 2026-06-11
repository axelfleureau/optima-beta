# Optima Agentic Page Availability Audit

Date: 2026-06-11

Goal: make every primary Optima page usable as part of an agentic company operating system. The user should always understand what can be asked, created, reviewed, connected, imported or automated from the current page.

## Global Agentic Surfaces

- `AiPageGuide`: contextual page assistant with quick actions, route-aware copy and command-bar prompts.
- `CommandBar`: natural-language command entry point for creation, search, navigation and operational workflows.
- `AI Assistant`: conversational memory, graph memory commands and operational context lookup.
- `AI Ops / Agenti`: job queue, runner heartbeat, review room, graph memory, providers, MCP setup and sources.
- `Telegram channel`: async external assistant path, subject to tenant/member mapping.

## Page Coverage Matrix

| Page | Agentic status | Primary user action | Current channel |
| --- | --- | --- | --- |
| `/dashboard` | Covered | Analyze operational status and priorities | AiPageGuide, CommandBar |
| `/workspace` | Covered | Create, search, assign, refine and generate task deliverables | AiPageGuide, CommandBar, task dialogs |
| `/management` | Covered | Explain workload, capacity and business-control signals | AiPageGuide, CommandBar |
| `/presenze` | Covered | Analyze coverage, day/cell details and operational capacity | AiPageGuide, heatmap context, CommandBar |
| `/rapportini` | Covered | Prepare daily report from completed tasks and manual extras | AiPageGuide, importer flows |
| `/team` | Covered | Add members, check invites, reason about roles | AiPageGuide, CommandBar |
| `/preventivi` and `/preventivi/[id]` | Covered | Generate, review, send and improve proposals | AiPageGuide, quote AI generator, quote editor |
| `/calendario-team` | Covered | Create operational events and coordinate availability | AiPageGuide, CommandBar |
| `/calendario-editoriale` | Covered | Plan content and convert campaigns into editorial tasks | AiPageGuide, content tools |
| `/clienti` and `/clienti/[id]` | Covered | Inspect client state, create follow-up, open workspace | AiPageGuide, CommandBar |
| `/agenti` | Newly covered | Create/review agentic jobs, diagnose runner, sync graph | AiPageGuide, AI Ops UI |
| `/campagne` | Newly covered | Plan campaign, create content tasks, connect calendar | AiPageGuide, CommandBar |
| `/importa-task` | Newly covered | Import external activity without duplicates | AiPageGuide, task report importer |
| `/settings` and `/dashboard/settings/*` | Newly covered | Audit tenant/email/roles/integrations | AiPageGuide, CommandBar |
| `/super-admin/*` | Newly covered | Audit platform, token usage and cleanup risk | AiPageGuide, AI Ops handoff |
| `/client-workspace` | Newly covered | Produce safe client-facing summaries and requests | AiPageGuide, CommandBar |
| Auth pages | Not agentic by design | Login/register/reset only | N/A |
| Marketing/pricing pages | Not operational by design | Acquisition and pricing only | N/A |

## What Is Now Better

- The contextual assistant now covers every primary dashboard route instead of only the earlier subset.
- Client detail pages inherit the client guide via `allowSubpaths`.
- AI Ops has explicit language around runner heartbeat, reviewable jobs, graph memory, MCP/provider setup and sources.
- Import flows are framed around duplicate prevention and graph linkage.
- Settings and super-admin flows push risky changes into reviewable jobs instead of implying direct destructive action.
- Client workspace is framed as a safe external surface, not a raw internal workspace.

## Remaining Production-Readiness Gaps

- CommandBar intents still do not execute every domain action natively. Several quick actions currently prefill high-quality prompts rather than calling dedicated APIs.
- Presenze admin edits for past days should become explicit command intents after the UI flow is stable.
- Preventivi should expose more agentic actions inside quote detail: regenerate PDF layout, check budget, compare to historical quotes, create follow-up task.
- AI Ops provider/MCP setup needs verified health-check actions per connector, not only job templates.
- Graph memory should support stronger node actions: create relation, merge duplicate nodes, open source, convert node to task/project/client.
- Notion import should become a repeatable connector workflow with audit logs and import previews.

## Next Implementation Layer

1. Add route-aware command suggestions, not only page-guide prompts.
2. Add dedicated command intents for: `CREATE_QUOTE`, `SEND_QUOTE`, `CREATE_TIME_ENTRY`, `MARK_ABSENCE`, `CREATE_AGENT_JOB`, `SYNC_GRAPH`, `IMPORT_NOTION_QUOTES`.
3. Add per-page action cards in high-value pages where the floating assistant is not enough: preventivi, presenze, agenti, clienti, rapportini.
4. Store page action usage in audit logs so the operating system can learn which workflows are used.
5. Connect graph memory to page context: selected client, selected quote, selected task, selected day, selected runner/job.

