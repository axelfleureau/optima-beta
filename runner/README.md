# Óptima Agent Runner

Runner leggero per rendere fruibile il control plane agentico di Óptima sul VPS Hostinger.

Il runner non espone porte pubbliche: fa polling HTTPS verso Óptima, prende un job, prepara un workspace isolato, esegue Codex CLI e rimanda risultato e artifact alla pagina `/agenti`.

## Requisiti VPS

- Node.js 20+
- Git
- Codex CLI autenticato
- Accesso outbound HTTPS verso `https://appbeta.wearerighello.com`
- Eventuale SSH key GitHub o token se deve clonare repository privati

## Autenticazione Codex sul VPS

Per un VPS headless usa OAuth/device auth:

```bash
codex login --device-auth
codex login status
codex doctor
```

Il comando mostra un codice e un URL: apri l'URL dal browser, autorizza Codex e poi lascia che la CLI salvi la sessione sul VPS. In alternativa, se l'ambiente richiede automazione non interattiva, Codex supporta anche:

```bash
printenv OPENAI_API_KEY | codex login --with-api-key
printenv CODEX_ACCESS_TOKEN | codex login --with-access-token
```

Preferisci `--device-auth` quando possibile: evita di copiare API key long-lived sul server e rende piu semplice revocare l'accesso.

## Secret del runner

`AGENT_RUNNER_API_KEY` non e una chiave OpenAI e non e una chiave GitHub. E una secret condivisa server-to-server tra Óptima e il VPS:

- Óptima la conserva come secret Cloudflare.
- Il VPS la conserva in `/srv/optima-agent/optima-runner.env`.
- Il runner la invia come `Authorization: Bearer ...` alle API `/api/agent-jobs/runner/*`.

La secret deve essere identica sui due lati. Non va committata e non va stampata nei log.

## Installazione

Bootstrap Hostinger con un solo comando, passando la stessa chiave configurata in Cloudflare:

```bash
AGENT_RUNNER_API_KEY='incolla_la_chiave_configurata_su_cloudflare' \
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/axelfleureau/optima-beta/codex/pause-vps-runner/runner/bootstrap-hostinger.sh)"
```

Installazione manuale:

```bash
sudo mkdir -p /srv/optima-agent
sudo chown -R "$USER":"$USER" /srv/optima-agent

git clone https://github.com/axelfleureau/optima-beta.git /srv/optima-agent/optima-beta
cd /srv/optima-agent/optima-beta
```

Crea `/srv/optima-agent/optima-runner.env`:

```bash
OPTIMA_URL=https://appbeta.wearerighello.com
# Alias supportato: OPTIMA_BASE_URL=https://appbeta.wearerighello.com
AGENT_RUNNER_API_KEY=incolla_la_chiave_configurata_su_cloudflare
RUNNER_ID=hostinger-codex-01
WORK_ROOT=/srv/optima-agent/jobs
# Alias supportato: WORKDIR=/srv/optima-agent/jobs
POLL_INTERVAL_MS=30000
MAX_JOB_SECONDS=1800
RUNNER_MODE=codex
CODEX_BIN=codex
CODEX_SANDBOX=workspace-write
```

Configura `AGENT_RUNNER_ENABLED=true` nell'ambiente server di Óptima/Cloudflare solo quando vuoi permettere al VPS di reclamare job reali. Con qualsiasi altro valore il polling resta visibile, ma i job non vengono presi in carico. Questa variabile non va nel file env del VPS: il guard vive nell'app.

Permessi:

```bash
chmod 600 /srv/optima-agent/optima-runner.env
mkdir -p /srv/optima-agent/jobs
```

Test singolo senza consumare job reali:

```bash
node runner/optima-agent-runner.mjs --help
```

Test polling una volta:

```bash
set -a
. /srv/optima-agent/optima-runner.env
set +a
node runner/optima-agent-runner.mjs --once
```

## Systemd

```bash
sudo cp /srv/optima-agent/optima-beta/runner/optima-agent-runner.service /etc/systemd/system/optima-agent-runner.service
sudo systemctl daemon-reload
sudo systemctl enable --now optima-agent-runner
sudo systemctl status optima-agent-runner
```

Log:

```bash
journalctl -u optima-agent-runner -f
```

## Note operative

- Il runner crea workspace in `/srv/optima-agent/jobs`.
- Di default usa sandbox `workspace-write`.
- Non esegue deploy/commit/push se il brief del job non lo chiede chiaramente.
- I risultati vengono marcati `needs_review` e devono essere approvati in Óptima.
- Se il VPS ospita altri servizi, mantieni un solo runner systemd attivo.

## MCP e fasi agentiche

Fase 1: runner Codex semplice. Il VPS non espone porte e fa solo polling verso Óptima.

Fase 2: MCP Óptima esposto da Cloudflare, non dal VPS. In questo modo Codex puo interrogare Óptima tramite strumenti remoti sicuri, mentre Hostinger resta solo un worker.

Fase 3: browser/Chromium/Playwright sul VPS solo per automazioni visuali, scraping controllato o verifica screenshot. Attivarlo solo quando serve davvero.

Fase 4: valutare Hermes Agent come sorgente open-source per memoria persistente, skills, MCP host e tool gateway. Hermes puo diventare un adapter del runner, ma non deve bypassare Optima: job, permessi, audit e approvazioni restano nel control plane.

## Dati necessari per installazione gestita

Per configurare io il VPS servono:

- host/IP pubblico;
- porta SSH;
- utente SSH;
- conferma del metodo di accesso, password o chiave;
- accesso GitHub ai repository privati, via deploy key o token dedicato;
- conferma che posso installare Node.js 20+, Git, Codex CLI e servizio systemd in `/srv/optima-agent`.

Non servono chiavi Revolut o altre API non collegate al runner Óptima.
