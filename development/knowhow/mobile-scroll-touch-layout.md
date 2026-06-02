# Scroll, Touch e Layout Mobile

## Quando applicarla

Usala per dashboard, kanban, calendari, modali, drawer, viste con colonne, tabelle, form lunghi e pagine operative mobile.

## Regole operative

- Definisci un solo contenitore principale di scroll verticale per schermata.
- Evita `height: 100vh` rigido su mobile; preferisci `min-height: 100dvh` e contenitori con `min-h-0`.
- Nei layout flex/grid annidati, imposta `min-h-0` sui parent e `overflow-y-auto` solo sul livello che deve scrollare.
- Per kanban e calendari, separa scroll orizzontale e verticale: board esterna `overflow-x-auto`, colonne interne `overflow-y-auto`.
- Aggiungi `overscroll-behavior: contain` solo dove serve davvero; non bloccare il body se la pagina deve scrollare.
- Le modali lunghe devono avere header/footer sticky e body scrollabile.
- Su iOS, testa sempre nel browser mobile: il bounce puo nascondere problemi di nested scroll.

## Anti-pattern da evitare

- `overflow-hidden` sul body o su wrapper globali senza motivo.
- Drawer mobile con lista clienti o colonne kanban non scrollabili.
- Pannelli con `max-height` non calcolato rispetto a header/footer reali.
- Form con footer fixed che copre input, date picker o textarea.
- Usare solo desktop DevTools senza test su Safari/iOS.

## Verifiche prima di consegnare

- Mobile: scroll verticale fluido dall'inizio alla fine pagina.
- Kanban: scroll orizzontale tra colonne e verticale dentro colonna.
- Modale lunga: input finali e CTA raggiungibili.
- Nessun "bounce lock" dove lo scroll torna indietro.
- Date/time picker non escono dal viewport.

