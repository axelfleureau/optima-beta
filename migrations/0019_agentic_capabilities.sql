CREATE TABLE IF NOT EXISTS agentic_provider_installations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL DEFAULT 'ai_model',
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  auth_method TEXT NOT NULL DEFAULT 'none',
  install_state TEXT NOT NULL DEFAULT 'not_installed',
  tenant_policy_json TEXT NOT NULL DEFAULT '{}',
  config_json TEXT NOT NULL DEFAULT '{}',
  secret_ref TEXT,
  installed_by_member_id TEXT,
  installed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_agentic_provider_installations_org
  ON agentic_provider_installations (organization_id, provider_id, install_state);

CREATE TABLE IF NOT EXISTS mcp_connector_installations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  auth_method TEXT NOT NULL DEFAULT 'oauth_pkce',
  install_state TEXT NOT NULL DEFAULT 'not_installed',
  scopes_json TEXT NOT NULL DEFAULT '[]',
  config_json TEXT NOT NULL DEFAULT '{}',
  secret_ref TEXT,
  oauth_subject TEXT,
  installed_by_member_id TEXT,
  installed_at TEXT,
  last_health_at TEXT,
  last_health_status TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, connector_id)
);

CREATE INDEX IF NOT EXISTS idx_mcp_connector_installations_org
  ON mcp_connector_installations (organization_id, connector_id, install_state);

CREATE TABLE IF NOT EXISTS agent_subagents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  lane TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  primary_provider_id TEXT NOT NULL,
  model_hint TEXT,
  connector_ids_json TEXT NOT NULL DEFAULT '[]',
  system_prompt TEXT NOT NULL DEFAULT '',
  permissions_json TEXT NOT NULL DEFAULT '{}',
  handoff_policy_json TEXT NOT NULL DEFAULT '{}',
  created_by_member_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_agent_subagents_org
  ON agent_subagents (organization_id, status, lane);

INSERT OR IGNORE INTO agent_subagents (
  id, organization_id, name, slug, lane, primary_provider_id, model_hint,
  connector_ids_json, system_prompt, permissions_json, handoff_policy_json
)
VALUES
  (
    'subagent_righello_codex_engineer',
    'org_demo_righello',
    'Codex Engineer',
    'codex-engineer',
    'code',
    'codex',
    'codex-cli',
    '["github","cloudflare","vercel","hostinger"]',
    'Produce patch, report e PR in worktree isolato. Non fa deploy o push senza approvazione esplicita del control plane.',
    '{"canCreatePatch":true,"canCreatePullRequest":true,"canDeploy":false,"requiresReview":true}',
    '{"onMissingRepository":"ask_or_infer_from_graph","onRiskyAction":"return_to_review"}'
  ),
  (
    'subagent_righello_research_analyst',
    'org_demo_righello',
    'Research Analyst',
    'research-analyst',
    'research',
    'qwen',
    'qwen-long-context',
    '["github","cloudinary"]',
    'Raccoglie contesto, fonti e sintesi operative. Non inventa dati: segnala lacune e produce output revisionabile.',
    '{"canReadGraph":true,"canWriteTasks":false,"requiresSources":true}',
    '{"onInsufficientSources":"return_to_review"}'
  ),
  (
    'subagent_righello_media_operator',
    'org_demo_righello',
    'Media Operator',
    'media-operator',
    'media',
    'minimax',
    'minimax-media',
    '["cloudinary"]',
    'Gestisce generazione e trasformazione asset collegati a clienti, campagne e task, usando solo asset autorizzati.',
    '{"canCreateMedia":true,"canMutateAssets":false,"requiresReview":true}',
    '{"onCopyrightRisk":"return_to_review"}'
  ),
  (
    'subagent_righello_office_ops',
    'org_demo_righello',
    'Office Ops',
    'office-ops',
    'operations',
    'gemma',
    'gemma-local',
    '["sendgrid","telegram"]',
    'Classifica richieste operative, rapportini e comunicazioni interne con modello leggero o locale quando basta.',
    '{"canSendEmail":false,"canDraftEmail":true,"canCreateJob":true,"requiresReview":true}',
    '{"onExternalMessage":"create_job_or_draft"}'
  );
