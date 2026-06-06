CREATE TABLE IF NOT EXISTS agentic_graph_nodes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT NOT NULL,
  source_url TEXT,
  confidence TEXT NOT NULL DEFAULT 'manual',
  tags_json TEXT NOT NULL DEFAULT '[]',
  properties_json TEXT NOT NULL DEFAULT '{}',
  created_by_member_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, node_type, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_agentic_graph_nodes_org_type
  ON agentic_graph_nodes (organization_id, node_type, updated_at);

CREATE INDEX IF NOT EXISTS idx_agentic_graph_nodes_source
  ON agentic_graph_nodes (organization_id, source_type, source_id);

CREATE TABLE IF NOT EXISTS agentic_graph_edges (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  edge_type TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'manual',
  weight REAL NOT NULL DEFAULT 1,
  properties_json TEXT NOT NULL DEFAULT '{}',
  created_by_member_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, from_node_id, to_node_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_agentic_graph_edges_from
  ON agentic_graph_edges (organization_id, from_node_id, edge_type);

CREATE INDEX IF NOT EXISTS idx_agentic_graph_edges_to
  ON agentic_graph_edges (organization_id, to_node_id, edge_type);

CREATE TABLE IF NOT EXISTS agentic_graph_sessions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  active_subagent_id TEXT,
  conversation_id TEXT,
  task_id TEXT,
  tool_plan_json TEXT NOT NULL DEFAULT '[]',
  trace_json TEXT NOT NULL DEFAULT '[]',
  created_by_member_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agentic_graph_sessions_org_status
  ON agentic_graph_sessions (organization_id, status, updated_at);
