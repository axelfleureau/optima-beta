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

Optima deve assorbire le funzioni utili di Hermes e Graphify come capability native, senza diventare un wrapper fragile di servizi esterni.

- Hermes Agent (`NousResearch/hermes-agent`) e la repo sorgente da cui copiare pattern e funzioni agentiche: gateway conversazionale, memoria, skills, provider routing, subagenti e runtime VPS/cloud. Non e un connettore Optima. Il clone locale di audit resta fuori dal bundle applicativo: `/Users/axel/Documents/Codex/reference-sources/hermes-agent`.
- Il blueprint auditato e versionato vive in `lib/hermes-reference.ts`: al 2026-06-08 punta a revision `ab0a6270c` (`v2026.6.5-208-gab0a6270c`) e classifica i pattern Hermes come implemented, partial o planned per Optima.
- L'installazione Hermes gia presente sul VPS puo essere usata solo come sorgente dati Righello in sola lettura. Si importano indici redatti, non codice sorgente, servizi, token o dump completi.
- Graphify (`safishamsi/graphify`) e riferimento per estrazione grafi, schema nodi/archi, confidence, MCP e query-first workflow.
- Perplexity Computer e un pattern UX: workspace conversazionale con obiettivo, fonti, azioni, trace e handoff umano.

## Import Hermes read-only

Script: `scripts/import-hermes-graph-source.mjs`

Per dati commerciali/clienti Righello, Hermes espone anche un vault Obsidian operativo. La fonte verificata al 2026-06-15 e:

- `/home/hermes/obsidian-righello-vault/01_Commerciale/Clienti/Righello_Client_Intelligence_Master.md`
- `/home/hermes/obsidian-righello-vault/01_Commerciale/Opportunita_Upsell.md`
- `/home/hermes/.hermes/state/notion_db_ids.json`
- `/home/hermes/.hermes/state/notion_sync_state.json`

Script dedicato:

```bash
scp root@<vps>:/home/hermes/obsidian-righello-vault/01_Commerciale/Clienti/Righello_Client_Intelligence_Master.md /private/tmp/righello-client-intelligence-master.md
node scripts/import-hermes-client-intelligence.mjs \
  --input=/private/tmp/righello-client-intelligence-master.md \
  --output=scripts/seed-hermes-client-intelligence-2026-06-15.sql
node scripts/run-with-wrangler-vars.mjs production -- \
  npx wrangler d1 execute optima-beta-production-db --remote \
  --file scripts/seed-hermes-client-intelligence-2026-06-15.sql
```

Questo import e intenzionalmente redatto: legge solo la tabella `Indice Clienti`, crea/aggiorna clienti e record `external_data_records` con `provider='hermes'`, `record_type='client'` e `record_type='payment'` per il fatturato aggregato. Non importa recapiti, OneDrive, allegati, token, sessioni o schede dettagliate. Esempio: Portopiccolo Apartments viene collegato a `client_rig_ppap` con un record di fatturato aggregato Hermes da 2.750 euro, `confidence='extracted'`.

Uso consigliato:

```bash
HERMES_SOURCE_DIR=/tmp/hermes-optima-import/.hermes npm run hermes:graph:import -- --dry-run
HERMES_SOURCE_DIR=/tmp/hermes-optima-import/.hermes npm run hermes:graph:import
```

Prima di eseguirlo su dati VPS, creare una copia locale in sola lettura delle sole cartelle consentite:

- `memories`
- `skills`
- `kanban`
- `sessions`

Esempio staging locale via rsync, leggendo dal VPS e scrivendo solo in `/tmp` locale:

```bash
mkdir -p /tmp/hermes-optima-import/.hermes
rsync -a --prune-empty-dirs \
  --include 'memories/***' \
  --include 'skills/***' \
  --include 'kanban/***' \
  --include 'sessions/***' \
  --exclude '*' \
  root@<tailscale-vps>:/home/hermes/.hermes/ \
  /tmp/hermes-optima-import/.hermes/
```

Cartelle vietate:

- `secrets`
- `.secrets`
- `tokens`
- `credentials`
- file/env che contengono segreti

Il risultato e idempotente e salva solo:

- nodo radice `Hermes Righello read-only import`;
- nodi `hermes_memory`, `hermes_skill`, `hermes_kanban`, `hermes_session`;
- archi `indexes_hermes_source`;
- `source_id` stabile, path relativo, dimensione, timestamp, tag e sommario redatto.

Le sessioni sono marcate `ambiguous` per default: servono come pista di recupero, non come verita operativa finche non vengono revisionate.

## Import Portopiccolo Avantio/Guesty

Script: `scripts/seed-portopiccolo-avantio-guesty-graph.mjs`

Uso:

```bash
npm run portopiccolo:graph:seed -- --dry-run
npm run portopiccolo:graph:seed
```

Fonti indicizzate:

- skill Codex: `/Users/axel/.codex/skills/portopiccolo-avantio-guesty-sync/SKILL.md`;
- mappa runtime: `/Users/axel/.codex/skills/portopiccolo-avantio-guesty-sync/references/locations.md`;
- metadata UI skill: `/Users/axel/.codex/skills/portopiccolo-avantio-guesty-sync/agents/openai.yaml`;
- know-how: `/Users/axel/Documents/Codex/development/knowhow/avantio-guesty-sync.md`;
- dossier operativo: `/Users/axel/Documents/Codex/2026-06-05/ciao/outputs/portopiccolo-apartments-full-operational-context.md`;
- repo sync: `/Users/axel/Documents/Codex/2026-05-20/clona-questo-progetto-e-iniziamo-a/tools/avantio-guesty-sync`;
- runtime sync: `/Users/axel/Library/Application Support/PortopiccoloSync/avantio-guesty-sync`.

Il seed e idempotente e salva solo nodi di indice: skill, source map, metadata, know-how, dossier, repository, runtime e audit. Il runtime viene indicizzato con metadati, percorsi, conteggi e segnali read-only. Non vengono importati credenziali, token, storage state, log completi, mailbox, issue table dettagliate o dump di prenotazioni.

Safety contract:

- le scritture Guesty sono production-impacting;
- `SYNC_PUSH_TO_GUESTY=1`, reload LaunchAgent o azioni di repair richiedono conferma esplicita nel turno corrente;
- OTA come Booking, Airbnb, Vrbo e HomeAway restano hard-banned prima di qualunque push;
- la dedupe Guesty usa `originId=avantio:<id>`;
- se il report runtime e stale o `drift`, Optima deve chiedere un audit read-only prima di trarre conclusioni operative.

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
- Import da sistemi esterni: mai dump integrale nel prompt o in D1; sempre indici piccoli, redatti, tenant-scoped, con source e confidence.
