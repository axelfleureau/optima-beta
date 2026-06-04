# Óptima Agent Runner

Runner leggero per rendere fruibile il control plane agentico di Óptima sul VPS Hostinger.

Il runner non espone porte pubbliche: fa polling HTTPS verso Óptima, prende un job, prepara un workspace isolato, esegue Codex CLI e rimanda risultato e artifact alla pagina `/agenti`.

## Requisiti VPS

- Node.js 20+
- Git
- Codex CLI autenticato
- Accesso outbound HTTPS verso `https://appbeta.wearerighello.com`
- Eventuale SSH key GitHub o token se deve clonare repository privati

## Installazione

```bash
sudo mkdir -p /srv/optima-agent
sudo chown -R "$USER":"$USER" /srv/optima-agent

git clone https://github.com/axelfleureau/optima-beta.git /srv/optima-agent/optima-beta
cd /srv/optima-agent/optima-beta
```

Crea `/srv/optima-agent/optima-runner.env`:

```bash
OPTIMA_URL=https://appbeta.wearerighello.com
AGENT_RUNNER_API_KEY=incolla_la_chiave_configurata_su_cloudflare
RUNNER_ID=hostinger-codex-01
WORK_ROOT=/srv/optima-agent/jobs
POLL_INTERVAL_MS=30000
MAX_JOB_SECONDS=1800
RUNNER_MODE=codex
CODEX_BIN=codex
CODEX_SANDBOX=workspace-write
```

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
