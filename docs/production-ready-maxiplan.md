# Optima production-ready maxiplan

Questo piano serve a portare Optima da beta operativa a sistema operativo aziendale agentico usabile ogni giorno da Righello. Non misura solo se la build passa: misura se persone, clienti, task, rapportini, chat, grafo, runner, MCP e review producono un flusso affidabile.

## Stato target

Optima e production-ready quando:

- la produzione Cloudflare risponde su dominio ufficiale con auth live, D1, R2 e health ok;
- il ciclo cliente -> progetto -> task -> assegnazione -> presenza -> rapportino -> review -> riepilogo email e tracciato end-to-end;
- la chat e la command bar usano la stessa memoria conversazionale e lo stesso grafo operativo;
- il runner VPS resta osservabile e controllato: heartbeat, coda, claim guardato, artifact, review e nessun deploy automatico senza approvazione;
- provider AI, MCP connector e subagenti sono tenant-scoped, con OAuth/secret_ref e health, non pulsanti decorativi;
- il grafo Graphify/Hermes/know-how alimenta decisioni e job agentici senza importare segreti o dump integrali;
- mobile Safari e desktop sono verificati sui flussi principali.

## Gate 0 - Release hygiene

Obiettivo: non perdere lavoro e non deployare stato ignoto.

Checklist:

- Branch operativo sempre pulito prima del deploy.
- Commit piccoli e frequenti, push su GitHub dopo ogni slice verificata.
- `npm run check:production` obbligatorio prima di dichiarare una release.
- `npx tsc --noEmit` e `npm run cf:build` obbligatori per patch frontend/API.
- Production deploy solo dopo build locale riuscita.
- VPS aggiornato solo in `/srv/optima-agent`, senza toccare installazioni Hermes/Edis.

Gate:

- GitHub contiene l'ultima commit.
- Cloudflare deploy completato.
- `/api/health` mostra `readiness.coreReady=true`.
- VPS checkout allineato alla commit e `optima-agent-runner` attivo.

## Gate 1 - Core app affidabile

Obiettivo: il gestionale deve essere solido anche senza AI.

Flussi minimi:

- Login/logout live Clerk.
- Dashboard caricabile con empty state chiari.
- Clienti: lista, dettaglio, knowledge, progetto collegato.
- Progetti: ownership, repository link, stato e timeline.
- Task: create, edit, stato, priorita, assegnazione, allegati, commenti/contesto.
- Team: ruoli, direzione, dipendenti, assegnazione clienti e limiti di visibilita.
- Presenze: heatmap leggibile, dettaglio giorno, task collegate, festivi/feriali per dipendenti non soci.
- Rapportini: invio, review responsabile, approva/richiedi modifica, riepilogo email amministrazione.

Gate:

- Nessuna pagina principale con horizontal overflow mobile.
- Nessun controllo critico senza effetto visibile.
- Ogni stato vuoto spiega l'azione successiva.
- Ogni mutazione produce feedback e audit log o evento equivalente.

## Gate 2 - Agentic control plane reale

Obiettivo: gli agenti non devono essere una pagina catalogo, ma una sala operativa.

Funzioni richieste:

- Coda job con stati: queued, running, needs_review, approved, rejected, failed, cancelled.
- Runner heartbeat visibile e stale detection.
- Job detail con artifact, eventi, output, revisione e richiesta modifiche.
- Repository inferito dal grafo quando possibile; override solo se serve.
- Creazione job da chat, command bar, nodo grafo, task, progetto e cliente.
- Claim sospeso se `AGENT_RUNNER_ENABLED` non e `true`.
- Nessun deploy automatico senza job esplicito e approvazione direzione.

Gate:

- `readiness.agenticReady=true` in `/api/health`.
- Un job di test puo passare da queued a needs_review con artifact leggibile.
- Una richiesta di revisione crea nuovo evento e non perde il contesto.
- Runner offline/stale viene segnalato con azione correttiva chiara.

## Gate 3 - MCP, OAuth e subagenti

Obiettivo: provider e connector devono diventare capability installabili e verificabili.

Provider prioritari:

- Codex/OpenCode per lane code.
- OpenAI per chat e reasoning.
- Qwen/Gemma per long-context o hosted/local assistant.
- MiniMax per media, in handoff con Codex.

MCP prioritari:

- GitHub, Cloudflare, Vercel, Hostinger, Cloudinary, SendGrid, Telegram, Codex Runner.

Regole:

- Ogni installazione ha `organization_id`.
- D1 salva stato, scope, health, subject e `secret_ref`, non token.
- OAuth Authorization Code + PKCE dove possibile.
- API key solo in secret manager o runner env, mai nel grafo o nei job.
- Ogni connector mostra health e cosa manca.
- Ogni subagente dichiara lane, provider, connector concessi, permessi e handoff policy.

Gate:

- Catalogo MCP mostra stato reale: non configurato, setup richiesto, configurato, healthy, bloccato.
- Ogni pulsante di setup crea un job o apre una guida concreta.
- Chat/command bar possono creare richieste verso subagenti senza duplicare contesto.

## Gate 4 - Graph memory aziendale

Obiettivo: il grafo deve essere memoria operativa, non decorazione.

Funzioni richieste:

- Nodi tenant-scoped per persone, clienti, progetti, task, repository, skill, sorgenti, motori, memorie e subagenti.
- Archi con `confidence`: manual, extracted, inferred, ambiguous.
- Graphify modellato come motore/pipeline, non come cliente/progetto.
- Hermes usato come reference code dalla repo ufficiale e come sorgente dati solo read-only/redatta.
- Inserimento manuale da form e da chat.
- Mappa dinamica con ricerca, filtri, zoom/pan, densita e dettaglio nodo.
- Da nodo: crea job, collega repository, collega cliente/progetto/task, marca relazione da verificare.

Gate:

- Ogni nodo mostra fonte, confidence, summary, tag e collegamenti.
- Le relazioni ambigue non guidano azioni automatiche senza review.
- Il grafo non contiene segreti, transcript integrali o dump grezzi.

## Gate 5 - AI assistant e inbox agentica

Obiettivo: la chat deve comportarsi come assistente operativo asincrono.

Funzioni richieste:

- Pulsante invio sempre visibile su mobile.
- Risposte vuote sostituite da fallback esplicito e tracciabile.
- Sessioni persistenti con storico recuperabile.
- Memoria conversazionale riassunta, non caricata integralmente.
- Possibilita di salvare memoria nel grafo con formato guidato.
- Telegram usa la stessa memoria, stessi permessi e stesso contesto della chat.
- Quando la richiesta richiede lavoro asincrono, la chat crea job revisionabile invece di fingere completamento immediato.

Gate:

- Invio da mobile Safari verificato.
- Rileggi recupera risposte arrivate in differita.
- Una richiesta chat puo diventare job con contesto e audit.

## Gate 6 - Osservabilita, sicurezza e recovery

Obiettivo: sapere cosa succede e recuperare senza panico.

Checklist:

- Health core e agentic separati.
- Runner heartbeat e ultimi errori visibili.
- Script VPS per disk/memory audit senza scritture fuori `/srv/optima-agent`.
- Rate limit su AI, auth, public quote e Stripe.
- Security headers attivi.
- Log senza secret.
- Backup/export D1 e procedure rollback documentate.
- Disaster recovery chat/knowhow: dossier piccoli, non transcript enormi nel contesto.

Gate:

- Un operatore puo capire in meno di 2 minuti se il problema e Cloudflare, D1, auth, runner, provider AI o VPS.
- Un deploy fallito ha rollback plan documentato.

## Gate 7 - UX production

Obiettivo: Optima deve sembrare uno strumento usabile ogni giorno, non una demo tecnica.

Checklist:

- Mobile-first per pagine operative: agenti, ai-assistant, presenze, rapportini, task, team.
- Copy operativo: niente parole generiche se il pulsante non fa davvero qualcosa.
- Stati disabilitati spiegati.
- Controlli critici con affordance standard: invio, approva, revisiona, assegna, collega, sincronizza.
- Heatmap con legenda comprensibile e detail panel contestuale.
- No doppioni di UI: per esempio stato card in un solo controllo coerente.

Gate:

- Ogni schermata principale ha un'azione primaria evidente.
- Ogni azione primaria e verificata con un effetto backend o job.
- Ogni tab della pagina agenti risponde bene su 390px di larghezza.

## Sequenza consigliata

1. Hardening readiness e AI assistant mobile.
2. Review room job agentici completa: artifact, eventi, richiesta modifica, rerun.
3. Rapportini review + email amministrazione + festivi/feriali.
4. Team/client visibility e assegnazioni cliente-dipendente.
5. Chat/command bar -> job agentico con context resolver unico.
6. MCP install wizard con health e secret_ref.
7. Graph node actions: collega entita, crea job, verifica relazione.
8. VPS observability: disk/memory, runner logs, stale recovery, cleanup workspaces.
9. Browser/mobile verification suite.
10. Go/no-go finale con `npm run check:production`, smoke test autenticato e runbook.

## Primo pacchetto applicato in questa release

- `/api/health` espone readiness core e agentic senza mostrare segreti, includendo anche lo stato della configurazione OAuth MCP.
- `npm run check:production` verifica anche runner, R2, schema D1 agentico, OAuth MCP e metadata MCP.
- AI assistant mobile mostra un pulsante `Invia` evidente e non lascia risposte vuote mute.
- La regola di prodotto e salvata nel know-how globale quando diventa riutilizzabile.
