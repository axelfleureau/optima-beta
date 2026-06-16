# Quote PDF Studio

Generatore runner-side per preventivi Righello print-ready. Usa ReportLab, font DM Sans e asset brand Righello per produrre PDF piu stabili del fallback browser `jsPDF`.

## Uso

```bash
python3 -m pip install -r scripts/quote-pdf-studio/requirements.txt
python3 scripts/quote-pdf-studio/generate_quote_pdf.py scripts/quote-pdf-studio/samples/tomasella.json --render
```

Oppure tramite npm:

```bash
npm run quote:pdf:studio -- scripts/quote-pdf-studio/samples/tomasella.json --render
```

L'input e' il JSON `GeneratedQuoteData` gia usato da Optima. Il render PNG opzionale crea una cartella `*_pages` per QA visiva rapida prima di inviare il documento al cliente.

Per controllo layout automatico:

```bash
python3 scripts/quote-pdf-studio/generate_quote_pdf.py scripts/quote-pdf-studio/samples/tomasella.json --render --qa-json scripts/quote-pdf-studio/output/tomasella-qa.json --strict-qa
```

## Regole operative

- Il documento commerciale deve avere almeno 3 voci base con importi validi.
- Le pagine interne non devono essere quasi vuote: il generatore raggruppa le voci e `--strict-qa` fallisce se la densita contenuto scende sotto soglia.
- API/browser resta utile per anteprima rapida; questo studio e' il percorso corretto per PDF finali revisionabili.
- Il runner puo' rigenerare il PDF dopo revisioni puntuali di copy, prezzi, sezioni e layout.
- I segreti e dati sensibili non vanno inseriti nei JSON di test.
