# Auth, Secrets e Ambienti

## Quando applicarla

Usala per Clerk, OAuth Google, webhook Stripe/SendGrid, token Cloudflare, API OpenAI/Magnific e integrazioni con ambienti staging/production.

## Regole operative

- Separare sempre chiavi staging/test e production/live.
- Le chiavi pubbliche `NEXT_PUBLIC_*` possono essere in config, ma vanno comunque gestite per ambiente.
- Le secret devono stare in provider env, Keychain o secret store, mai in Git.
- OAuth richiede redirect domain coerenti: custom domain, proxy Clerk e provider Google devono concordare.
- Quando un login resta su loader perpetuo, controllare prima env Clerk, proxy, middleware e route protette.
- Inviti team e utenti dipendenti devono associare email, ruolo, agency/workspace e stato invito in modo deterministico.
- Gli utenti non admin non devono vedere controlli amministrativi o reveal finanziari fuori contesto.

## Anti-pattern da evitare

- Mischiare Clerk development keys su dominio production.
- Creare utenti duplicati per stessa persona/email.
- Inviti email senza CTA o link utile.
- Login riuscito lato provider ma utente non associato a organizzazione interna.
- Salvare token in skill file o documentazione versionata.

## Verifiche prima di consegnare

- Login email/password e OAuth sul dominio reale.
- Redirect post-login a `/dashboard`.
- Ruoli e permessi coerenti per admin, direzione e junior.
- Ultimo accesso aggiornato quando l'utente entra.
- Email invito contiene link operativo.

