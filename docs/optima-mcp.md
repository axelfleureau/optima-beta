# Optima MCP Agentic OS

Optima espone un MCP server autenticato su:

```text
https://<optima-domain>/mcp
```

Il server usa Streamable HTTP/JSON-RPC stateless e pubblica OAuth Protected Resource Metadata su:

```text
https://<optima-domain>/.well-known/oauth-protected-resource
```

## OAuth

Optima si comporta da OAuth Resource Server: valida Bearer token emessi da un Authorization Server esterno.

Variabili server:

```bash
OPTIMA_MCP_AUTHORIZATION_SERVER=https://auth.example.com
OPTIMA_MCP_ISSUER=https://auth.example.com
OPTIMA_MCP_JWKS_URI=https://auth.example.com/.well-known/jwks.json
OPTIMA_MCP_AUDIENCE=optima-mcp
```

Se vuoi pubblicare anche metadata OAuth locali:

```bash
OPTIMA_MCP_AUTHORIZATION_ENDPOINT=https://auth.example.com/oauth/authorize
OPTIMA_MCP_TOKEN_ENDPOINT=https://auth.example.com/oauth/token
```

Per test controllati o automazioni interne puoi configurare un token di servizio:

```bash
OPTIMA_MCP_SERVICE_TOKEN=...
OPTIMA_MCP_SERVICE_MEMBER_EMAIL=axel@wearerighello.com
```

Il token di servizio non sostituisce OAuth per client esterni. Serve solo per bootstrap, test e automazioni server-to-server interne.

## Tool Esposti

- `optima_context_snapshot`
  - legge il grafo operativo visibile all'utente.
- `optima_agent_job_create`
  - crea job agentici con inferenza repository da task, progetto o cliente.
- `optima_repository_links_list`
  - lista collegamenti repository nel grafo operativo.
- `optima_repository_link_upsert`
  - collega repo GitHub a organizzazione, cliente, progetto o task.
- `optima_report_review_list`
  - lista rapportini inviati in attesa di revisione.
- `optima_connector_catalog`
  - espone il catalogo dei connettori strategici dell'OS agentico.
- `optima_agentic_capability_catalog`
  - espone provider AI/code, connettori MCP, stato installazioni tenant, regole OAuth/installazione e policy runtime nativa.
- `optima_subagent_roster`
  - lista subagenti configurati per il tenant, con provider primario, lane e connector concessi.
- `optima_graph_memory_snapshot`
  - legge la graph memory agentica del tenant.
- `optima_graph_memory_search`
  - cerca nodi nel grafo senza caricare tutto il contesto.
- `optima_graph_memory_upsert`
  - inserisce/aggiorna nodi con fonte e confidence esplicite.
- `optima_graph_edge_upsert`
  - inserisce/aggiorna archi tra nodi con tipo relazione, peso e confidence.
- `optima_agentic_reference_sources`
  - espone e puo inizializzare le sorgenti/pattern Hermes, Graphify e Perplexity Computer.

## Risorsa MCP

```text
optima://context/snapshot
```

Restituisce lo snapshot operativo testuale usato anche da chat e command bar.

```text
optima://connectors/catalog
```

Restituisce la mappa delle capability MCP/operative da trattare come parti fondamentali del sistema:

- SendGrid: email transazionali, rapportini, inviti e notifiche.
- Telegram: canale conversazionale stile Hermes per ricevere indicazioni e rispondere usando AI Assistant.
- Codex Runner: esecuzione agentica controllata su VPS.
- Cloudinary: asset media collegati a clienti, campagne, task e deliverable.
- GitHub: repository, branch, PR, audit tecnico e collegamenti codice-progetto.
- Cloudflare: runtime Optima, D1, R2, Workers, secret, cron e deploy.
- Vercel: deploy e diagnostica dei progetti web che restano su Vercel.
- Hostinger VPS: runner persistente e servizi che devono restare svegli senza browser.

Il catalogo non espone valori segreti. Mostra solo stato configurativo e nomi delle variabili richieste.

```text
optima://agentic/capabilities
```

Restituisce lo stack agentico multi-tenant:

- provider AI/code: Codex, OpenCode, Gemma, Qwen, MiniMax, OpenAI;
- connettori MCP: SendGrid, Telegram, Cloudinary, GitHub, Cloudflare, Vercel, Hostinger;
- installazioni per tenant;
- roster subagenti;
- regole OAuth/installazione;
- policy runtime per chat, job agentici, scheduled job e handoff subagenti.

```text
optima://agentic/graph-memory
```

Restituisce la memoria a grafo agentica multi-tenant:

- nodi aziendali e agentici;
- archi con `manual`, `extracted`, `inferred` o `ambiguous`;
- sessioni operative stile research/computer workspace;
- sorgenti architetturali Hermes/Graphify/Perplexity-pattern.

Migration: `migrations/0020_agentic_graph_memory.sql`

Documentazione: `docs/agentic-graph-memory.md`

## Multi-Tenant Capability Layer

Migration: `migrations/0019_agentic_capabilities.sql`

Tabelle:

- `agentic_provider_installations`
  - stato provider per organization: modello, auth method, policy, `secret_ref`.
- `mcp_connector_installations`
  - stato MCP per organization: OAuth/API key/manual install, scope, health.
- `agent_subagents`
  - subagenti tenant-scoped con lane, provider primario, connector concessi e policy handoff.

Regola sicurezza:

- D1 non salva token, password o API key.
- D1 salva solo stato, scope, policy, subject OAuth e `secret_ref`.
- Le credenziali vere restano in OAuth provider, Cloudflare secrets, vault esterno o ambiente runner.

Pattern installazione:

- OAuth Authorization Code + PKCE per connector user-delegated.
- GitHub App installation per repository e permessi codice.
- API key secret con `secret_ref` per provider senza OAuth adeguato.
- Local install per Gemma/OpenCode o modelli/tool self-hosted sul VPS.
- External OAuth per provider gestiti da app terze.

I subagenti non sono account separati senza controllo: sono profili operativi del tenant. Ogni subagente riceve solo lane, provider e connector dichiarati; le azioni rischiose tornano sempre nella review room.

Hermes Agent non va collegato come servizio esterno. La repo ufficiale e una sorgente di audit da cui Optima copia e reimplementa funzioni agentiche native: memoria, skills, MCP host, provider routing, scheduler, gateway e subagenti. Optima resta il livello che governa grafo aziendale, permessi, memoria autorizzata, job, audit e approvazioni.

La prima funzione assorbita come codice nativo e `runtimePolicy`: definisce toolset consentiti, toolset bloccati e passaggi review per chat, job agentici, scheduled job e handoff subagenti. Questo evita che provider o runner decidano autonomamente cosa possono fare.

Graphify puo alimentare la graph memory con `graph.json` e report codice, ma ogni import deve conservare source, confidence e tenant scope. Le relazioni dedotte non devono diventare dati operativi certi senza review.

## Telegram AI Assistant

Webhook:

```text
POST https://<optima-domain>/api/ai/telegram
```

Variabili:

```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_ALLOWED_CHAT_IDS=123456789,987654321
TELEGRAM_ALLOWED_USERNAMES=axelfleureau
TELEGRAM_DEFAULT_MEMBER_EMAIL=axel@wearerighello.com
TELEGRAM_MEMBER_EMAIL_MAP={"axelfleureau":"axel@wearerighello.com"}
```

Telegram usa lo stesso grafo operativo e salva le conversazioni nelle tabelle AI Assistant. Le richieste vengono accettate solo da chat id o username in allowlist e vengono associate a un membro Optima.

## Direzione Architetturale

Questo MCP server e il punto d'ingresso agentico esterno di Optima. La chat interna, command bar e job runner usano lo stesso resolver operativo in `lib/operational-context.ts`, quindi i client MCP vedono lo stesso grafo applicativo di Optima.
