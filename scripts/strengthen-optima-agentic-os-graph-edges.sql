-- Strengthen the central Optima Agentic OS graph node.
-- The graph had many global nodes/edges, but the central OS node exposed too few
-- direct relations in the node detail view. This script is idempotent.

WITH optima AS (
  SELECT id
  FROM agentic_graph_nodes
  WHERE organization_id = 'org_demo_righello'
    AND source_id = 'optima-agentic-os'
  LIMIT 1
),
targets(source_id, out_edge, in_edge, confidence) AS (
  VALUES
    ('agentic-graph-memory', 'has_capability', 'powers_agentic_os', 'manual'),
    ('graphify-graph-engine', 'uses_graph_engine', 'powers_graph_reasoning', 'manual'),
    ('obsidian-vault-bridge', 'has_graph_workspace', 'curates_agentic_memory', 'manual'),
    ('mcp-tool-gateway', 'has_capability', 'exposes_optima_tools', 'manual'),
    ('subagent-lanes', 'has_capability', 'executes_agentic_workflows', 'manual'),
    ('development-knowhow-graph', 'has_capability', 'improves_operating_system', 'manual'),
    ('codex-development-knowhow', NULL, 'feeds_agentic_os', 'manual'),
    ('hermes-agent', NULL, 'absorbed_into_optima_os', 'inferred'),
    ('hermes-righello-readonly', NULL, 'can_feed_business_context', 'manual'),
    ('notion-righello-readonly', NULL, 'can_feed_operational_context', 'manual'),
    ('notion:collection:28132473-a5fc-8035-803f-000b76e5cbf3', NULL, 'feeds_client_context', 'manual'),
    ('notion:collection:27f32473-a5fc-818d-8448-000b562dd5cf', NULL, 'feeds_task_context', 'manual'),
    ('notion:page:27f32473-a5fc-8130-9985-c3d4b4728bf4', NULL, 'feeds_quote_workflow', 'manual'),
    ('notion:rig_work:quote-patterns', NULL, 'feeds_quote_pricing_memory', 'manual'),
    ('graphify', NULL, 'documents_graph_engine', 'manual'),
    ('perplexity-computer-pattern', NULL, 'informs_ux_pattern', 'inferred')
),
resolved AS (
  SELECT n.id AS node_id, t.source_id, t.out_edge, t.in_edge, t.confidence
  FROM targets t
  JOIN agentic_graph_nodes n
    ON n.organization_id = 'org_demo_righello'
   AND n.source_id = t.source_id
  WHERE n.id != (SELECT id FROM optima)
)
INSERT OR IGNORE INTO agentic_graph_edges (
  id, organization_id, from_node_id, to_node_id, edge_type, confidence, weight, properties_json, created_by_member_id
)
SELECT
  'agedge_optima_out_' || lower(hex(randomblob(8))),
  'org_demo_righello',
  (SELECT id FROM optima),
  node_id,
  out_edge,
  confidence,
  1,
  json_object('seededBy', 'strengthen-optima-agentic-os-graph-edges', 'reason', 'central_node_operational_context'),
  NULL
FROM resolved
WHERE out_edge IS NOT NULL
  AND (SELECT id FROM optima) IS NOT NULL;

WITH optima AS (
  SELECT id
  FROM agentic_graph_nodes
  WHERE organization_id = 'org_demo_righello'
    AND source_id = 'optima-agentic-os'
  LIMIT 1
),
targets(source_id, out_edge, in_edge, confidence) AS (
  VALUES
    ('agentic-graph-memory', 'has_capability', 'powers_agentic_os', 'manual'),
    ('graphify-graph-engine', 'uses_graph_engine', 'powers_graph_reasoning', 'manual'),
    ('obsidian-vault-bridge', 'has_graph_workspace', 'curates_agentic_memory', 'manual'),
    ('mcp-tool-gateway', 'has_capability', 'exposes_optima_tools', 'manual'),
    ('subagent-lanes', 'has_capability', 'executes_agentic_workflows', 'manual'),
    ('development-knowhow-graph', 'has_capability', 'improves_operating_system', 'manual'),
    ('codex-development-knowhow', NULL, 'feeds_agentic_os', 'manual'),
    ('hermes-agent', NULL, 'absorbed_into_optima_os', 'inferred'),
    ('hermes-righello-readonly', NULL, 'can_feed_business_context', 'manual'),
    ('notion-righello-readonly', NULL, 'can_feed_operational_context', 'manual'),
    ('notion:collection:28132473-a5fc-8035-803f-000b76e5cbf3', NULL, 'feeds_client_context', 'manual'),
    ('notion:collection:27f32473-a5fc-818d-8448-000b562dd5cf', NULL, 'feeds_task_context', 'manual'),
    ('notion:page:27f32473-a5fc-8130-9985-c3d4b4728bf4', NULL, 'feeds_quote_workflow', 'manual'),
    ('notion:rig_work:quote-patterns', NULL, 'feeds_quote_pricing_memory', 'manual'),
    ('graphify', NULL, 'documents_graph_engine', 'manual'),
    ('perplexity-computer-pattern', NULL, 'informs_ux_pattern', 'inferred')
),
resolved AS (
  SELECT n.id AS node_id, t.source_id, t.out_edge, t.in_edge, t.confidence
  FROM targets t
  JOIN agentic_graph_nodes n
    ON n.organization_id = 'org_demo_righello'
   AND n.source_id = t.source_id
  WHERE n.id != (SELECT id FROM optima)
)
INSERT OR IGNORE INTO agentic_graph_edges (
  id, organization_id, from_node_id, to_node_id, edge_type, confidence, weight, properties_json, created_by_member_id
)
SELECT
  'agedge_optima_in_' || lower(hex(randomblob(8))),
  'org_demo_righello',
  node_id,
  (SELECT id FROM optima),
  in_edge,
  confidence,
  1,
  json_object('seededBy', 'strengthen-optima-agentic-os-graph-edges', 'reason', 'central_node_operational_context'),
  NULL
FROM resolved
WHERE in_edge IS NOT NULL
  AND (SELECT id FROM optima) IS NOT NULL;
