# Optima Browser MCP Gateway

Optima usa Browser MCP per strumenti web dove non conviene usare API key a consumo. Il login non avviene dentro Optima: avviene in un Chromium persistente e isolato sul VPS, raggiungibile solo tramite Tailscale.

## URL gateway

- VPS Tailscale: `padel-vps.tailcd2fda.ts.net`
- IP Tailscale: `100.100.39.96`
- Gateway Optima: `http://padel-vps.tailcd2fda.ts.net:8789`
- Env Cloudflare: `BROWSER_MCP_GATEWAY_URL=http://padel-vps.tailcd2fda.ts.net:8789`

## Flusso utente

1. Apri Optima > `Agenti` > `Grafo` > `Provider e MCP`.
2. Apri `Browser MCP`.
3. Premi `Prepara ChatGPT`, `Prepara Gemini / Nano Banana`, `Prepara Perplexity` o `Prepara Claude`.
4. Optima crea una sessione pairing con codice e scadenza, ma non apre automaticamente il browser.
5. Premi `Test gateway`: deve aprirsi una risposta JSON con `ok: true`.
6. Se Safari dice che non trova il server, non e un problema OAuth: il dispositivo non raggiunge Tailscale/MagicDNS oppure il servizio VPS non e attivo. Prova dal Mac sulla tailnet o usa il fallback IP Tailscale `100.100.39.96:8789`.
7. Solo dopo un health-check riuscito conferma in Optima e premi `Apri login remoto`.

Optima non deve presentare il login remoto come azione primaria finche il gateway non e stato verificato. Il pairing crea una sessione e un codice, ma l'accesso reale vive nel Chromium isolato sul VPS.
8. Completa il login nel Chromium remoto.
9. Premi `Ho completato il login` nella pagina gateway.
10. Esegui `Job health-check` prima di dichiararlo operativo.

Il pulsante `Salva checklist` non esegue login e non rende operativo il connector.

## Setup VPS

Operare solo in `/srv/optima-agent`.

```bash
cd /srv/optima-agent/optima-beta
git pull --ff-only
sudo apt-get update
sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium
sudo mkdir -p /srv/optima-agent/browser-profiles/righello
sudo cp runner/optima-browser-mcp-gateway.service /etc/systemd/system/optima-browser-mcp-gateway.service
sudo systemctl daemon-reload
sudo systemctl enable --now optima-browser-mcp-gateway
sudo systemctl status optima-browser-mcp-gateway --no-pager
```

Se Chromium non e in uno dei path standard, aggiungere a `/srv/optima-agent/optima-runner.env`:

```bash
BROWSER_MCP_CHROME_BIN=/percorso/a/chromium
```

## Health check

Da un dispositivo connesso alla tailnet:

```bash
curl http://padel-vps.tailcd2fda.ts.net:8789/health
```

Deve rispondere con `ok: true`. `chromeReady` puo essere `false` prima della prima sessione; diventa `true` dopo `Avvia login`.

## Sicurezza

- Niente cookie o token in D1.
- Sessione browser persistente solo nel profilo VPS isolato.
- Gateway dietro Tailscale, non pubblico.
- Invii, acquisti, deploy e modifiche esterne restano azioni da review.
- API key di provider AI restano fallback facoltativo, non percorso primario.
- Nano Banana viene trattato come capability Gemini: il browser apre `gemini.google.com`, non siti terzi non allowlist.
