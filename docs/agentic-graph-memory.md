# Optima Agentic Graph Memory

Optima usa una memoria a grafo multi-tenant per collegare dati aziendali, agenti e sorgenti operative senza inventare relazioni.

## Obiettivo

La graph memory deve collegare:

- persone, clienti, progetti, task e rapportini;
- repository, PR, commit e artifact;
- subagenti, provider AI e MCP connector;
- conversazioni, sessioni operative e review;
- sorgenti esterne usate come riferimento architetturale.

## Schema

Migration: `migrations/0020_agentic_graph_memory.sql`

Tabelle:

- `agentic_graph_nodes`
  - nodo tenant-scoped con `node_type`, `title`, `summary`, `source_type`, `source_id`, `source_url`, `confidence`, `tags_json`, `properties_json`.
- `agentic_graph_edges`
  - arco tenant-scoped con `from_node_id`, `to_node_id`, `edge_type`, `confidence`, `weight`, `properties_json`.
- `agentic_graph_sessions`
  - workspace agentico stile research/computer session con obiettivo, subagente attivo, piano tool e trace.

## Confidence

Ogni nodo/arco deve dichiarare una confidence:

- `manual`: inserito esplicitamente da direzione/responsabile o seed controllato.
- `extracted`: ricavato direttamente da una fonte verificabile, per esempio Graphify `graph.json`, GitHub API, task o rapportino.
- `inferred`: deduzione ragionevole da piu fonti, non una certezza.
- `ambiguous`: relazione utile ma incerta, da portare in review.

Questa regola evita errori come task o workload falsi: se manca una durata, una fonte o un collegamento, il sistema deve dirlo.

## Fonti agentiche

Optima non vendorizza Hermes o Graphify automaticamente.

- Hermes Agent (`NousResearch/hermes-agent`) e riferimento per gateway conversazionale, memoria, skills, provider routing, subagenti e runtime VPS/cloud.
- Graphify (`safishamsi/graphify`) e riferimento per estrazione grafi, schema nodi/archi, confidence, MCP e query-first workflow.
- Perplexity Computer e un pattern UX: workspace conversazionale con obiettivo, fonti, azioni, trace e handoff umano.

## API

Dashboard/API:

- `GET /api/agentic-graph`
  - snapshot di nodi, archi, sessioni e sorgenti.
- `GET /api/agentic-graph?q=<query>&nodeType=<type>`
  - ricerca nodi.
- `POST /api/agentic-graph`
  - `seed_references`
  - `upsert_node`
  - `upsert_edge`
  - `create_session`

Scrittura consentita solo a direzione/admin.

## MCP

Tool:

- `optima_graph_memory_snapshot`
- `optima_graph_memory_search`
- `optima_graph_memory_upsert`
- `optima_graph_edge_upsert`
- `optima_agentic_reference_sources`

Risorsa:

```text
optima://agentic/graph-memory
```

## Workflow futuro Graphify

Quando il runner produce o aggiorna un `graphify-out/graph.json`, il flusso corretto e:

1. validare schema e dimensione del grafo;
2. importare solo nodi/archi rilevanti per il tenant;
3. marcare le relazioni dirette come `extracted`;
4. marcare le deduzioni come `inferred` o `ambiguous`;
5. collegare ogni nodo importato a repository, commit, PR o artifact sorgente;
6. mostrare in review le relazioni ambigue prima di usarle per decisioni operative.

## Regole

- Nessun secret in `properties_json`.
- Nessuna relazione inventata per riempire dashboard o heatmap.
- Ogni connector OAuth/API key resta fuori da D1: la graph memory salva solo `secret_ref`, subject o metadati non sensibili quando necessario.
- Chat, command bar, Telegram e runner devono interrogare lo stesso grafo tenant-scoped.
