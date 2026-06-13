#!/usr/bin/env node
import { spawn } from "node:child_process"
import { createServer } from "node:http"
import net from "node:net"
import { mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"

const config = {
  host: process.env.BROWSER_MCP_HOST || "0.0.0.0",
  port: Number(process.env.BROWSER_MCP_PORT || 8789),
  chromeHost: "127.0.0.1",
  chromePort: Number(process.env.BROWSER_MCP_CHROME_PORT || 9233),
  profileDir: process.env.BROWSER_MCP_PROFILE_DIR || "/srv/optima-agent/browser-profiles/righello",
  chromeBin: process.env.BROWSER_MCP_CHROME_BIN || "",
}

const targets = new Map([
  ["chatgpt", "https://chatgpt.com"],
  ["nanobanana", "https://nanobanana.ai"],
  ["perplexity", "https://www.perplexity.ai"],
  ["claude", "https://claude.ai"],
])

let chromeProcess = null
let startingChrome = null

await mkdir(config.profileDir, { recursive: true })

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`)

    if (url.pathname === "/health") {
      const chromeReady = await isChromeReady()
      json(response, 200, {
        ok: true,
        chromeReady,
        profileDir: config.profileDir,
        port: config.port,
      })
      return
    }

    if (url.pathname === "/pair") {
      const session = url.searchParams.get("session") || ""
      const code = url.searchParams.get("code") || ""
      const target = url.searchParams.get("target") || "chatgpt"
      const callback = url.searchParams.get("callback") || ""
      const startUrl = targets.get(target) || targets.get("chatgpt")

      if (!/^bmcp_[a-f0-9]{32}$/.test(session) || !/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
        html(response, 400, page("Pairing non valido", "Sessione o codice pairing non validi. Torna in Optima e avvia una nuova sessione."))
        return
      }

      await ensureChrome()
      const pageTarget = await openChromeTarget(startUrl)
      if (callback) notifyCallback(callback, { session, status: "opened", target, openedAt: new Date().toISOString() }).catch(() => {})

      html(response, 200, page(
        `Login ${target}`,
        [
          `Codice pairing: ${code}`,
          "Si aprira DevTools collegato al Chromium persistente del VPS.",
          "Completa il login nel tab remoto. Non inserire credenziali in Optima.",
          `<a class="button" href="${escapeHtml(devtoolsUrl(request, pageTarget))}">Apri browser remoto</a>`,
          `<a class="secondary" href="/complete?session=${encodeURIComponent(session)}&code=${encodeURIComponent(code)}&target=${encodeURIComponent(target)}&callback=${encodeURIComponent(callback)}">Ho completato il login</a>`,
          `<a class="secondary" href="/health">Health</a>`,
        ].join("\n"),
      ))
      return
    }

    if (url.pathname === "/complete") {
      const session = url.searchParams.get("session") || ""
      const code = url.searchParams.get("code") || ""
      const target = url.searchParams.get("target") || "chatgpt"
      const callback = url.searchParams.get("callback") || ""

      if (!/^bmcp_[a-f0-9]{32}$/.test(session) || !/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code) || !callback) {
        html(response, 400, page("Pairing non valido", "Sessione, codice o callback non validi. Torna in Optima e avvia una nuova sessione."))
        return
      }

      await notifyCallback(callback, {
        session,
        status: "login_completed_by_user",
        target,
        completedAt: new Date().toISOString(),
      })

      html(response, 200, page(
        "Login registrato",
        [
          "Optima ha ricevuto la conferma del login nel profilo Browser MCP.",
          "Ora torna in Optima ed esegui il job health-check prima di usare il connector in produzione.",
          `<a class="button" href="/health">Verifica gateway</a>`,
        ].join("\n"),
      ))
      return
    }

    if (url.pathname.startsWith("/json") || url.pathname.startsWith("/devtools/")) {
      proxyHttp(request, response)
      return
    }

    html(response, 200, page("Optima Browser MCP Gateway", "Usa il pulsante Avvia login da Optima per creare una sessione pairing."))
  } catch (error) {
    html(response, 500, page("Errore gateway", error instanceof Error ? error.message : String(error)))
  }
})

server.on("upgrade", (request, socket, head) => {
  const upstream = net.connect(config.chromePort, config.chromeHost, () => {
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`)
    for (const [key, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) {
        for (const item of value) upstream.write(`${key}: ${item}\r\n`)
      } else if (value) {
        upstream.write(`${key}: ${value}\r\n`)
      }
    }
    upstream.write("\r\n")
    if (head.length) upstream.write(head)
    socket.pipe(upstream)
    upstream.pipe(socket)
  })
  upstream.on("error", () => socket.destroy())
})

server.listen(config.port, config.host, () => {
  console.log(`Optima Browser MCP Gateway listening on ${config.host}:${config.port}`)
  console.log(`Profile: ${config.profileDir}`)
})

async function ensureChrome() {
  if (await isChromeReady()) return
  if (startingChrome) return startingChrome

  startingChrome = (async () => {
    const chromeBin = config.chromeBin || findChrome()
    if (!chromeBin) {
      throw new Error("Chromium non trovato. Installa chromium/google-chrome o imposta BROWSER_MCP_CHROME_BIN.")
    }

    chromeProcess = spawn(chromeBin, [
      `--remote-debugging-address=${config.chromeHost}`,
      `--remote-debugging-port=${config.chromePort}`,
      `--user-data-dir=${config.profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--window-size=1440,1000",
      "about:blank",
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    })

    chromeProcess.stdout.on("data", (chunk) => process.stdout.write(`[chrome] ${chunk}`))
    chromeProcess.stderr.on("data", (chunk) => process.stderr.write(`[chrome] ${chunk}`))
    chromeProcess.on("exit", (code, signal) => {
      console.log(`Chrome exited code=${code} signal=${signal}`)
      chromeProcess = null
    })

    const deadline = Date.now() + 12_000
    while (Date.now() < deadline) {
      if (await isChromeReady()) return
      await sleep(300)
    }
    throw new Error("Chromium avviato ma remote debugging non risponde.")
  })()

  try {
    await startingChrome
  } finally {
    startingChrome = null
  }
}

async function isChromeReady() {
  try {
    const response = await fetch(`http://${config.chromeHost}:${config.chromePort}/json/version`)
    return response.ok
  } catch {
    return false
  }
}

async function openChromeTarget(url) {
  const response = await fetch(`http://${config.chromeHost}:${config.chromePort}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT",
  }).catch(() => null)

  if (response?.ok) return response.json()

  const list = await fetch(`http://${config.chromeHost}:${config.chromePort}/json/list`).then((item) => item.json())
  const first = Array.isArray(list) ? list[0] : null
  if (!first) throw new Error("Nessun target Chrome disponibile.")
  return first
}

function devtoolsUrl(request, target) {
  const host = request.headers.host || `localhost:${config.port}`
  const protocol = request.headers["x-forwarded-proto"] || "http"
  const wsHost = host
  const frontend = target.devtoolsFrontendUrl || `/devtools/inspector.html?ws=${config.chromeHost}:${config.chromePort}/devtools/page/${target.id}`
  return `${protocol}://${host}${frontend.replace(`${config.chromeHost}:${config.chromePort}`, wsHost)}`
}

function proxyHttp(clientRequest, clientResponse) {
  const upstream = new URL(clientRequest.url || "/", `http://${config.chromeHost}:${config.chromePort}`)
  const proxy = fetch(upstream, {
    method: clientRequest.method,
    headers: clientRequest.headers,
  })

  proxy
    .then(async (upstreamResponse) => {
      clientResponse.writeHead(upstreamResponse.status, Object.fromEntries(upstreamResponse.headers.entries()))
      if (upstreamResponse.body) {
        const reader = upstreamResponse.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          clientResponse.write(value)
        }
      }
      clientResponse.end()
    })
    .catch((error) => {
      html(clientResponse, 502, page("Proxy Chrome non disponibile", error instanceof Error ? error.message : String(error)))
    })
}

async function notifyCallback(callback, payload) {
  await fetch(callback, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

function findChrome() {
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ]
  return candidates.find((candidate) => existsSync(candidate)) || ""
}

function html(response, status, body) {
  response.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" })
  response.end(body)
}

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" })
  response.end(JSON.stringify(body, null, 2))
}

function page(title, body) {
  return `<!doctype html>
<html lang="it">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; min-height: 100vh; background: #070b15; color: #f8fafc; font: 16px/1.55 system-ui, -apple-system, Segoe UI, sans-serif; display: grid; place-items: center; padding: 24px; }
  main { width: min(720px, 100%); border: 1px solid rgba(255,255,255,.14); background: #111827; border-radius: 18px; padding: 28px; box-shadow: 0 30px 90px rgba(0,0,0,.35); }
  h1 { margin: 0 0 16px; font-size: clamp(26px, 5vw, 42px); line-height: 1.05; }
  pre, p { white-space: pre-wrap; overflow-wrap: anywhere; color: #cbd5e1; }
  .button, .secondary { display: inline-flex; margin-top: 18px; margin-right: 10px; border-radius: 12px; padding: 13px 18px; text-decoration: none; font-weight: 800; }
  .button { background: #db3f86; color: #fff; }
  .secondary { border: 1px solid rgba(255,255,255,.18); color: #e2e8f0; }
</style>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p>${body}</p>
</main>`
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
