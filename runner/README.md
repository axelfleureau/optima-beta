# Óptima Agent Runner

Runner leggero per rendere fruibile il control plane agentico di Óptima sul VPS Hostinger.

Il runner non espone porte pubbliche: fa polling HTTPS verso Óptima, prende un job, prepara un workspace isolato, esegue Codex CLI e rimanda risultato e artifact alla pagina `/agenti`.

## Requisiti VPS

- Node.js 20+
- Git
- Codex CLI autenticato con profilo ChatGPT isolato quando i job devono usare il piano ChatGPT
- Accesso outbound HTTPS verso `https://appbeta.wearerighello.com`
- Eventuale SSH key GitHub o token se deve clonare repository privati

## Autenticazione Codex sul VPS

Non convertire il profilo Codex principale del VPS se e gia configurato con API key. Crea invece una home separata per ChatGPT:

```bash
mkdir -p /root/.codex-chatgpt
chmod 700 /root/.codex-chatgpt
```

Poi prova OAuth/device auth dentro quella home:

```bash
CODEX_HOME=/root/.codex-chatgpt codex login --device-auth
CODEX_HOME=/root/.codex-chatgpt codex login status
CODEX_HOME=/root/.codex-chatgpt codex doctor
```

Il comando mostra un codice e un URL: apri l'URL dal browser, autorizza Codex e poi lascia che la CLI salvi la sessione nella home separata. Se il device-code login non e abilitato, attivalo in ChatGPT da `Sicurezza e accesso -> Abilita autorizzazione tramite codice dispositivo per Codex`.

Fallback consentito quando una macchina locale ha gia Codex autenticato via ChatGPT: copia `~/.codex/auth.json` dentro `/root/.codex-chatgpt/auth.json`, senza stamparne il contenuto, e imposta:

```bash
chmod 600 /root/.codex-chatgpt/auth.json
```

Crea un wrapper esplicito per evitare profili sbagliati:

```bash
cat >/usr/local/bin/codex-chatgpt <<'EOF'
#!/usr/bin/env bash
export CODEX_HOME=/root/.codex-chatgpt
exec /usr/bin/codex "$@"
EOF
chmod +x /usr/local/bin/codex-chatgpt
```

Verifica:

```bash
codex-chatgpt login status
codex-chatgpt doctor
codex-chatgpt exec -s read-only --skip-git-repo-check --ephemeral "Rispondi solo con: OK"
```

Esito atteso: `Logged in using ChatGPT`, `stored auth mode = chatgpt`, `stored API key = false`, `stored ChatGPT tokens = true`.

API key e access token sono solo fallback facoltativi e a consumo. Non usarli per workflow che devono rientrare nel piano ChatGPT.

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
DISK_GUARD_PATH=/home/hermes/obsidian-righello-vault/12_OneDrive
POLL_INTERVAL_MS=30000
MAX_JOB_SECONDS=1800
RUNNER_MODE=codex
CODEX_BIN=codex-chatgpt
CODEX_HOME=/root/.codex-chatgpt
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
- Ogni heartbeat invia metriche host best-effort: disco VPS, memoria, dimensione workspace runner e stato della guardia `DISK_GUARD_PATH`.
- Di default usa sandbox `workspace-write`.
- Non esegue deploy/commit/push se il brief del job non lo chiede chiaramente.
- I risultati vengono marcati `needs_review` e devono essere approvati in Óptima.
- Se il VPS ospita altri servizi, mantieni un solo runner systemd attivo.
- Se Hermes o altri tool lavorano su asset cloud, non sincronizzare mirror media locali sul VPS: usa link, metadati o download temporanei fuori dal vault.

## MCP e fasi agentiche

Fase 1: runner Codex semplice. Il VPS non espone porte e fa solo polling verso Óptima.

Fase 2: MCP Óptima esposto da Cloudflare, non dal VPS. In questo modo Codex puo interrogare Óptima tramite strumenti remoti sicuri, mentre Hostinger resta solo un worker.

Fase 3: browser/Chromium/Playwright sul VPS solo per automazioni visuali, scraping controllato o verifica screenshot. Attivarlo solo quando serve davvero.

Fase 4: copiare da Hermes Agent i pattern utili per memoria persistente, skills, MCP host, gateway e tool loop, reimplementandoli come funzioni native Optima. Hermes non deve diventare un servizio collegato al runner: job, permessi, audit e approvazioni restano nel control plane Optima.

## Dati necessari per installazione gestita

Per configurare io il VPS servono:

- host/IP pubblico;
- porta SSH;
- utente SSH;
- conferma del metodo di accesso, password o chiave;
- accesso GitHub ai repository privati, via deploy key o token dedicato;
- conferma che posso installare Node.js 20+, Git, Codex CLI e servizio systemd in `/srv/optima-agent`.

Non servono chiavi Revolut o altre API non collegate al runner Óptima.
