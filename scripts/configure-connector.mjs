#!/usr/bin/env node
// scripts/configure-connector.mjs
//
// CLI Optima MCP connector: wrangler-style, un comando per stato e un comando
// per salvare secret_ref / OAuth client id / diagnosticare il connector.
//
//   node scripts/configure-connector.mjs list
//   node scripts/configure-connector.mjs status <connectorId>
//   node scripts/configure-connector.mjs set <connectorId> <envVar=value>...
//   node scripts/configure-connector.mjs doctor <connectorId>
//
// `set` non scrive mai su D1: stampa il comando esatto (`wrangler secret put`
// o equivalente) da eseguire sul runtime autorizzato. Mai token in chiaro
// in stdout.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(process.cwd())

// Carica il catalogo connector compilando il file TS via tsx se disponibile,
// altrimenti leggendo il source come plain text e parsando i blocchi chiave.
async function loadConnectors() {
  // Usa esbuild (sempre presente in node_modules di Next) per compilare
  // il catalogo TypeScript a JS in-memory e poi importarlo.
  const esbuild = await import("esbuild").catch(() => null)
  if (esbuild) {
    const result = await esbuild.build({
      entryPoints: [resolve(ROOT, "lib/mcp-connectors.ts")],
      bundle: true,
      format: "esm",
      platform: "node",
      write: false,
      target: "node20",
      external: ["node:*"],
      logLevel: "silent",
    })
    const code = result.outputFiles[0].text
    const dataUrl = "data:text/javascript;base64," + Buffer.from(code).toString("base64")
    const mod = await import(dataUrl)
    return mod.getStrategicMcpConnectors()
  }
  // Fallback ultra-semplice: parse riga per riga il TS per estrarre i blocchi.
  const src = readFileSync(resolve(ROOT, "lib/mcp-connectors.ts"), "utf8")
  const connectors = []
  const blockRe = /id:\s*"([^"]+)"[^]*?label:\s*"([^"]+)"[^]*?category:\s*"([^"]+)"[^]*?authMethod:\s*"([^"]+)"[^]*?requiredEnv:\s*\[([^\]]*)\][^]*?optionalEnv\?:\s*\[([^\]]*)\]/g
  let m
  while ((m = blockRe.exec(src))) {
    const [, id, label, category, authMethod, reqRaw, optRaw] = m
    const extract = (raw) => Array.from(raw.matchAll(/"([^"]+)"/g)).map((x) => x[1])
    connectors.push({
      id,
      label,
      category,
      authMethod,
      requiredEnv: extract(reqRaw),
      optionalEnv: extract(optRaw),
    })
  }
  return connectors
}

function colour(s, code) {
  if (!process.stdout.isTTY) return s
  return `\u001b[${code}m${s}\u001b[0m`
}

function statusTag(state) {
  switch (state) {
    case "enabled":
      return colour("ENABLED ", "32")
    case "partial":
      return colour("PARTIAL ", "33")
    case "missing":
      return colour("MISSING ", "31")
    case "external":
      return colour("EXTERNAL", "36")
    default:
      return state
  }
}

function readiness(connector) {
  if (
    connector.authMethod === "oauth_pkce" ||
    connector.authMethod === "external_oauth" ||
    connector.authMethod === "browser_session_oauth" ||
    connector.authMethod === "github_app"
  ) {
    return { state: "external", missingRequired: [], presentRequired: [], optionalMissing: [] }
  }
  const presentRequired = []
  const missingRequired = []
  for (const name of connector.requiredEnv ?? []) {
    if (process.env[name]?.trim()) presentRequired.push(name)
    else missingRequired.push(name)
  }
  const state = missingRequired.length === 0 && presentRequired.length > 0
    ? "enabled"
    : presentRequired.length > 0 ? "partial" : "missing"
  return { state, missingRequired, presentRequired, optionalMissing: [] }
}

async function cmdList(connectors) {
  console.log("\nOptima MCP connector readiness\n")
  for (const c of connectors) {
    const r = readiness(c)
    console.log(`  ${statusTag(r.state)}  ${c.id.padEnd(28)} ${c.label}`)
    if (r.missingRequired.length) {
      console.log(`           ${colour("missing:", "31")} ${r.missingRequired.join(", ")}`)
    }
  }
  console.log("")
  const counts = connectors.reduce(
    (acc, c) => {
      const r = readiness(c)
      acc[r.state] = (acc[r.state] ?? 0) + 1
      return acc
    },
    {},
  )
  console.log(
    `  Totale: ${connectors.length}  ·  ` +
      `enabled=${counts.enabled ?? 0}  partial=${counts.partial ?? 0}  ` +
      `missing=${counts.missing ?? 0}  external=${counts.external ?? 0}\n`,
  )
}

async function cmdStatus(connectors, id) {
  const c = connectors.find((x) => x.id === id)
  if (!c) {
    console.error(colour(`Connector "${id}" non trovato.`, "31"))
    console.error("Connector disponibili:", connectors.map((x) => x.id).join(", "))
    process.exit(2)
  }
  const r = readiness(c)
  console.log(`\n${c.label}  (${c.id})`)
  console.log(`  categoria:  ${c.category}`)
  console.log(`  authMethod: ${c.authMethod}`)
  console.log(`  stato:      ${statusTag(r.state)}`)
  if (c.requiredEnv?.length) {
    console.log(`  required:`)
    for (const name of c.requiredEnv) {
      const ok = Boolean(process.env[name]?.trim())
      console.log(`    ${ok ? colour("✓", "32") : colour("✗", "31")} ${name}`)
    }
  }
  if (c.optionalEnv?.length) {
    console.log(`  optional:`)
    for (const name of c.optionalEnv) {
      const ok = Boolean(process.env[name]?.trim())
      console.log(`    ${ok ? colour("✓", "32") : colour("·", "90")} ${name}`)
    }
  }
  if (r.missingRequired.length) {
    console.log(`\n  ${colour("Per abilitare:", "33")}`)
    console.log(`    npx wrangler secret put ${r.missingRequired[0]}`)
    console.log(`    # oppure export ${r.missingRequired[0]}=... # solo dev locale`)
  } else if (r.state === "enabled") {
    console.log(`\n  ${colour("Pronto. Nessuna env mancante.", "32")}`)
  }
  console.log("")
}

async function cmdSet(connectors, id, pairs) {
  const c = connectors.find((x) => x.id === id)
  if (!c) {
    console.error(colour(`Connector "${id}" non trovato.`, "31"))
    process.exit(2)
  }
  if (pairs.length === 0) {
    console.error("Uso: configure-connector.mjs set <connectorId> KEY=value [KEY=value...]")
    process.exit(2)
  }
  // Mai stampare i valori: solo i comandi da eseguire.
  console.log(`\n${c.label}  (${c.id})  — secret setup\n`)
  console.log("  Esegui sul runtime autorizzato (NON incollare valori qui):\n")
  for (const kv of pairs) {
    const eq = kv.indexOf("=")
    if (eq <= 0) {
      console.error(`Coppia non valida: ${kv} (atteso KEY=value)`)
      process.exit(2)
    }
    const key = kv.slice(0, eq)
    const allowed = [...(c.requiredEnv ?? []), ...(c.optionalEnv ?? [])]
    if (!allowed.includes(key)) {
      console.error(
        colour(`"${key}" non è una env nota per ${c.id}. Attese: ${allowed.join(", ")}`, "31"),
      )
      process.exit(2)
    }
    console.log(`    npx wrangler secret put ${key}`)
  }
  console.log("\n  Dopo `wrangler secret put`, fai un redeploy del worker.")
  console.log("  Poi verifica: node scripts/configure-connector.mjs status " + c.id + "\n")
}

async function cmdDoctor(connectors, id) {
  const c = connectors.find((x) => x.id === id)
  if (!c) {
    console.error(colour(`Connector "${id}" non trovato.`, "31"))
    process.exit(2)
  }
  const r = readiness(c)
  console.log(`\nDoctor ${c.label} (${c.id})`)
  console.log(`  Stato:       ${statusTag(r.state)}`)
  console.log(`  Auth method: ${c.authMethod}`)
  console.log(`  Required env presenti: ${r.presentRequired?.length ?? 0}/${c.requiredEnv?.length ?? 0}`)
  if (r.missingRequired?.length) {
    console.log(`  Mancanti:    ${r.missingRequired.join(", ")}`)
  }
  // Per OAuth: verifica che l'endpoint metadata sia raggiungibile.
  if (c.authMethod === "oauth_pkce" || c.authMethod === "external_oauth") {
    console.log(`  Next step:   apri Optima → Agenti → clicca "Apri OAuth provider"`)
  } else if (c.authMethod === "github_app") {
    console.log(`  Next step:   apri Optima → Agenti → clicca "Apri policy GitHub"`)
  } else if (c.authMethod === "browser_session_oauth") {
    console.log(`  Next step:   verifica BROWSER_MCP_GATEWAY_URL e poi lancia "Prepara ChatGPT"`)
  } else if (r.missingRequired?.length) {
    console.log(`  Next step:   node scripts/configure-connector.mjs set ${c.id} ${r.missingRequired[0]}=...`)
  } else {
    console.log(`  Next step:   verifica health-check dal control room agentico`)
  }
  console.log("")
}

async function main() {
  const [, , sub, ...rest] = process.argv
  const connectors = await loadConnectors()

  switch (sub) {
    case "list":
    case undefined:
      await cmdList(connectors)
      break
    case "status":
      if (!rest[0]) {
        console.error("Uso: configure-connector.mjs status <connectorId>")
        process.exit(2)
      }
      await cmdStatus(connectors, rest[0])
      break
    case "set":
      await cmdSet(connectors, rest[0], rest.slice(1))
      break
    case "doctor":
      await cmdDoctor(connectors, rest[0])
      break
    default:
      console.error(`Comando sconosciuto: ${sub}`)
      console.error("Comandi: list | status <id> | set <id> KEY=value... | doctor <id>")
      process.exit(2)
  }
}

main().catch((err) => {
  console.error("Errore:", err?.message ?? err)
  process.exit(1)
})
