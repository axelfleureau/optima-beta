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

## Risorsa MCP

```text
optima://context/snapshot
```

Restituisce lo snapshot operativo testuale usato anche da chat e command bar.

## Direzione Architetturale

Questo MCP server e il punto d'ingresso agentico esterno di Optima. La chat interna, command bar e job runner usano lo stesso resolver operativo in `lib/operational-context.ts`, quindi i client MCP vedono lo stesso grafo applicativo di Optima.
