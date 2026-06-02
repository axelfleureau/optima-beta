# Motion e Animazioni Production-Ready

## Quando applicarla

Usala per landing, hero reveal, dashboard animate, scroll animation, transizioni kanban, loading state e microinterazioni.

## Regole operative

- Le animazioni devono supportare `prefers-reduced-motion`.
- Prima renderizza contenuto statico valido; poi aggiungi motion progressiva.
- Evita motion che blocca scroll, input o route transition.
- Per landing editoriali, usa motion per rivelare contenuto e prodotto, non per nascondere mancanze di copy o struttura.
- Usa trasformazioni GPU-friendly (`transform`, `opacity`) invece di animare layout costosi.
- Mantieni durate brevi su interfacce operative; le animazioni devono aumentare chiarezza, non spettacolo fine a se stesso.
- Per drag and drop, aggiorna la UI in modo ottimistico e riconcilia col backend dopo.

## Anti-pattern da evitare

- Scroll hijacking non necessario.
- Loader perpetui senza fallback o errore visibile.
- GSAP/Lenis applicati globalmente dentro dashboard operative senza escape hatch.
- Screenshot statici finti quando si puo costruire un visual con componenti reali.
- Animazioni che causano CLS o spostano CTA mentre l'utente interagisce.

## Verifiche prima di consegnare

- Test con `prefers-reduced-motion`.
- Test mobile su scroll e tap durante animazioni.
- Verifica LCP/CLS dopo hero animation.
- Nessun overlay che impedisce login o routing.
- Screenshot o browser check su desktop e mobile.

