CREATE INDEX IF NOT EXISTS idx_agentic_graph_nodes_org_confidence
  ON agentic_graph_nodes (organization_id, confidence, updated_at);

CREATE INDEX IF NOT EXISTS idx_agentic_graph_nodes_org_source_type
  ON agentic_graph_nodes (organization_id, source_type, updated_at);

CREATE INDEX IF NOT EXISTS idx_agentic_graph_edges_org_type_weight
  ON agentic_graph_edges (organization_id, edge_type, weight, updated_at);

CREATE INDEX IF NOT EXISTS idx_agentic_graph_edges_org_confidence
  ON agentic_graph_edges (organization_id, confidence, updated_at);
