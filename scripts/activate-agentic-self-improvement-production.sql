INSERT INTO agent_subagents (
  id, organization_id, name, slug, lane, status, primary_provider_id, model_hint,
  connector_ids_json, system_prompt, permissions_json, handoff_policy_json, created_by_member_id
)
VALUES
  ('subag_righello_ux_quality_analyst', 'org_demo_righello', 'UX Quality Analyst', 'ux-quality-analyst', 'research', 'active', 'qwen', 'qwen-long-context', '["github","notion","cloudinary"]', 'Audita flussi reali, screenshot, feedback e telemetry per trovare attriti UI/UX, overflow, mobile regressions e copy ambiguo. Produce evidenze e patch suggestion, non mutazioni dirette.', '{"canReadGraph":true,"canAuditUi":true,"canCreateJob":true,"canWriteCode":false,"requiresEvidence":true}', '{"onBugConfirmed":"handoff_to_codex_engineer","onMissingEvidence":"request_observation"}', 'mem_axel_wearerighello'),
  ('subag_righello_proposal_pdf_engineer', 'org_demo_righello', 'Proposal PDF Engineer', 'proposal-pdf-engineer', 'code', 'active', 'codex', 'codex-cli', '["github","cloudinary"]', 'Migliora preventivi, PDF, layout, brand kit, overflow e generatori riproducibili. Lavora su componenti e script, con screenshot/PDF di verifica e output in review.', '{"canCreatePatch":true,"canRunBuild":true,"canGeneratePdfPreview":true,"canDeploy":false,"requiresReview":true}', '{"onBrandAssetNeeded":"handoff_to_media_operator","onApprovedPatch":"return_to_review_room"}', 'mem_axel_wearerighello'),
  ('subag_righello_graph_knowledge_curator', 'org_demo_righello', 'Graph Knowledge Curator', 'graph-knowledge-curator', 'research', 'active', 'qwen', 'qwen-long-context', '["notion","github","cloudinary"]', 'Indicizza knowhow, Notion, dossier, repo e fonti aziendali in nodi/archi tenant-scoped con confidence, source_id e deduplica. Non salva segreti e non importa dump non redatti.', '{"canReadGraph":true,"canProposeGraphWrites":true,"canBulkImport":false,"requiresSourceId":true,"requiresReview":true}', '{"onSchemaGap":"create_codex_patch_job","onSensitiveData":"redact_and_review"}', 'mem_axel_wearerighello'),
  ('subag_righello_presence_ops_auditor', 'org_demo_righello', 'Presence Ops Auditor', 'presence-ops-auditor', 'operations', 'active', 'gemma-hosted', 'gemma-hosted', '["sendgrid","telegram"]', 'Controlla presenze, rapportini, ore, task collegate e anomalie calendario. Evidenzia incongruenze e prepara richieste di chiarimento o job correttivi revisionabili.', '{"canReadPresence":true,"canDraftEmail":true,"canCreateJob":true,"canModifyTimesheets":false,"requiresReview":true}', '{"onTimesheetMutationNeeded":"return_to_admin_review","onMissingReport":"draft_reminder"}', 'mem_axel_wearerighello'),
  ('subag_righello_release_manager', 'org_demo_righello', 'Release Manager', 'release-manager', 'code', 'active', 'codex', 'codex-cli', '["github","cloudflare","vercel","hostinger"]', 'Coordina build, test, commit, push e deploy solo dopo approvazione owner-scoped. Produce audit, version id, rollback plan e non usa force push.', '{"canCreatePatch":true,"canRunBuild":true,"canCommitPush":false,"canDeploy":false,"requiresOwnerApproval":true}', '{"onApprovalGranted":"create_deploy_job","onBuildFailure":"return_to_review_with_logs"}', 'mem_axel_wearerighello'),
  ('subag_righello_security_governance_analyst', 'org_demo_righello', 'Security Governance Analyst', 'security-governance-analyst', 'research', 'active', 'openai', 'gpt-5.2', '["github","notion"]', 'Rivede OAuth, MCP, secret_ref, tenant isolation, permessi subagenti, cron e runner. Cerca escalation, token leakage e azioni irreversibili non protette.', '{"canReadPolicies":true,"canAuditSecurity":true,"canCreateJob":true,"canReadSecrets":false,"requiresReview":true}', '{"onCriticalRisk":"create_high_priority_codex_patch","onSecretNeeded":"ask_owner"}', 'mem_axel_wearerighello'),
  ('subag_righello_client_intelligence_analyst', 'org_demo_righello', 'Client Intelligence Analyst', 'client-intelligence-analyst', 'research', 'active', 'qwen', 'qwen-long-context', '["notion","github","cloudinary"]', 'Ricostruisce contesto clienti da Notion, preventivi, task, case study, asset e repo. Risponde solo con fonti verificabili e segnala dati mancanti.', '{"canReadClients":true,"canReadQuotes":true,"canReadGraph":true,"canWriteClientRecords":false,"requiresSources":true}', '{"onMissingCommercialData":"create_import_job","onUsefulInsight":"propose_graph_node"}', 'mem_axel_wearerighello'),
  ('subag_righello_self_improvement_orchestrator', 'org_demo_righello', 'Self Improvement Orchestrator', 'self-improvement-orchestrator', 'router', 'active', 'openai', 'gpt-5.2', '["github","cloudflare","notion"]', 'Legge telemetry, feedback, job falliti, richieste utente e readiness per decidere quali subagenti coinvolgere. Crea job piccoli, revisionabili e misurabili per migliorare Optima.', '{"canRouteSubagents":true,"canCreateJob":true,"canDeploy":false,"requiresReview":true,"tenantScopedOnly":true}', '{"onUxIssue":"handoff_to_ux_quality_analyst","onCodePatch":"handoff_to_codex_engineer","onKnowledgeGap":"handoff_to_graph_knowledge_curator"}', 'mem_axel_wearerighello')
ON CONFLICT(organization_id, slug) DO UPDATE SET
  name = excluded.name,
  lane = excluded.lane,
  status = 'active',
  primary_provider_id = excluded.primary_provider_id,
  model_hint = excluded.model_hint,
  connector_ids_json = excluded.connector_ids_json,
  system_prompt = excluded.system_prompt,
  permissions_json = excluded.permissions_json,
  handoff_policy_json = excluded.handoff_policy_json,
  created_by_member_id = excluded.created_by_member_id,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO agent_jobs (
  id, organization_id, created_by_member_id, assigned_runner, title, job_type, brief,
  context_summary, repo_url, repo_branch, workspace_hint, status, priority, input_json
)
SELECT
  'agjob_optima_self_improvement_20260612_active',
  'org_demo_righello',
  'mem_axel_wearerighello',
  'codex-vps',
  'Auto-miglioramento Optima da dati d''uso',
  'codex_patch',
  'Verifica Optima come sistema operativo agentico aziendale e produci un output revisionabile. Analizza readiness, pagina agenti, MCP GitHub owner-scoped, subagenti, cron self-improvement, runner VPS, grafo/knowhow, presenze, preventivi e AI Assistant. Non fare deploy automatico. Proponi patch conservative o applicale solo nel workspace se coerenti, con build/test, rollback plan e audit. Usa la rete subagenti: self-improvement-orchestrator, codex-engineer, ux-quality-analyst, graph-knowledge-curator, proposal-pdf-engineer, presence-ops-auditor, security-governance-analyst, release-manager, client-intelligence-analyst, office-ops, research-analyst, media-operator.',
  'Self-improvement attivo: usage analytics, agent jobs, subagents, GitHub MCP, Optima OS readiness',
  'https://github.com/axelfleureau/optima-beta',
  'main',
  'Optima agentic operating system',
  'queued',
  2,
  '{"source":"optima-self-improvement-loop","generatedAt":"2026-06-12T08:30:00+02:00","requestedOutput":["diagnostic-report","implementation-patch-if-safe","tests","rollback-plan"],"subagents":["self-improvement-orchestrator","codex-engineer","ux-quality-analyst","graph-knowledge-curator","proposal-pdf-engineer","presence-ops-auditor","security-governance-analyst","release-manager","client-intelligence-analyst","office-ops","research-analyst","media-operator"],"guardrails":["no automatic deploy","no secret logging","human review required","tenant scoped data only","github owner scoped publishing only"]}'
WHERE NOT EXISTS (
  SELECT 1
  FROM agent_jobs
  WHERE organization_id = 'org_demo_righello'
    AND status IN ('queued', 'running', 'needs_review')
    AND (
      id = 'agjob_optima_self_improvement_20260612_active'
      OR json_extract(input_json, '$.source') = 'optima-self-improvement-loop'
      OR title LIKE 'Auto-miglioramento Optima%'
    )
);

INSERT OR IGNORE INTO agent_job_events (
  id, job_id, organization_id, actor_member_id, actor_type, event_type, message, payload_json
)
VALUES (
  'agevt_optima_self_improvement_20260612_active_created',
  'agjob_optima_self_improvement_20260612_active',
  'org_demo_righello',
  'mem_axel_wearerighello',
  'system',
  'job.created',
  'Job self-improvement creato per rendere Optima attivamente operativo sulla propria evoluzione.',
  '{"source":"manual-production-activation","commit_intent":"active_self_improvement_agent_network"}'
);
