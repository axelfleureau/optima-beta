# Óptima UI system

## Obiettivo

Óptima deve comportarsi come un cockpit operativo: orientare subito, rendere
visibili priorità e stato, e ridurre i passaggi fra moduli. Il linguaggio
visivo è quello Righello, con il rosa come accento di azione e il ciano come
segnale informativo. Le superfici restano neutre per preservare densità e
leggibilità.

## Riferimenti Mobbin

La ricerca è stata eseguita tramite il plugin Mobbin, in modalità `deep`, su
interfacce web reali. Ogni ricerca ha usato un singolo intento e lo stesso
contesto di prodotto: riprogettare un gestionale completo per agenzie partendo
da evidenze presenti in prodotti già in uso.

Reference ispezionate a schermo:

- dashboard e workspace: [Wrike](https://mobbin.com/screens/a34c0ecc-afaa-48fc-8230-8a1e436188cb),
  [Asana](https://mobbin.com/screens/4977138b-43d5-41fa-a844-7a583b31aaab),
  [Airtable](https://mobbin.com/screens/5074a5c3-b4e3-4f0d-839c-e3c89793b199),
  [Bonsai](https://mobbin.com/screens/091ddda6-75e6-4768-9565-66cdea60af89) e
  [Toggl Track](https://mobbin.com/screens/12ae3b7a-e13c-4669-94af-3164815a7870);
- impostazioni: [Cursor](https://mobbin.com/screens/0c054f87-496a-45b9-968e-d6bb05d0dcec),
  [Buffer](https://mobbin.com/screens/796d3feb-5dd5-480b-a26f-27b0a398b685) e
  [Linear](https://mobbin.com/screens/fc41ba13-34f5-429c-8f96-d37e18311c2d);
- calendario editoriale: [Hootsuite](https://mobbin.com/screens/5577b8c9-977d-43a6-bf05-ed5ce7cab2d0)
  e [Later](https://mobbin.com/screens/85de220d-a33e-4850-b9b9-00b73f91fa52);
- anagrafica clienti: [Shopify](https://mobbin.com/screens/17933309-3155-4503-a5be-36ddb6479329)
  e [HubSpot](https://mobbin.com/screens/5179d751-e71a-4ebe-820e-a98ebc076e29);
- landing: [Mixpanel](https://mobbin.com/sites/sections/76746e2a-bc5e-4f66-a541-e684aa10a3e0)
  e [Lightdash](https://mobbin.com/sites/sections/fb121d37-b062-44a3-9966-b97475b4b124);
- onboarding: il flusso [Notion, Creating a workspace](https://mobbin.com/flows/757b6888-6eaa-498d-9b18-c013c9a2ef4a).

Pattern adottati:

- shell persistente con contesto della pagina sempre visibile;
- navigazione raggruppata per obiettivo, non come elenco piatto di funzioni;
- ricerca/comando globale nello spazio più prevedibile della topbar;
- azione principale distinta, azioni secondarie neutre;
- progressive disclosure: i dettagli vivono in dialog, tab o pannelli;
- stati operativi leggibili tramite badge semantici, non tramite colore casuale;
- controlli da almeno 44 px nei flussi principali e su mobile;
- superfici piatte e leggibili, evitando card annidate senza funzione.
- liste gestionali in tabella su desktop e in card solo quando lo spazio mobile
  lo richiede;
- impostazioni con navigazione interna verticale su desktop e selettore singolo
  su mobile;
- calendario con azione di creazione, filtri, cambio vista e griglia in una
  gerarchia compatta, senza comandi disabilitati usati come segnaposto.

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
