# Audit connector MCP — paragone con `npx wrangler login`

> Documento di audit (2026-06-24). Punto di partenza: lo screenshot dell'utente che mostra `npx wrangler login` → un singolo click in browser → token pronto.

## TL;DR

| | `npx wrangler login` | Optima MCP connector |
|---|---|---|
| Click utente | 1 | 1 (per OAuth) — 4/5 step manuali per gli altri |
| Provider supportati | Cloudflare | 16 (SendGrid, Telegram, Codex, Browser, Cloudinary, GBP, Calendar, Meta, LinkedIn, Drive, GitHub, Notion, Cloudflare, Vercel, Hostinger, Tetha) |
| Token output | Browser cookie + locale | D1 `mcp_connector_installations` + secret_ref runtime |
| Refresh token | Auto | Da implementare caso per caso |
| Stato "operativo" | Immediato | Solo dopo health-check read-only che gira sul runner |
| Auth model | OAuth Device Flow (RFC 8628) | OAuth Authorization Code + PKCE oppure secret_ref |
| Errori tipici | Quasi zero | Frequenti: env mancanti, redirect URI sbagliato, scope eccessivi, secret_ref non trovato |

## Perché l'utente ha ragione

L'utente ha ragione sul **principio**. Wrangler fa una cosa semplice: OAuth Device Flow. Un click → finito. Optima invece:

1. Mostra il connector in una griglia
2. L'utente clicca "Configura" → si apre un dialog con 5 step in HTML
3. Lo step 1 chiede di andare sul provider a creare una OAuth App (Google Cloud Console, Meta for Developers, LinkedIn Developers, …) — **lavoro manuale fuori da Optima**
4. Lo step 2 chiede di incollare Client ID e Client Secret (per alcuni anche redirect URI)
5. Lo step 3 salva in Cloudflare Secrets / D1
6. Lo step 4 riavvia il worker / deploy
7. Lo step 5 lancia health-check

Per connector come **Notion, Vercel, GitHub** esiste un vero OAuth/PKCE, ma serve comunque un'app developer pre-registrata sul provider. Per connector **API key** (SendGrid, Telegram, Cloudinary, Hostinger) non esiste proprio un click — solo "vai su sendgrid.com → crea API key → torna qui → incollala".

## File rilevanti (post-audit)

**Backend (server)**
- `lib/mcp-connectors.ts` (362 righe) — catalogo 16 connector con `setupSteps` per ciascuno (10/15 righe di testo per i più complessi)
- `lib/mcp-auth.ts` (206 righe) — readiness check + JWKS/service-token verify
- `app/api/mcp/connect/[connectorId]/route.ts` (218 righe) — start OAuth PKCE
- `app/api/mcp/oauth/callback/[connectorId]/route.ts` (120 righe) — riceve `code`/`state` dal provider
- `app/api/mcp/oauth/token/route.ts` (84 righe) — token endpoint MCP server-to-server (`client_credentials`)
- `app/api/mcp/browser-session/route.ts` (247 righe) — flesso separato per "Browser MCP" (Chromium isolato)
- `app/api/mcp/browser-session/callback/route.ts` (94 righe)
- `app/.well-known/oauth-authorization-server/route.ts` (69 righe)
- `app/.well-known/oauth-protected-resource/route.ts`
- `app/mcp/route.ts` (917 righe) — server MCP vero (JSON-RPC + tools)

**Frontend (mega-componente)**
- `components/agent-jobs/agent-jobs-client.tsx` (**7503 righe**) — wizard connector + control room agentica in **un solo file**

Solo `components/agent-jobs/agent-jobs-client.tsx` è più grande di tutto il resto del layer MCP/agent-jobs insieme. È un big ball of mud che gestisce:
- capability snapshot (frequenti refetch)
- graph agentic state
- agent jobs CRUD
- connector catalog filter / search / wizard
- provider catalog (motori AI)
- browser pairing
- Hermes blueprint visualization
- control room dashboard (jobs, runner, readyness)
- graph node drag/pan/zoom (riga 1445: `dotStep = Math.max(18, 22 * zoom)`)

## Pattern di complessità inutile trovati

### 1. Connector "OAuth" ma setup manuale del provider

Esempio per `meta-business-suite`:
```
authMethod: "oauth_pkce"
requiredEnv: ["META_APP_ID", "META_APP_SECRET_REF"]
setupSteps: [
  "Configurare Meta app e Business Login con pagine/account Instagram autorizzati dal cliente.",
  "Collegare page_id, instagram_business_account_id, cliente e canale nel grafo.",
  ...
]
```

→ L'utente deve: aprire Meta for Developers, creare un'app Business, richiedere `pages_show_list`, gestire il review Meta per gli scope, salvare App ID/Secret, configurare redirect URI in Meta che punta a `appbeta.wearerighello.com/api/mcp/oauth/callback/meta-business-suite`. Solo DOPO Optima può aprire il flow PKCE.

### 2. Connector "API key" che potrebbero essere OAuth

`sendgrid`, `telegram`, `cloudinary`, `hostinger` sono tutti `authMethod: "api_key_secret"` o `service_account`. Però alcuni di questi (es. **SendGrid** via OAuth) **esistono** come OAuth provider. Il catalogo non li usa.

### 3. Vercel OAuth già supportato da Wrangler/CLI ma non sfruttato

Vercel ha un vero OAuth flow (lo usiamo noi per la CLI). Nel catalogo:
```ts
id: "vercel",
authMethod: "external_oauth",
requiredEnv: ["VERCEL_TOKEN"],
```
→ richiede comunque un PAT (Personal Access Token). Optima potrebbe fare il vero OAuth Vercel come fa wrangler login → un click.

### 4. GitHub App manuale

`authMethod: "github_app"`. Setup:
> "Creare una GitHub App, configurare permessi, installare sull'owner, generare private key, salvarla come secret…"

Anche qui OAuth App + Device Flow sarebbe un click.

### 5. Wizard HTML monolitico

Il dialog connector (riga 6538-6900 circa di `agent-jobs-client.tsx`) ha 360+ righe di UI con 3 stati (Collegamento / Verifica / Uso agentico), wizard steps inline, conditional per ogni auth method. Refactor naturale: 16 piccoli file `<ConnectorWizard>` per ogni auth method.

### 6. Health-check che non gira mai davvero

Il bottone "Verifica runtime" crea un `agent_job` che gira sul runner VPS. Se il runner è giù o il connector non è stato davvero configurato (env mancanti), il job fallisce dopo 30 secondi. L'utente vede solo "verifica in corso" senza capire se è bloccato.

### 7. Secret_ref pattern ben pensato ma non standardizzato

Ogni connector ha un `secretRef` opzionale. Il pattern è OK (no token in D1) ma:
- Manca un helper unico `getSecret(ref)` — ogni connector lo implementa
- Manca un comando CLI unico "configura secret per connector X"
- Manca il check "esiste questo secret_ref?" prima di mostrare "abilitato"

## Cosa serve per arrivare al modello "wrangler login"

Per ogni connector, in ordine di impatto:

### Quick wins (1-2 giorni ciascuno)

1. **Vercel OAuth reale** — wrangler-style device flow. Già esiste il codice per OAuth generico in `app/api/mcp/connect/`. Aggiungere `vercel` come device-flow compatibile → 1 click.

2. **Cloudflare OAuth reale** — `npx wrangler login` è già il riferimento. Replicare lato Optima. → 1 click.

3. **GitHub Device Flow** — GitHub supporta OAuth Device Flow ufficiale. Stesso pattern. → 1 click.

### Refactor di medio termine (1 settimana)

4. **Split `agent-jobs-client.tsx`** in:
   - `ConnectorWizard/` per ogni auth method (oauth / browser / github / runtime / service / secret_ref)
   - `ConnectorCard.tsx` per la griglia
   - `ConnectorFilters.tsx` per search/lane
   - `ProviderCatalog.tsx` per i motori AI
   - `AgentJobsBoard.tsx` per la control room
   - `AgenticGraphCanvas.tsx` per il grafo drag/pan/zoom

5. **Helper `getSecret(ref)` unificato** + comando CLI `npx optima connector configure <id>` per i casi api_key_secret.

6. **Wizard "stato del flusso" comune** con 3 stati (Collegamento / Verifica / Uso agentico) estratto in un componente riusabile.

### Strategici (1-2 settimane)

7. **Connector discovery automatico** — wrangler-style: `npx optima connector add <name>` → scarica config provider pre-autenticato (es. GitHub App pubblica Righello-Optima).

8. **OAuth consent screen in-app** — la pagina di consenso Google/Meta/LinkedIn è quella del provider (no lavoro extra). Ma dopo il callback, Optima dovrebbe mostrare un "Connetti a Optima" in-app che salva subito il token, senza ricaricare `/agenti`.

9. **Token refresh automatico** — il `refresh_token` salvato in secret vault dovrebbe rinnovare l'access_token in automatico prima della scadenza. Oggi non c'è.

10. **Auto-reconnect quando il connector si rompe** — wrangler OAuth si riconnette da solo se il token scade. Optima dovrebbe fare lo stesso.

## Decisione attesa dall'utente

Tre opzioni ragionevoli, in ordine di investimento/beneficio:

### A. Quick wins (consigliato) — 4-6 ore
- Implementare Vercel + Cloudflare + GitHub OAuth/Device Flow veri
- Aggiungere `setupSteps` più corti per i connector che restano manuali (1-2 righe)
- Spostare i wizard fuori da `agent-jobs-client.tsx` in 4 file separati

### B. Refactor medio — 1 settimana
- Split completo di `agent-jobs-client.tsx`
- Helper `getSecret(ref)` + CLI
- Wizard a 3 stati estratto

### C. Strategico — 1-2 settimane
- Connector discovery automatico
- OAuth consent screen in-app
- Token refresh + auto-reconnect

## Note finali

- Le **security properties** attuali (no token in D1, secret_ref runtime, allowlist) **vanno preservate** durante qualsiasi refactor.
- Il pattern **connector come capability del grafo agentic** (invece di un semplice flag enabled/disabled) è buono e va tenuto.
- Il fatto che i connector OAuth-PKCE esistenti (Notion, Google) **funzionino davvero** dimostra che l'architettura è sana — è solo la UX che è stratificata.
- `agent-jobs-client.tsx` a 7503 righe è il debito tecnico più visibile. Probabilmente ha senso splittarlo **anche solo per leggibilità**, a prescindere dal lavoro sui connector.
