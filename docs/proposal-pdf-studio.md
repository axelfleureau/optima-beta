# Proposal PDF Studio

Optima mantiene il generatore browser per bozze veloci, ma i PDF finali devono passare dal percorso runner `scripts/quote-pdf-studio`.

Il motivo e' pratico: preventivi seri richiedono controllo di paginazione, header/footer, font incorporati, QA visuale e possibilita' di correggere il layout caso per caso tramite Codex CLI prima dell'invio.

Flusso consigliato:

1. Genera o importa il preventivo in Optima.
2. Esporta/serializza il `GeneratedQuoteData` del preventivo.
3. Esegui `npm run quote:pdf:studio -- <input.json> --render`.
4. Controlla le PNG renderizzate.
5. Applica revisioni su copy/layout/prezzi se necessarie.
6. Allega il PDF finale alla card preventivo e invia il link pubblico solo dopo approvazione.

Questo non sostituisce il workflow commerciale: aggiunge un livello di produzione documentale affidabile, brandizzato Righello e adatto a documenti firmabili.
