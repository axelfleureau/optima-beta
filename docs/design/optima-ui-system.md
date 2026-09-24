# Óptima UI system

## Obiettivo

Óptima deve comportarsi come un cockpit operativo: orientare subito, rendere
visibili priorità e stato, e ridurre i passaggi fra moduli. Il linguaggio
visivo è quello Righello, con il rosa come accento di azione e il ciano come
segnale informativo. Le superfici restano neutre per preservare densità e
leggibilità.

## Riferimenti Mobbin

La ricerca è stata impostata sui pattern ricorrenti della libreria Mobbin per
dashboard SaaS, sidebar, ricerca globale, login, tabelle, tab, dialog e flussi
di creazione. Il runtime corrente non ha caricato i comandi MCP del plugin,
quindi la tassonomia e i pattern sono stati verificati sulle superfici pubbliche
di Mobbin (`https://mobbin.com/` e `https://mobbin.com/mcp`).

Pattern adottati:

- shell persistente con contesto della pagina sempre visibile;
- navigazione raggruppata per obiettivo, non come elenco piatto di funzioni;
- ricerca/comando globale nello spazio più prevedibile della topbar;
- azione principale distinta, azioni secondarie neutre;
- progressive disclosure: i dettagli vivono in dialog, tab o pannelli;
- stati operativi leggibili tramite badge semantici, non tramite colore casuale;
- controlli da almeno 44 px nei flussi principali e su mobile;
- superfici piatte e leggibili, evitando card annidate senza funzione.

## Fondamenta

- Font: Degular Display, già incluso localmente; nessuna dipendenza runtime da
  Google Fonts.
- Raggio: 14 px di base, 16 px per pannelli e card, pill solo per stati brevi.
- Background app: `#07090f`.
- Surface: `#11151f` con bordo bianco trasparente.
- Primary: Righello pink `#d6487e`.
- Informativo: Righello cyan `#06b6d4`.
- Success, warning e danger sono riservati a stati reali.

## Responsive

- Desktop: sidebar persistente, topbar contestuale, contenuto massimo 1280 px.
- Mobile: drawer laterale, titolo corrente in header, ricerca e account sempre
  raggiungibili.
- Tabelle: scroll orizzontale confinato al componente.
- Stringhe lunghe, email, URL e nomi file devono spezzarsi senza allargare il
  viewport.

## Componenti condivisi

Il restyle deve passare prima dai componenti in `components/ui`: Button, Card,
Input, Textarea, Select, Table, Badge, Tabs, Dialog, Dropdown e Popover. Le
pagine possono aggiungere una variante locale, ma non ridefinire il sistema da
zero.

## Regole per nuove pagine

1. Usare `optima-ops-page` e `optima-ops-container`.
2. Titolo, contesto e azione primaria devono essere riconoscibili nel primo
   viewport.
3. Non usare gradienti viola/blu generici per indicare funzioni Óptima.
4. Non inserire card dentro card se non esiste un livello informativo reale.
5. Verificare desktop e almeno 390 px, 360 px e 320 px.
