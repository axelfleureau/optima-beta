# AI, Media Generation e Fallback

## Quando applicarla

Usala per assistenti AI, command bar, generazione immagini/video, Magnific, OpenAI, storico chat e automazioni operative.

## Regole operative

- Ogni generazione AI deve avere persistenza: prompt, modello/provider, stato, output, errori e costo/crediti se disponibile.
- L'assistente deve salvare cronologia conversazioni e contesto utile per workspace/progetti/task.
- La command bar deve restituire sempre un esito visibile: azione eseguita, richiesta chiarimento o errore recuperabile.
- Le integrazioni provider devono avere fallback chiaro quando quota, billing o API key falliscono.
- Non mischiare piani consumer browser con API server-side senza valutare ToS, sicurezza, sessioni e 2FA.
- Per media task, allegati e generazioni devono essere visibili nella task e scaricabili/previewabili.
- Le credenziali dei provider devono restare server-side.

## Anti-pattern da evitare

- Chat AI senza storico funzionante.
- Generazione immagini che fallisce senza spiegare provider/quota.
- Command bar che sembra inviare ma non produce nulla.
- Usare automazione browser con credenziali personali come backend production.
- Salvare file generati senza collegarli a task/progetto/cliente.

## Verifiche prima di consegnare

- Prompt command bar produce azione o feedback entro pochi secondi.
- Storico chat recuperabile dopo refresh.
- Generazioni media visibili in task/progetto.
- Errori quota/API espongono causa non sensibile.
- Provider key non compare in client bundle.

