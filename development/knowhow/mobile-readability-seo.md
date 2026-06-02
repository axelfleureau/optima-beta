# Mobile Readability e SEO

## Quando applicarla

Usala per landing, siti pubblici, pagine indicizzabili, pagine prodotto e viste app che devono essere leggibili su smartphone.

## Regole operative

- Progetta mobile-first: Google usa la versione mobile del contenuto per indicizzazione e ranking.
- Mantieni la stessa sostanza tra desktop e mobile: testo, immagini, video, link, metadata e structured data non devono sparire su mobile.
- Evita testi sotto dimensione leggibile: in pratica, body text mobile raramente sotto `16px`; microcopy solo se non critico e comunque leggibile.
- Le CTA devono avere target touch comodi: punta a circa `48px` di area cliccabile, anche se l'icona interna e piu piccola.
- Evita overflow orizzontale: se una pagina richiede zoom o pan casuale, e un problema UX e spesso anche SEO/mobile usability.
- Non nascondere contenuto primario dietro interazioni obbligatorie: Google non deve dover cliccare, scrivere o swipare per vedere il contenuto principale.
- Immagini e media devono avere `alt`, dimensioni corrette, formati supportati e URL stabili.
- Le meta description devono essere presenti e uniche per le pagine pubbliche importanti.

## Anti-pattern da evitare

- Font piccoli per "far stare tutto" in card o hero.
- Bottoni compatti con tap target reale inferiore a 44-48px.
- Headline che scala con viewport in modo imprevedibile.
- Layout desktop adattato a mobile solo con `overflow-x`.
- Hero con contenuto critico sotto overlay troppo scuro o troppo decorativo.

## Verifiche prima di consegnare

- Test manuale a 390px e 430px.
- Nessun overflow orizzontale su `document.documentElement.scrollWidth > window.innerWidth`.
- Lighthouse/PageSpeed con categorie SEO, Accessibility e Performance.
- Controllo tap target su CTA, nav, tab, menu e card cliccabili.
- Controllo che il contenuto mobile sia equivalente al desktop.

## Fonti / riferimenti

- Google Search Central: Mobile-first indexing best practices.
- Chrome for Developers: Lighthouse overview.
- web.dev: Accessible tap targets.
- Chrome for Developers: Lighthouse meta description audit.

