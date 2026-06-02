# Cloudflare Deploy e Produzione

## Quando applicarla

Usala per deploy Next/OpenNext su Cloudflare Workers, custom domain, D1, R2, env vars, staging/production e troubleshooting.

## Regole operative

- Build e deploy devono usare lo stesso set di env pubbliche richieste da Next durante prerender.
- Le secret non vanno mai stampate, salvate in repo o copiate in file skill.
- Per production, verificare `NEXT_PUBLIC_SITE_URL`, Clerk production keys, proxy URL e custom domain.
- Dopo deploy, verificare almeno `/BUILD_ID`, pagina pubblica e una route protetta.
- D1/R2 bindings devono essere espliciti per ambiente.
- I warning del bundle vanno distinti dagli errori bloccanti: deploy riuscito solo se Wrangler restituisce successo e version id.
- Se Wrangler fallisce con auth, recuperare credenziali da Keychain o ambiente temporaneo, non persistente.

## Anti-pattern da evitare

- Assumere che staging e production abbiano le stesse env.
- Deployare production con chiavi Clerk development.
- Fare commit di token Cloudflare, Clerk, Stripe, OpenAI, SendGrid o Magnific.
- Non verificare custom domain dopo deploy.
- Correggere problemi DNS nel codice applicativo.

## Verifiche prima di consegnare

- `npm run build` con env necessarie.
- `npm run cf:deploy:production` o staging esplicito.
- `curl -fsS https://<domain>/BUILD_ID`.
- Test login o route protetta.
- `git status --short` pulito.

