# Óptima Agentic Runner

Óptima può orchestrare job operativi agentici senza esporre il VPS a internet.

## Architettura

```mermaid
flowchart LR
  A["Óptima admin"] --> B["D1 agent_jobs"]
  B --> C["R2 context/result payload"]
  D["Codex Runner VPS"] -->|"POST /api/agent-jobs/runner/claim"| B
  D --> E["Worktree isolato + Codex CLI"]
  E --> F["Patch / report / PDF / PR"]
  F -->|"POST /api/agent-jobs/runner/:id/complete"| B
  B --> G["Óptima review"]
  G --> H["Admin approva"]
```

## Perche polling outbound

Il VPS Hostinger ospita gia altri servizi. Per evitare collisioni con Hermes o processi esistenti, il runner non apre porte pubbliche:

- legge job con polling HTTPS verso Óptima;
- usa bearer token `AGENT_RUNNER_API_KEY`;
- lavora in directory isolate;
- restituisce solo risultato e artifact metadata;
- non fa deploy automatici senza approvazione.

## Tabelle D1

Migration: `migrations/0015_agent_jobs.sql`

- `agent_jobs`: coda e stato dei job.
- `agent_job_events`: audit trail.
- `agent_job_artifacts`: report, PDF, PR, patch o link prodotti.

## API

### Admin

- `GET /api/agent-jobs`
- `POST /api/agent-jobs`
- `GET /api/agent-jobs/:id`
- `PATCH /api/agent-jobs/:id`

Azioni PATCH:

- `approve`
- `reject`
- `cancel`

### Runner

Header richiesto:

```http
Authorization: Bearer $AGENT_RUNNER_API_KEY
```

Claim:

```bash
curl -X POST "$OPTIMA_URL/api/agent-jobs/runner/claim" \
  -H "Authorization: Bearer $AGENT_RUNNER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"runnerId":"hostinger-codex-01"}'
```

Complete:

```bash
curl -X POST "$OPTIMA_URL/api/agent-jobs/runner/$JOB_ID/complete" \
  -H "Authorization: Bearer $AGENT_RUNNER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "runnerId":"hostinger-codex-01",
    "status":"needs_review",
    "resultSummary":"Patch pronta e PR creata.",
    "artifacts":[
      {"type":"pull-request","label":"PR GitHub","url":"https://github.com/.../pull/1"}
    ]
  }'
```

## Runner VPS pronto

Nel repository ora c'e un runner pronto in `runner/`:

- `runner/optima-agent-runner.mjs`: polling, workspace isolato, Codex CLI, complete callback.
- `runner/optima-agent-runner.service`: template systemd.
- `runner/env.example`: variabili richieste.
- `runner/README.md`: installazione Hostinger.

Processo systemd con loop:

1. chiama `claim`;
2. se riceve `null`, dorme 20-60 secondi;
3. crea worktree in `/srv/optima-agent/jobs/$JOB_ID`;
4. clona o aggiorna repo;
5. esegue Codex CLI o tool dedicato;
6. produce artifact;
7. chiama `complete`.

Regole operative:

- mai scrivere secret nei log;
- timeout per job;
- massimo 1-2 job concorrenti sul VPS se ospita altri servizi;
- ogni job porta `organizationId` e il runner non deve conservare memoria, artifact temporanei o credenziali tra tenant diversi;
- cleanup worktree dopo review o dopo N giorni;
- PR/patch prima del deploy;
- deploy solo con job esplicito e approvazione admin.
- selezionare subagente, provider e tool dal control plane, non da preferenze hardcoded nel runner.
- per provider locali come Gemma/OpenCode, il runner espone solo capability e health; Optima resta responsabile di tenant, permessi, audit e review.
- quando usa Graphify, importare in Optima solo nodi/archi con source e confidence esplicite; niente deduzioni operative senza review.
- quando usa pattern Hermes, mantenere Optima come control plane: Hermes puo ispirare gateway/memoria/tooling, ma permessi, audit e approvazione restano in Optima.

## Subagenti e tool lane

Il runner puo eseguire piu profili agentici, ma ogni profilo resta dichiarato in `agent_subagents`:

- `code`: Codex/OpenCode con GitHub, Cloudflare, Vercel, Hostinger.
- `research`: Qwen/OpenAI con repository, fonti e knowledge graph.
- `media`: MiniMax/Cloudinary con asset collegati a cliente/campagna/task.
- `operations`: Gemma/OpenAI con SendGrid, Telegram, rapportini e task.

Il runner non decide autonomamente quali integrazioni usare: riceve dal job una lane e un context bundle. Se mancano provider o MCP richiesti, deve restituire `needs_review` con una richiesta di installazione guidata.

In natura multi-tenant, il runner e infrastruttura condivisa ma non e autorita tenant: non sceglie organization, non risolve segreti tenant e non puo leggere graph memory fuori dal payload ricevuto. Ogni output torna con `organizationId` del job e viene salvato in R2/D1 sotto quel tenant.

La policy runtime nativa vive nello snapshot capability (`runtimePolicy`) e deriva dai pattern Hermes auditati, ma resta codice Optima. Risolve per contesto:

- `interactive_chat`: grafo, lookup business, memoria e creazione job; niente deploy, shell, secret o bulk write.
- `agent_job`: lettura grafo, artifact, git read, patch propose e MCP allowlist; deploy, PR, email e mutazioni DB tornano in review.
- `scheduled_job`: health, digest, notifiche draft e graph read; niente tool interattivi o shell.
- `subagent_handoff`: memoria scoped, connector di lane e handoff event; niente accesso cross-tenant o tutti i connector.

## Graph memory e sessioni agentiche

La memoria a grafo vive in `agentic_graph_nodes`, `agentic_graph_edges` e `agentic_graph_sessions`.

Uso previsto:

1. il control plane crea una sessione agentica per richieste complesse;
2. il runner riceve task, subagente, connector consentiti e snapshot grafo;
3. strumenti come Graphify producono `graph.json` o report;
4. il runner restituisce artifact e propone nodi/archi;
5. Optima salva solo relazioni con fonte e confidence;
6. gli archi `ambiguous` o ad alto impatto tornano in review.

Questo abilita un'esperienza tipo Perplexity Computer: conversazione, fonti, azioni e trace nello stesso workspace, ma con controllo aziendale e tenant scope.

## Variabili Cloudflare

Secret da configurare su staging e production:

```bash
npx wrangler secret put AGENT_RUNNER_API_KEY --env staging
npx wrangler secret put AGENT_RUNNER_API_KEY --env production
npx wrangler secret put AGENT_RUNNER_ENABLED --env staging
npx wrangler secret put AGENT_RUNNER_ENABLED --env production
```

`AGENT_RUNNER_ENABLED` deve valere `true` per reclamare job. Se manca o contiene un altro valore, il runner puo registrare heartbeat e polling, ma `/api/agent-jobs/runner/claim` risponde con `job: null` e `suspended: true`.

## Setup rapido Hostinger

Sul VPS:

```bash
sudo mkdir -p /srv/optima-agent
sudo chown -R "$USER":"$USER" /srv/optima-agent
git clone https://github.com/axelfleureau/optima-beta.git /srv/optima-agent/optima-beta
cp /srv/optima-agent/optima-beta/runner/env.example /srv/optima-agent/optima-runner.env
chmod 600 /srv/optima-agent/optima-runner.env
```

Poi inserisci in `/srv/optima-agent/optima-runner.env` lo stesso valore configurato in Cloudflare per `AGENT_RUNNER_API_KEY`.

Avvio:

```bash
sudo cp /srv/optima-agent/optima-beta/runner/optima-agent-runner.service /etc/systemd/system/optima-agent-runner.service
sudo systemctl daemon-reload
sudo systemctl enable --now optima-agent-runner
journalctl -u optima-agent-runner -f
```

Il runner deve restare piccolo, osservabile e riavviabile. La potenza agentica sta nel protocollo e nel controllo umano, non in un processo opaco che fa tutto da solo.
