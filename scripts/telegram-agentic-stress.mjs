const cases = [
  ["Ok", "reply"],
  ["Grazie boss", "reply"],
  ["Per caso abbiamo il DVR aggiornato?", "query"],
  ["Mandamelo qui in chat", "query"],
  ["Quando scade il DURC?", "query"],
  ["Mandami il DURC", "query"],
  ["Mandami scadenza DURC", "query"],
  ["Non mandarmi tutto l'archivio, solo il documento corrente", "reply"],
  ["Mi hai mandato troppi documenti", "reply"],
  ["Prepara zip idoneità Radu", "archive"],
  ["Cosa abbiamo in scadenza nei prossimi 60 giorni?", "status"],
  ["Aggiungi deliverable alla task Portopiccolo: PDF finale", "task_update"],
  ["Ricordami se non faccio checkout e rapportino", "status"],
  ["Cosa ho fatto l'altro ieri?", "status"],
]

function infer(text, memory = {}) {
  const lower = String(text || "").toLowerCase()
  if (/^(ok|okay|grazie|perfetto|va bene|bene|thanks|👍)/i.test(text)) return "reply"
  if (/\b(cosa|che)\s+(ho|avevo)\s+fatt/.test(lower)) return "status"
  if (/tropp[ioe] document|non mandarmi tutto|solo il documento|solo durc|solo dvr|solo quello corrente/.test(lower)) return "reply"
  if (/check\s*in|checkin|entrata|check\s*out|checkout|uscita|rapportino|fine giornata|timbr/.test(lower)) return "status"
  if (/\btask\b|deliverable|consegna|comment|commento|\bstato\b|\bdone\b|validation|assegna|priorit/.test(lower)) return "task_update"
  if (/stato|riepilogo|cosa abbiamo|oggi|questa settimana|prossimi 60 giorni/.test(lower)) return "status"
  if (/durc|dvr|idoneit|scaden|document|pdf|mandamelo|mandami|zip|archivio/.test(lower)) {
    return /zip|pi[uù] document|idoneit|cartella/.test(lower) && !/solo/.test(lower) ? "archive" : "query"
  }
  return "reply"
}

let failed = 0
for (const [text, expected] of cases) {
  const actual = infer(text)
  const ok = actual === expected
  if (!ok) failed += 1
  console.log(`${ok ? "✓" : "✗"} ${JSON.stringify(text)} -> ${actual} (expected ${expected})`)
}

if (failed > 0) {
  console.error(`telegram:stress failed: ${failed}/${cases.length}`)
  process.exit(1)
}

console.log(`telegram:stress passed: ${cases.length}/${cases.length}`)
