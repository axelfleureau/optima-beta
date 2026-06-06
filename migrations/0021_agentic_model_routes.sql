CREATE TABLE IF NOT EXISTS agentic_model_routes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  lane TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  model TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'hosted',
  status TEXT NOT NULL DEFAULT 'configured',
  priority INTEGER NOT NULL DEFAULT 100,
  endpoint_ref TEXT,
  secret_ref TEXT,
  config_json TEXT NOT NULL DEFAULT '{}',
  last_health_at TEXT,
  last_health_status TEXT,
  created_by_member_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, lane, provider_id, model)
);

CREATE INDEX IF NOT EXISTS idx_agentic_model_routes_org_lane
  ON agentic_model_routes (organization_id, lane, status, priority);

INSERT OR IGNORE INTO agentic_model_routes (
  id, organization_id, lane, provider_id, model, mode, status, priority,
  endpoint_ref, secret_ref, config_json
)
VALUES
  (
    'aimod_righello_research_qwen',
    'org_demo_righello',
    'research',
    'qwen',
    'qwen-long-context',
    'hosted',
    'configured',
    30,
    'QWEN_BASE_URL',
    'secret://tenant/org_demo_righello/qwen',
    '{"runtimeAdapter":"openai_compatible","dataPolicy":"Research e sintesi lunga con policy tenant esplicita."}'
  ),
  (
    'aimod_righello_operations_gemma',
    'org_demo_righello',
    'operations',
    'gemma-hosted',
    'gemma-hosted',
    'hosted',
    'configured',
    40,
    'GEMMA_BASE_URL',
    'secret://tenant/org_demo_righello/gemma',
    '{"runtimeAdapter":"openai_compatible","dataPolicy":"Triage operativo, rapportini e classificazione a costo controllato."}'
  ),
  (
    'aimod_righello_media_minimax',
    'org_demo_righello',
    'media',
    'minimax',
    'minimax-media',
    'hosted',
    'configured',
    45,
    'MINIMAX_BASE_URL',
    'secret://tenant/org_demo_righello/minimax',
    '{"runtimeAdapter":"openai_compatible","dataPolicy":"Media generation con output in review e asset collegati a Cloudinary.","collaboration":{"from":"codex-engineer","to":"media-operator","trigger":"media_asset_or_visual_generation_required","storageConnector":"cloudinary","reviewRequired":true}}'
  ),
  (
    'aimod_righello_chat_openai',
    'org_demo_righello',
    'chat',
    'openai',
    'gpt-5.2',
    'router',
    'configured',
    50,
    NULL,
    'secret://tenant/org_demo_righello/openai',
    '{"runtimeAdapter":"openai_compatible","dataPolicy":"Reasoning/router e fallback per task ad alta complessita."}'
  );
